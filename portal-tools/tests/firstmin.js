/* What does a brand-new player actually experience in the first 3 minutes?
   Simulates an average player: moves toward the nearest enemy and attacks.
   No dev helpers, no gear, fresh save - exactly what a reviewer saw. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const p=await (await b.newContext({viewport:{width:1280,height:720}})).newPage();
  await p.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
  await p.click('[data-cls="melee"]');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running&&foes.length>0,{timeout:25000});

  const r = await p.evaluate(async()=>{
    const ev=[];           /* milestone log, in GAME seconds */
    let t=0, kills=0, drops=0, chestsOpened=0, lvl=S.lvl, lastLvl=lvl;
    let bagAt=S.bag.length, firstKill=null, firstDrop=null, firstLvl=null, firstChest=null;
    let nearStart=foes.filter(f=>Math.hypot(f.x-P.x,f.y-P.y)<600).length;
    const chestD = chests.length
      ? Math.round(Math.min(...chests.map(c=>Math.hypot(c.x-P.x,c.y-P.y)))) : null;
    const chestsPlaced = chests.length;
    let distTravelled=0, idleFrames=0, swings=0, deaths=0, hpSum=0, hpN=0;
    let px=P.x, py0=P.y;
    const DT=1/30, STEPS=180*30;        /* 3 game-minutes at 30Hz */

    for(let i=0;i<STEPS;i++){
      /* average player: walk at the nearest live enemy and swing */
      /* a player who spots a chest goes for it - the old probe only ever
         chased enemies, so it could never open one and reported a false zero */
      let target=null, bd=1e9, isChest=false;
      for(const c of chests){ if(c.open) continue;
        const d=Math.hypot(c.x-P.x,c.y-P.y);
        if(d<700 && d<bd){ bd=d; target=c; isChest=true; } }
      if(!target) for(const f of foes){ const d=Math.hypot(f.x-P.x,f.y-P.y);
        if(d<bd){bd=d;target=f;isChest=false;} }
      if(isChest && bd<60 && typeof openChest==='function'){
        nearChest = target; openChest();
      }
      const best = target;
      if(best){
        const dx=best.x-P.x, dy=best.y-P.y, m=Math.hypot(dx,dy)||1;
        keys['d']=dx> 18?1:0; keys['a']=dx<-18?1:0;
        keys['s']=dy> 18?1:0; keys['w']=dy<-18?1:0;
        atkHeld = !isChest && bd < 170;
        if(bd>=170) idleFrames++;        /* walking, not fighting */
      }
      if(P.hp<=0){ deaths++; P.hp=D.maxHp*0.6; }   /* count, then revive to keep measuring */
      hpSum += P.hp/D.maxHp; hpN++;
      const k0=S.meta.kills||0;
      update(DT); t+=DT;
      distTravelled += Math.hypot(P.x-px, P.y-py0); px=P.x; py0=P.y;
      const k1=S.meta.kills||0;
      if(k1>k0){ kills+=k1-k0; if(firstKill===null) firstKill=+t.toFixed(1); }
      if(S.bag.length>bagAt){ drops+=S.bag.length-bagAt; bagAt=S.bag.length;
        if(firstDrop===null) firstDrop=+t.toFixed(1); }
      if((S.meta.chests||0)>chestsOpened){ chestsOpened=S.meta.chests;
        if(firstChest===null) firstChest=+t.toFixed(1); }
      if(S.lvl>lastLvl){ lastLvl=S.lvl; if(firstLvl===null) firstLvl=+t.toFixed(1); }
    }
    return {chestD, chestsPlaced, firstKill, firstDrop, firstLvl, firstChest,
            kills, drops, chests:chestsOpened, lvlGained:S.lvl-lvl,
            enemiesWithin600AtSpawn:nearStart,
            deaths, avgHpPct:+((hpSum/Math.max(1,hpN))*100).toFixed(0),
            pctTimeWalkingNotFighting:+((idleFrames/STEPS)*100).toFixed(0),
            worldW:WORLD.w, worldH:WORLD.h,
            foesAlive:foes.length};
  });

  console.log('=== FIRST 3 MINUTES, fresh save, average player ===');
  console.log(`  enemies within 600u of spawn : ${r.enemiesWithin600AtSpawn}`);
  console.log(`  chests placed / nearest      : ${r.chestsPlaced} / ${r.chestD}u`);
  console.log(`  first kill                   : ${r.firstKill}s`);
  console.log(`  first item drop              : ${r.firstDrop}s`);
  console.log(`  first chest                  : ${r.firstChest}s`);
  console.log(`  first level up               : ${r.firstLvl}s`);
  console.log(`  in 180s: ${r.kills} kills, ${r.drops} drops, ${r.chests} chests, +${r.lvlGained} levels`);
  console.log(`  deaths in 180s               : ${r.deaths}   (avg HP ${r.avgHpPct}%)`);
  console.log(`  time spent WALKING not fighting: ${r.pctTimeWalkingNotFighting}%`);
  console.log(`  world size ${r.worldW}x${r.worldH}, ${r.foesAlive} foes alive`);
  await b.close();
})();
