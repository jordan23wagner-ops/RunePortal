const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  for(const [w,h,tag] of [[1920,1080,'1920x1080'],[1280,720,'1280x720'],[960,540,'960x540'],[720,405,'720x405'],[1080,1620,'1080x1620 portrait'],[720,1080,'720x1080 portrait']]){
    const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage();
    await p.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
    await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
    await p.click('[data-cls="melee"]');
    await p.waitForFunction(()=>typeof running!=='undefined'&&running&&foes.length>0,{timeout:25000});
    await p.evaluate(()=>{ S.lvl=24; for(const _z of ZONES) S.open[_z.id]=1;
      for(const [sl,sp] of [['weapon',{kind:'weapon'}],['chest',{slot:'chest'}],['head',{slot:'head'}]]){
        const it=rollItem({ilvl:42,rar:4,...sp}); if(it) S.equip[sl]=it; }
      computeStats&&computeStats(); P.hp=D.maxHp; });
    await p.waitForTimeout(1500);
    /* count real rAF frames over 4 seconds while fighting */
    const fps=await p.evaluate(async()=>{
      const near=foes.slice(0,12);
      near.forEach((f,i)=>{const a=i/near.length*Math.PI*2;
        f.x=P.x+Math.cos(a)*110; f.y=P.y+Math.sin(a)*110;});
      atkHeld=true;
      let n=0; const t0=performance.now();
      await new Promise(res=>{ const tick=()=>{ n++;
        if(performance.now()-t0 < 4000) requestAnimationFrame(tick); else res(); };
        requestAnimationFrame(tick); });
      atkHeld=false;
      return +(n/((performance.now()-t0)/1000)).toFixed(1);
    });
    const g=await p.evaluate(()=>({gfx:gfxTier, draws:T3.renderer.info.render.calls}));
    console.log(`  ${tag.padEnd(20)} ${String(fps).padStart(5)} fps   gfx=${g.gfx} draws=${g.draws}`);
    await p.close();
  }
  await b.close();
})();
