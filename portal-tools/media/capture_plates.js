/* Three clean plates at the three cover aspect ratios CrazyGames requires:
   16:9 1920x1080, 2:3 800x1200, 1:1 800x800. Rendered at half size with a 2x
   device scale so camK() gives the tighter phone-era framing instead of the
   sparse desktop one. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const A='/tmp/claude-0/-home-user-RunePortal/256dfdb7-80ba-5509-944c-0cc7b791d092/scratchpad/assets/';
const SIZES=[[960,540,'land'],[400,600,'port'],[400,400,'sq']];
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  for(const [w,h,tag] of SIZES){
    const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2})).newPage();
    await p.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
    await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
    await p.click('[data-cls="melee"]');
    await p.waitForFunction(()=>typeof running!=='undefined'&&running&&foes.length>0,{timeout:25000});
    await p.waitForTimeout(1200);
    await p.evaluate(()=>{
      S.lvl=24; for(const _z of ZONES) S.open[_z.id]=1;
      for(const [sl,spec] of [['weapon',{kind:'weapon'}],['head',{slot:'head'}],['chest',{slot:'chest'}],
          ['legs',{slot:'legs'}],['hands',{slot:'hands'}],['feet',{slot:'feet'}]]){
        const it=rollItem({ilvl:42,rar:4,...spec}); if(it) S.equip[sl]=it; }
      computeStats && computeStats(); P.hp=D.maxHp;
      travelTo('voidspire');
    });
    await p.waitForTimeout(2400);
    await p.evaluate(()=>{
      for(const id of ['hud','actions','tabbar','prompt','hud2d','bossBar']){
        const e=document.getElementById(id); if(e) e.style.visibility='hidden'; }
      for(const el of document.querySelectorAll('.panel,.modal,#lootWrap,#lvlWrap,#deathWrap'))
        el.style.visibility='hidden';
      const near=foes.slice(0,12);
      near.forEach((f,i)=>{ const a=i/near.length*Math.PI*2;
        f.x=P.x+Math.cos(a)*(95+((i*43)%38)); f.y=P.y+Math.sin(a)*(95+((i*61)%38)); });
      atkHeld=true;
    });
    await p.waitForTimeout(900);
    await p.screenshot({path:A+`plate_${tag}.png`});
    console.log('plate_'+tag+'.png', w*2+'x'+h*2);
    await p.close();
  }
  await b.close();
})();
