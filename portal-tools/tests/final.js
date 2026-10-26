const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const VPS=[[390,844,'phone portrait'],[844,390,'phone landscape'],
           [821,462,'CG min landscape'],[1280,720,'CG 720p'],[1920,1080,'CG 1080p']];
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const rows=[];
  for(const [w,h,tag] of VPS){
    const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage();
    await p.goto('file:///home/user/RunePortal/zonelooter3d.html?test',{waitUntil:'load'});
    await p.waitForSelector('[data-cls="melee"]',{timeout:20000});
    await p.click('[data-cls="melee"]'); await p.click('#startBtn');
    await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:20000});

    /* REAL chest counts only: openChest() does rint(1,2) and nothing calls
       showLoot with more than 2 */
    for(const n of [1,2]){
      const r=await p.evaluate(nn=>{
        S.bag.length=0; const its=[];
        for(let i=0;i<nn;i++){const it=rollItem({ilvl:40,rar:3}); bagAdd(it); its.push(it);}
        showLoot(its,500);
        const btn=document.getElementById('lootOk');
        const bb=btn.getBoundingClientRect();
        const wrap=document.getElementById('lootWrap');
        return {bottom:Math.round(bb.bottom), vh:innerHeight,
          reachable: bb.top>=0 && bb.bottom<=innerHeight+1,
          scrollable:['auto','scroll'].includes(getComputedStyle(wrap).overflowY)};
      },n);
      rows.push({tag,vp:`${w}x${h}`,overlay:`loot x${n}`,...r});
      await p.evaluate(()=>{document.getElementById('lootWrap').classList.remove('open');});
      await p.waitForTimeout(150);
    }
    /* siblings share the flex-centre pattern */
    for(const [wrapId,okId,setup] of [['lvlWrap','lvlOk','lvl'],['deathWrap','deathOk','death']]){
      const r=await p.evaluate(([wid,oid,kind])=>{
        if(kind==='lvl'){ S.lvl=(S.lvl||1)+1; }
        document.getElementById(wid).classList.add('open');
        const btn=document.getElementById(oid);
        if(!btn) return {bottom:-1,vh:innerHeight,reachable:null,scrollable:null};
        const bb=btn.getBoundingClientRect();
        const wrap=document.getElementById(wid);
        return {bottom:Math.round(bb.bottom), vh:innerHeight,
          reachable: bb.top>=0 && bb.bottom<=innerHeight+1,
          scrollable:['auto','scroll'].includes(getComputedStyle(wrap).overflowY)};
      },[wrapId,okId,setup]);
      rows.push({tag,vp:`${w}x${h}`,overlay:wrapId,...r});
      await p.evaluate(w2=>document.getElementById(w2).classList.remove('open'),wrapId);
      await p.waitForTimeout(120);
    }
    await p.close();
  }
  console.log('viewport              overlay      btnBottom  vh   reachable  wrapScrolls');
  for(const r of rows)
    console.log(`${(r.tag+' '+r.vp).padEnd(30)}${r.overlay.padEnd(12)}`+
      String(r.bottom).padStart(8)+String(r.vh).padStart(6)+
      String(r.reachable).padStart(11)+String(r.scrollable).padStart(13)+
      (r.reachable===false?'   <-- STUCK':''));
  const bad=rows.filter(r=>r.reachable===false);
  console.log(`\n${bad.length} of ${rows.length} overlay states are unreachable`);
  await b.close();
})();
