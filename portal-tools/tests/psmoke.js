/* Portal build smoke: boots with the SDK UNREACHABLE (proxy-blocked here),
   which is the ad-blocker / SDK-down path the shim is supposed to survive. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const VPS=[[390,844,'portrait'],[844,390,'landscape'],[821,462,'CG min'],[1920,1080,'CG 1080p']];
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  for(const [w,h,tag] of VPS){
    const ctx=await b.newContext({viewport:{width:w,height:h}});
    const p=await ctx.newPage();
    const errs=[],reqs=[],failed=[];
    p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
    p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text().slice(0,120));});
    p.on('request',r=>reqs.push(r.url()));
    p.on('requestfailed',r=>failed.push(r.url().slice(0,60)));

    const t0=Date.now();
    await p.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
    await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
    const tIntro=Date.now()-t0;
    /* ONE tap: the portal build auto-starts from the class pick */
    await p.click('[data-cls="melee"]');
    await p.waitForFunction(()=>typeof running!=='undefined'&&running&&
      typeof foes!=='undefined'&&foes.length>0,{timeout:25000});
    const tPlay=Date.now()-t0;
    await p.waitForTimeout(1200);

    const m=await p.evaluate(()=>({
      mode:MODE, portalReady:PORTAL.ready, build:BUILD,
      foes:foes.length, draws:T3.renderer.info.render.calls,
      tex:T3.renderer.info.memory.textures, paused, running,
      startBtnClicks:(document.getElementById('startBtn')||{}).disabled,
      deathRevive:!!document.getElementById('deathRevive'),
    }));
    const ext=reqs.filter(u=>!u.startsWith('file:///home/user/RunePortal/'));
    console.log(`${tag.padEnd(10)} intro ${String(tIntro).padStart(5)}ms  playable ${String(tPlay).padStart(5)}ms  foes=${m.foes} draws=${m.draws} tex=${m.tex} mode=${m.mode} sdkReady=${m.portalReady}`);
    console.log(`           ext-req ${ext.length} ${ext.map(u=>u.slice(0,46)).join(',')} | failed ${failed.length} | errors ${errs.length}`);
    if(errs.length) errs.slice(0,3).forEach(e=>console.log('             '+e));
    await ctx.close();
  }
  await b.close();
})();
