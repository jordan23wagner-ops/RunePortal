/* MEMORY SOAK — 45 game-minutes with repeated zone rebuilds, the thing a
   25-minute run could not call either way. Zone travel is the suspected leak
   vector: it tears down and rebuilds every mesh, light and InstancedMesh. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const MINUTES = 7;

(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required','--js-flags=--expose-gc']});
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text().slice(0,160));});

  await p.goto('file:///home/user/RunePortal/zonelooter3d.html?test',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:20000});
  await p.click('[data-cls="melee"]'); await p.click('#startBtn');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:20000});
  await p.evaluate(()=>{
    if(typeof devRiches==='function') devRiches();
    if(typeof devSetLevel==='function') devSetLevel(40);
    for(const _z of ZONES) S.open[_z.id]=1;
  });

  const samples=[];
  const t0=Date.now();
  let cycles=0;
  while((Date.now()-t0) < MINUTES*60*1000){
    /* one cycle: travel every zone, fight a little in each */
    await p.evaluate(async()=>{
      for(const z of ZONES){
        travelTo(z.id);
        await new Promise(r=>setTimeout(r,500));
        /* keep the player alive and swinging so pools churn */
        P.hp = D.maxHp; atkHeld = true;
        await new Promise(r=>setTimeout(r,1400));
        atkHeld = false;
      }
    });
    cycles++;
    const s=await p.evaluate(()=>{
      if(window.gc) window.gc();
      return {heap:performance.memory?+(performance.memory.usedJSHeapSize/1048576).toFixed(1):null,
        geo:T3.renderer.info.memory.geometries, tex:T3.renderer.info.memory.textures,
        draws:T3.renderer.info.render.calls, foes:foes.length,
        objs:(()=>{let n=0;T3.scene.traverse(()=>n++);return n;})(),
        bag:S.bag.length, zone:S.zone};
    });
    samples.push({min:+((Date.now()-t0)/60000).toFixed(1), cycle:cycles, ...s});
    console.log(`t=${samples.at(-1).min}m cyc=${cycles} heap=${s.heap}MB geo=${s.geo} tex=${s.tex} sceneObjs=${s.objs} draws=${s.draws} foes=${s.foes} zone=${s.zone}`);
  }

  const f=samples[0], l=samples.at(-1);
  const mid=samples[Math.floor(samples.length/2)];
  console.log('\n=== SOAK SUMMARY ===');
  console.log(`duration ${l.min}m, ${cycles} full 5-zone cycles (${cycles*5} zone rebuilds)`);
  console.log(`heap      ${f.heap} -> ${mid.heap} -> ${l.heap} MB`);
  console.log(`geometries ${f.geo} -> ${mid.geo} -> ${l.geo}`);
  console.log(`textures   ${f.tex} -> ${mid.tex} -> ${l.tex}`);
  console.log(`scene objs ${f.objs} -> ${mid.objs} -> ${l.objs}`);
  const growth = l.heap - mid.heap;
  console.log(`second-half heap growth: ${growth.toFixed(1)} MB  => ${Math.abs(growth)<8?'FLAT (no leak signal)':'GROWING (investigate)'}`);
  console.log(`geometry growth 2nd half: ${l.geo-mid.geo}  => ${Math.abs(l.geo-mid.geo)<20?'stable':'LEAKING GPU RESOURCES'}`);
  console.log(`errors: ${errs.length}`); errs.slice(0,5).forEach(e=>console.log('  '+e));
  await b.close();
})();
