const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();
  await p.goto('file:///home/user/RunePortal/zonelooter3d.html?test',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:20000});
  await p.click('[data-cls="melee"]'); await p.click('#startBtn');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:20000});

  const open=async(n)=>p.evaluate(nn=>{
    S.bag.length=0; const its=[];
    for(let i=0;i<nn;i++){const it=rollItem({ilvl:40,rar:3}); bagAdd(it); its.push(it);}
    showLoot(its,500,'Chest Opened');
    return document.getElementById('lootWrap').classList.contains('open');
  },n);
  const isOpen=()=>p.evaluate(()=>({
    open:document.getElementById('lootWrap').classList.contains('open'),
    paused:typeof paused!=='undefined'?paused:null}));

  const trials=[];
  /* 1. Escape key */
  await open(5); let st=await isOpen();
  await p.keyboard.press('Escape'); await p.waitForTimeout(350);
  trials.push({path:'Escape key', before:st.open, after:(await isOpen()).open});

  /* 2. click the backdrop (lootWrap itself, top-left corner, away from cards) */
  await open(5);
  await p.mouse.click(8,8); await p.waitForTimeout(350);
  trials.push({path:'click backdrop 8,8', before:true, after:(await isOpen()).open});

  /* 3. click dead centre of the visible overlay area */
  await open(5);
  await p.mouse.click(422,195); await p.waitForTimeout(350);
  trials.push({path:'click overlay centre', before:true, after:(await isOpen()).open});

  /* 4. a nav-rail tab — can the player just walk away from it? */
  await open(5);
  await p.evaluate(()=>document.querySelector('[data-tab="pBag"]').click());
  await p.waitForTimeout(400);
  let s4=await isOpen();
  trials.push({path:'nav tab pBag', before:true, after:s4.open, paused:s4.paused});

  /* 5. back to arena after that - is the game still paused? */
  await p.evaluate(()=>document.querySelector('[data-tab="arena"]').click());
  await p.waitForTimeout(400);
  const s5=await isOpen();

  /* 6. does rotating to portrait bring COLLECT back? */
  await open(5);
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(600);
  const rot=await p.evaluate(()=>{
    const btn=[...document.querySelectorAll('#lootWrap button,#lootWrap .btn')]
      .filter(e=>e.offsetParent!==null)[0];
    if(!btn) return {found:false};
    const r=btn.getBoundingClientRect();
    return {found:true, txt:(btn.innerText||'').trim(), top:Math.round(r.top),
            bottom:Math.round(r.bottom), vh:innerHeight,
            onscreen:r.top>=0&&r.bottom<=innerHeight+1};
  });

  /* 7. how many items does a REAL chest actually give? */
  await p.setViewportSize({width:844,height:390}); await p.waitForTimeout(400);
  const real=await p.evaluate(()=>{
    const counts=[];
    for(let i=0;i<40;i++){
      S.bag.length=0;
      const before=S.bag.length;
      /* mimic a chest roll without the UI */
      if(typeof chestLoot==='function'){ const r=chestLoot(); counts.push(Array.isArray(r)?r.length:1); }
      else { counts.push(null); }
    }
    return {sampled:counts.filter(x=>x!=null).length,
            dist:counts.filter(x=>x!=null).reduce((a,c)=>{a[c]=(a[c]||0)+1;return a;},{}),
            fnExists:typeof chestLoot==='function'};
  });

  console.log('=== CAN THE LOOT OVERLAY BE DISMISSED? (landscape 844x390, 5 items) ===');
  for(const t of trials)
    console.log(`  ${t.path.padEnd(22)} still open after: ${t.after}` +
      (t.paused!=null?`  (paused=${t.paused})`:''));
  console.log(`  after returning to arena: open=${s5.open} paused=${s5.paused}`);
  console.log('\n=== does rotating to portrait recover COLLECT? ===');
  console.log('  ', JSON.stringify(rot));
  console.log('\n=== real chest item counts ===');
  console.log('  ', JSON.stringify(real));
  await b.close();
})();
