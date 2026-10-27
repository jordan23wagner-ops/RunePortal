/* Hit-stop behaviour. Software WebGL runs ~2fps here, which would trip the
   low-fps guard, so the loop is driven manually at a healthy frame time to
   test what a real device sees. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const T=[]; const chk=(n,p,d='')=>T.push({n,pass:p,d});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const p=await (await b.newContext({viewport:{width:1280,height:720}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
  await p.click('[data-cls="melee"]');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running&&foes.length>0,{timeout:25000});
  await p.waitForTimeout(900);

  const r = await p.evaluate(async()=>{
    S.lvl=20; for(let i=0;i<40;i++){const w=rollItem({ilvl:40,rar:4,kind:'weapon'});
      if(w&&w.cls==='melee'){S.equip.weapon=w;break;}}
    computeStats&&computeStats(); P.hp=D.maxHp;
    /* one-shot everything: the risk under test is many kills per second
       compounding into a stutter, not whether the bot can win a fight */
    D.hitMin = D.hitMax = 99999;
    _lastRaw = 0.016;                      /* pretend a healthy 60fps device */
    let frozenFrames=0, simFrames=0, maxFreeze=0, kills0=S.meta.kills||0;
    let freezes=0, wasFrozen=false;
    const DT=1/60;
    for(let i=0;i<60*20;i++){              /* 20 simulated seconds */
      if(i%6===0){
        const near=foes.slice(0,10);
        near.forEach((f,j)=>{const a=j/near.length*6.283;
          f.x=P.x+Math.cos(a)*90; f.y=P.y+Math.sin(a)*90;});
      }
      atkHeld=true;
      _lastRaw = DT;
      if(hitStop>0){
        frozenFrames++; maxFreeze=Math.max(maxFreeze,hitStop);
        if(!wasFrozen){ freezes++; wasFrozen=true; }
        hitStop -= DT;
      } else { wasFrozen=false; simFrames++; update(DT); }
    }
    return {frozenFrames, simFrames, freezes,
            maxFreezeMs:+(maxFreeze*1000).toFixed(0),
            pctFrozen:+((frozenFrames/(frozenFrames+simFrames))*100).toFixed(1),
            kills:(S.meta.kills||0)-kills0};
  });

  chk('hit-stop fires', r.freezes>0, JSON.stringify(r));
  chk('never exceeds 100ms', r.maxFreezeMs<=100, r.maxFreezeMs+'ms');
  chk('frozen time stays small', r.pctFrozen<18, r.pctFrozen+'%');
  chk('simulation keeps advancing', r.simFrames > 1200*0.8, r.simFrames+'/1200 frames stepped');
  chk('kills actually happened', r.kills>0, r.kills+' kills');

  /* the low-fps guard */
  const guarded = await p.evaluate(()=>{
    hitStop=0; _hsAt=-1; _lastRaw=0.10;   /* ~10fps */
    hitFreeze(0.09);
    const blocked = hitStop===0;
    _lastRaw=0.016; _hsAt=-1; hitFreeze(0.09);
    return {blocked, allowedWhenHealthy: hitStop>0};
  });
  chk('skipped below ~20fps', guarded.blocked===true);
  chk('applied at healthy fps', guarded.allowedWhenHealthy===true);

  console.log('=== COMBAT FEEL ===');
  console.log('  ', JSON.stringify(r));
  let pass=0; for(const t of T){ console.log(`  ${t.pass?'PASS':'FAIL'}  ${t.n}${t.pass?'':'   <- '+t.d}`); if(t.pass)pass++; }
  console.log(`\n${pass}/${T.length} passed | errors ${errs.length}`);
  await b.close();
})();
