const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT='/tmp/claude-0/-home-user-RunePortal/256dfdb7-80ba-5509-944c-0cc7b791d092/scratchpad/assets/t_';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:960,height:540},deviceScaleFactor:2});
  const p=await ctx.newPage();
  await p.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
  await p.click('[data-cls="melee"]');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running&&foes.length>0,{timeout:25000});
  await p.waitForTimeout(1500);

  /* dress the character up a bit - portal build has no dev helpers, so set
     state directly. Nothing here is persisted anywhere that matters. */
  await p.evaluate(()=>{
    S.lvl=24; S.gold=842000; S.sp=6;
    for(const _z of ZONES) S.open[_z.id]=1;
    const slots=[['weapon',{kind:'weapon'}],['offhand',{kind:'offhand'}],
                 ['head',{slot:'head'}],['chest',{slot:'chest'}],['legs',{slot:'legs'}],
                 ['hands',{slot:'hands'}],['feet',{slot:'feet'}],
                 ['ring1',{kind:'trinket',slot:'ring'}],['ring2',{kind:'trinket',slot:'ring'}],
                 ['amulet',{kind:'trinket',slot:'amulet'}]];
    for(const [sl,spec] of slots){
      const it=rollItem({ilvl:42, rar:4, ...spec}); if(it) S.equip[sl]=it;
    }
    computeStats && computeStats();
    P.hp=D.maxHp; P.mp=D.maxMp;
    S.bag.length=0;
    for(let i=0;i<14;i++) bagAdd(rollItem({ilvl:42, rar:2+(i%4)}));
    saveGame();
  });
  await p.waitForTimeout(900);

  const shot = async (name, prep, settle=1100) => {
    if(prep) await p.evaluate(prep);
    await p.waitForTimeout(settle);
    await p.screenshot({path:OUT+name});
    console.log('  captured', name);
  };

  /* 1. combat: drag a crowd onto the player and swing */
  await shot('01_combat.png', ()=>{
    document.querySelector('[data-tab="arena"]').click();
    const near=foes.slice(0,16);
    near.forEach((f,i)=>{ const a=i/near.length*Math.PI*2;
      f.x=P.x+Math.cos(a)*(90+((i*37)%55)); f.y=P.y+Math.sin(a)*(90+((i*53)%55)); });
    atkHeld=true;
  }, 700);
  await p.evaluate(()=>{atkHeld=false;});

  /* 2. deeper zone for a different palette */
  await shot('02_voidspire.png', ()=>{
    travelTo('voidspire');
  }, 2200);
  await p.evaluate(()=>{ const near=foes.slice(0,14);
    near.forEach((f,i)=>{ const a=i/near.length*Math.PI*2;
      f.x=P.x+Math.cos(a)*(100+((i*41)%50)); f.y=P.y+Math.sin(a)*(100+((i*59)%50)); });
    atkHeld=true; });
  await shot('03_voidspire_fight.png', null, 800);
  await p.evaluate(()=>{atkHeld=false;});

  /* 3. loot overlay with a legendary */
  await shot('04_loot.png', ()=>{
    const its=[rollItem({ilvl:42,rar:4,kind:'weapon'}), rollItem({ilvl:42,rar:3,slot:'chest'})];
    showLoot(its, 2450, 'Chest Opened');
  });
  await p.evaluate(()=>{ const w=document.getElementById('lootWrap'); if(w) w.classList.remove('open'); });

  /* 4. the panels */
  await shot('05_skilltree.png', ()=>document.querySelector('[data-tab="pSkill"]').click());
  await shot('06_bag.png',       ()=>document.querySelector('[data-tab="pBag"]').click());
  await shot('07_gear.png',      ()=>document.querySelector('[data-tab="pGear"]').click());
  await shot('08_zones.png',     ()=>document.querySelector('[data-tab="pZone"]').click());

  /* 5. a clean plate with no HUD, for cover art */
  await p.evaluate(()=>{
    document.querySelector('[data-tab="arena"]').click();
    for(const id of ['hud','actions','tabbar','mini','prompt']){
      const e=document.getElementById(id); if(e) e.style.visibility='hidden'; }
    const near=foes.slice(0,12);
    near.forEach((f,i)=>{ const a=i/near.length*Math.PI*2;
      f.x=P.x+Math.cos(a)*(115+((i*43)%45)); f.y=P.y+Math.sin(a)*(115+((i*61)%45)); });
  });
  await shot('09_plate_clean.png', null, 1400);

  await b.close();
  console.log('done');
})();
