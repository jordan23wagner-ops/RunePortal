const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  await p.goto('file:///home/user/RunePortal/zonelooter3d.html?test',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:20000});
  await p.click('[data-cls="melee"]'); await p.click('#startBtn');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:20000});
  await p.evaluate(()=>{ for(const _z of ZONES) S.open[_z.id]=1; });

  const snap=()=>p.evaluate(()=>{
    const TEXKEYS=['map','normalMap','roughnessMap','metalnessMap','alphaMap','aoMap',
      'emissiveMap','bumpMap','displacementMap','envMap','lightMap','specularMap','gradientMap'];
    const tex=new Map(), mats=new Set(), geos=new Set();
    let meshes=0, lights=0, shadowTex=0;
    T3.scene.traverse(o=>{
      if(o.isMesh||o.isPoints||o.isLine){ meshes++;
        if(o.geometry) geos.add(o.geometry.uuid);
        const ms=Array.isArray(o.material)?o.material:[o.material];
        for(const m of ms){ if(!m) continue; mats.add(m.uuid);
          for(const k of TEXKEYS) if(m[k]) tex.set(m[k].uuid,{k,t:m[k].constructor.name}); }
      }
      if(o.isLight){ lights++; if(o.shadow&&o.shadow.map) shadowTex++; }
    });
    return {counter:T3.renderer.info.memory.textures,
            geoCounter:T3.renderer.info.memory.geometries,
            reachableTex:tex.size, byType:[...tex.values()].reduce((a,c)=>{
              const k=c.t+'.'+c.k; a[k]=(a[k]||0)+1; return a;},{}),
            mats:mats.size, geos:geos.size, meshes, lights, shadowTex};
  });

  console.log('phase                 texCounter  reachable  mats  geos  meshes  lights  shadowTex');
  const line=(tag,s)=>console.log(tag.padEnd(22)+String(s.counter).padStart(10)+
    String(s.reachableTex).padStart(11)+String(s.mats).padStart(6)+
    String(s.geos).padStart(6)+String(s.meshes).padStart(8)+
    String(s.lights).padStart(8)+String(s.shadowTex).padStart(11));

  let s=await snap(); line('baseline',s);
  const first=s;
  for(let i=1;i<=6;i++){
    const z=['verdant','ashen','frost','rotmire','voidspire'][i%5];
    await p.evaluate(zz=>travelTo(zz), z);
    await p.waitForTimeout(900);
    s=await snap(); line(`after travel ${i} (${z})`,s);
  }
  console.log('\nbyType on last snapshot:', JSON.stringify(s.byType));
  console.log(`\ncounter grew ${s.counter-first.counter}, reachable grew ${s.reachableTex-first.reachableTex}`);
  console.log(s.counter-first.counter > s.reachableTex-first.reachableTex+5
    ? '=> ORPHANED: textures uploaded to GPU are no longer reachable from the scene,\n   i.e. created and dropped without dispose()'
    : '=> textures are accumulating IN the scene graph');
  await b.close();
})();
