const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const T=[]; const chk=(n,p,d='')=>T.push({n,pass:p,d});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/crazygames|ERR_TUNNEL/.test(m.text()))errs.push(m.text().slice(0,110));});
  await p.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
  await p.click('[data-cls="melee"]');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:25000});
  await p.waitForTimeout(800);

  chk('ready on a fresh save', await p.evaluate(()=>dailyReady()===true));
  /* the badge is for when you are NOT looking at Camp - showTab clears it on
     open, which is the badge having done its job */
  chk('Camp badge shows when ready', await p.evaluate(()=>{
    document.querySelector('[data-tab="arena"]').click(); dailySync();
    return document.querySelector('[data-tab="pMenu"]').classList.contains('alert'); }));
  await p.evaluate(()=>document.querySelector('[data-tab="pMenu"]').click());
  await p.waitForTimeout(400);
  chk('claim button enabled', await p.evaluate(()=>{
    const b=document.querySelector('[data-daily]'); return !!b && !b.disabled; }));

  const before = await p.evaluate(()=>({gold:S.gold, bag:S.bag.length}));
  await p.evaluate(()=>document.querySelector('[data-daily]').click());
  await p.waitForTimeout(600);
  const after = await p.evaluate(()=>({gold:S.gold, bag:S.bag.length,
    streak:S.daily.streak, d:S.daily.d, today:dayKey(),
    lootOpen:document.getElementById('lootWrap').classList.contains('open')}));
  chk('gold granted', after.gold>before.gold, JSON.stringify({before,after}));
  chk('item granted', after.bag>before.bag);
  chk('streak starts at 1', after.streak===1, String(after.streak));
  chk('stamped with today', after.d===after.today);
  chk('loot overlay shown', after.lootOpen===true);

  await p.evaluate(()=>{const w=document.getElementById('lootWrap'); w.classList.remove('open');
    document.querySelector('[data-tab="pMenu"]').click();});
  await p.waitForTimeout(400);
  chk('no longer ready', await p.evaluate(()=>dailyReady()===false));
  chk('button disabled after claim', await p.evaluate(()=>{
    const b=document.querySelector('[data-daily]'); return !!b && b.disabled; }));
  chk('Camp badge cleared once claimed', await p.evaluate(()=>{
    document.querySelector('[data-tab="arena"]').click(); dailySync();
    return !document.querySelector('[data-tab="pMenu"]').classList.contains('alert'); }));

  /* a second click must not pay out twice */
  const g2 = await p.evaluate(()=>{ const g=S.gold; claimDaily(); return {g, now:S.gold}; });
  chk('double claim pays nothing', g2.g===g2.now, JSON.stringify(g2));

  /* consecutive day continues the streak */
  const cont = await p.evaluate(()=>{
    S.daily.d = yesterdayKey(); S.daily.streak = 3;
    const was = dailyReady(); claimDaily();
    return {was, streak:S.daily.streak};
  });
  chk('yesterday -> ready again', cont.was===true);
  chk('streak continues to 4', cont.streak===4, String(cont.streak));

  /* a missed day resets it */
  const reset = await p.evaluate(()=>{
    const d=new Date(); d.setDate(d.getDate()-5);
    S.daily.d = dayKey(d); S.daily.streak = 6;
    claimDaily(); return S.daily.streak;
  });
  chk('missed day resets streak to 1', reset===1, String(reset));

  /* reward floor rises with streak, and caps */
  const rar = await p.evaluate(()=>{
    const out=[];
    for(const st of [1,4,7,12]){
      S.daily.d=''; S.daily.streak=st-1>0?st-1:0;
      S.daily.d = yesterdayKey(); S.daily.streak = st-1;
      const n0=S.bag.length; claimDaily();
      out.push(S.bag.length>n0 ? S.bag[S.bag.length-1].rar : -1);
    }
    return out;
  });
  chk('rarity rises then caps at Legendary', rar[0]<=rar[1] && rar[1]<=rar[2] && rar[3]<=4,
      JSON.stringify(rar));

  /* survives a reload */
  await p.evaluate(()=>saveGame());
  await p.reload({waitUntil:'load'});
  await p.waitForTimeout(2500);
  chk('claim state persists', await p.evaluate(()=>dailyReady()===false));

  console.log('=== DAILY CACHE ===');
  let pass=0; for(const t of T){ console.log(`  ${t.pass?'PASS':'FAIL'}  ${t.n}${t.pass?'':'   <- '+t.d}`); if(t.pass)pass++; }
  console.log(`\n${pass}/${T.length} passed | errors ${errs.length}`);
  errs.slice(0,4).forEach(e=>console.log('  '+e));
  await b.close();
})();
