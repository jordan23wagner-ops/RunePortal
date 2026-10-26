const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  for(const [w,h,tag] of [[390,844,'portrait'],[844,390,'landscape'],[821,462,'cg-min-landscape']]){
    const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage();
    await p.goto('file:///home/user/RunePortal/zonelooter3d.html?test',{waitUntil:'load'});
    await p.waitForSelector('[data-cls="melee"]',{timeout:20000});
    await p.click('[data-cls="melee"]'); await p.click('#startBtn');
    await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:20000});
    for(const n of [1,3,5]){
      const r=await p.evaluate(nn=>{
        S.bag.length=0;
        const its=[]; for(let i=0;i<nn;i++){ const it=rollItem({ilvl:40,rar:3}); bagAdd(it); its.push(it); }
        showLoot(its, 500, 'Chest Opened');
        const vh=innerHeight, vw=innerWidth;
        /* find whatever dismisses this overlay */
        const btns=[...document.querySelectorAll('#lootWrap button, #lootWrap .btn, [data-lootclose], #lootClose')]
          .filter(e=>e.offsetParent!==null);
        const info=btns.map(e=>{const b=e.getBoundingClientRect();
          return {txt:(e.innerText||'').trim().slice(0,22),
                  top:Math.round(b.top), bottom:Math.round(b.bottom),
                  onscreen: b.top>=0 && b.bottom<=vh+1 && b.left>=0 && b.right<=vw+1};});
        const cards=document.getElementById('lootCards').getBoundingClientRect();
        const wrap=document.getElementById('lootWrap');
        return {n:nn, vw, vh,
          cardsBottom:Math.round(cards.bottom),
          wrapScrollH:wrap.scrollHeight, wrapClientH:wrap.clientHeight,
          wrapOverflowY:getComputedStyle(wrap).overflowY,
          canScroll: wrap.scrollHeight>wrap.clientHeight+1 &&
                     ['auto','scroll'].includes(getComputedStyle(wrap).overflowY),
          buttons:info,
          anyDismissReachable: info.some(x=>x.onscreen)};
      }, n);
      const verdict = r.anyDismissReachable ? 'dismissable'
                    : (r.canScroll ? 'offscreen but scrollable' : '*** UNREACHABLE — SOFT LOCK ***');
      console.log(`${tag.padEnd(18)} items=${r.n}  vp=${r.vw}x${r.vh}  cardsBottom=${r.cardsBottom}  wrap ${r.wrapScrollH}/${r.wrapClientH} overflowY=${r.wrapOverflowY}  -> ${verdict}`);
      for(const x of r.buttons) console.log(`      btn "${x.txt}" top=${x.top} bottom=${x.bottom} onscreen=${x.onscreen}`);
      await p.evaluate(()=>{const o=document.getElementById('lootWrap'); if(o)o.classList.remove('open'); if(typeof closeModal==='function')closeModal();});
      await p.waitForTimeout(200);
    }
    await p.close();
  }
  await b.close();
})();
