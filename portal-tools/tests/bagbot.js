/* POPULATED BAG / LOOT UI BOT — the surface both earlier bot runs left at
   bag:0, and the surface the 30-minute human playtest found two bugs in
   (oversized loot icon in landscape, missing ring-slot comparison). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text().slice(0,160));});

  await p.goto('file:///home/user/RunePortal/zonelooter3d.html?test',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:20000});
  await p.click('[data-cls="melee"]'); await p.click('#startBtn');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:20000});
  await p.evaluate(()=>{ if(typeof devSetLevel==='function') devSetLevel(30); S.gold=10_000_000; });

  /* fill the bag with every rarity so each card variant renders */
  const fill=await p.evaluate(()=>{
    S.bag.length=0;
    let made=0, byRar={};
    /* rollItem picks armor unless kind says otherwise - the first pass got
       five armor slots and no rings, which is why the ring screen went untested */
    const specs=[{kind:'weapon'},{kind:'offhand'},
                 {kind:'trinket',slot:'ring'},{kind:'trinket',slot:'amulet'},
                 {slot:'chest'},{slot:'head'}];
    for(let rar=0; rar<=5; rar++)
      for(const sp of specs){
        const it=rollItem({ilvl:40, rar, ...sp});
        if(it && bagAdd(it)){ made++; byRar[rar]=(byRar[rar]||0)+1; }
      }
    return {made, byRar, bag:S.bag.length,
            slots:[...new Set(S.bag.map(i=>i.slot))],
            kinds:[...new Set(S.bag.map(i=>i.kind))],
            rings:S.bag.filter(i=>i.slot==='ring').length};
  });

  /* bag panel: does every item actually get a card? */
  await p.evaluate(()=>document.querySelector('[data-tab="pBag"]').click());
  await p.waitForTimeout(600);
  const bagUI=await p.evaluate(()=>{
    const grid=document.getElementById('bagGrid');
    const cells=[...grid.querySelectorAll('.gcell[data-uid]')];
    const uids=new Set(cells.map(c=>c.dataset.uid));
    return {bag:S.bag.length, cells:cells.length,
            padCells:grid.querySelectorAll('.gcell.slotEmpty').length,
            everyItemHasACell:S.bag.every(i=>uids.has(String(i.uid))),
            bagCount:document.getElementById('bagCount').textContent,
            bagSub:document.getElementById('bagSub').textContent,
            emptyStateShown:/Nothing here yet/.test(grid.innerText||'')};
  });

  /* click every bag entry, then every action it exposes */
  let itemClicks=0, actClicks=0;
  for(let i=0;i<30;i++){
    const ok=await p.evaluate(idx=>{
      const grid=document.getElementById('bagGrid');
      const list=[...grid.querySelectorAll('.gcell[data-uid]')];
      if(idx>=list.length) return false;
      list[idx].click();            /* delegated -> openItemModal(uid) */
      return true;
    }, i);
    if(!ok) break;
    itemClicks++; await p.waitForTimeout(140);
    const acts=await p.evaluate(()=>{
      const list=[...document.querySelectorAll('[data-act]')].filter(e=>e.offsetParent!==null);
      const seen=list.map(e=>e.dataset.act);
      /* click non-destructive actions only: skip salvage so the bag survives */
      for(const e of list) if(!/salv|sell|destroy/i.test(e.dataset.act||'')) e.click();
      return seen;
    });
    actClicks+=acts.length; await p.waitForTimeout(120);
  }

  /* ring-slot comparison: the screen added for playtest issue #4 */
  const ring=await p.evaluate(async()=>{
    const r=S.bag.find(i=>i.slot==='ring');
    if(!r) return {tested:false, why:'no ring in bag'};
    const card=[...document.querySelectorAll('#bagGrid .gcell[data-uid]')]
      .find(e=>e.dataset.uid===String(r.uid));
    if(card) card.click();
    await new Promise(x=>setTimeout(x,300));
    const slots=[...document.querySelectorAll('[data-ringslot]')].filter(e=>e.offsetParent!==null);
    const out={tested:true, ringslotBtns:slots.length, deltas:[]};
    /* the delta function behind the screen, asserted directly */
    for(const sl of ['ring1','ring2']){
      try{ const d=slotSwapDelta(r, sl);
        out.deltas.push({slot:sl, dps:+d.dps.toFixed(1), ehp:+d.ehp.toFixed(1),
                         hasOutgoing:!!d.outgoing}); }
      catch(e){ out.deltas.push({slot:sl, err:String(e).slice(0,80)}); }
    }
    if(slots.length){ slots[0].click(); await new Promise(x=>setTimeout(x,300)); }
    return out;
  });

  /* loot overlay — portrait then landscape. Issue #1 was the icon resolving
     its 80% width against the CARD instead of a sized box in landscape. */
  const lootShots={};
  for(const [w,h,tag] of [[390,844,'portrait'],[844,390,'landscape']]){
    await p.setViewportSize({width:w,height:h});
    await p.waitForTimeout(500);
    lootShots[tag]=await p.evaluate(()=>{
      const items=S.bag.slice(0,4);
      showLoot(items, 1234, 'Chest Opened');
      const cards=[...document.querySelectorAll('#lootCards .lootCard')];
      const ics=[...document.querySelectorAll('#lootCards .lIc')];
      const inner=ics.map(e=>{
        const img=e.querySelector('.ico,img');
        const r=img?img.getBoundingClientRect():null;
        const b=e.getBoundingClientRect();
        return {box:[Math.round(b.width),Math.round(b.height)],
                icon:r?[Math.round(r.width),Math.round(r.height)]:null};
      });
      const overlay=document.getElementById('lootCards');
      const orect=overlay?overlay.getBoundingClientRect():null;
      return {cards:cards.length, icons:ics.length, inner,
              overflowsViewport: orect? (orect.right>innerWidth+1||orect.bottom>innerHeight+1):null};
    });
    await p.screenshot({path:`/tmp/claude-0/-home-user-RunePortal/256dfdb7-80ba-5509-944c-0cc7b791d092/scratchpad/bots/loot_${tag}.png`});
    await p.evaluate(()=>{
      const o=document.getElementById('lootWrap');
      if(o){ o.classList.remove('open'); o.style.removeProperty('display'); }
      if(typeof closeModal==='function') closeModal();
    });
    await p.waitForTimeout(250);
  }

  console.log('=== POPULATED BAG / LOOT UI BOT ===');
  console.log('fill      :', JSON.stringify(fill));
  console.log('bag panel :', JSON.stringify(bagUI));
  console.log('  (icon-only grid: item NAMES live in the modal, not the cells)');
  console.log(`clicks    : ${itemClicks} item cards, ${actClicks} actions`);
  console.log('ring cmp  :', JSON.stringify(ring));
  for(const t of ['portrait','landscape']){
    const s=lootShots[t];
    console.log(`loot ${t.padEnd(10)}: cards=${s.cards} icons=${s.icons} overflow=${s.overflowsViewport}`);
    s.inner.forEach((x,i)=>console.log(`   card${i}: box ${x.box[0]}x${x.box[1]}  icon ${x.icon?x.icon[0]+'x'+x.icon[1]:'none'}`));
  }
  console.log('errors    :', errs.length);
  errs.slice(0,6).forEach(e=>console.log('  '+e));
  await b.close();
})();
