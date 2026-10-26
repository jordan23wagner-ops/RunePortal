/* Offline frame renderer. Software WebGL manages ~2fps here, so recording in
   real time would produce a slideshow. Instead: stop the rAF loop, step
   update() by a fixed dt, render(), screenshot - then assemble at 30fps.
   Takes minutes to produce, plays perfectly smooth. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const OUT = '/tmp/claude-0/-home-user-RunePortal/256dfdb7-80ba-5509-944c-0cc7b791d092/scratchpad/video/';
const [W,H,TAG,FRAMES,CAMK] = [
  +process.argv[2], +process.argv[3], process.argv[4], +process.argv[5], +process.argv[6]];
const FPS = 30, DT = 1/FPS;

(async()=>{
  const dir = OUT+TAG; fs.mkdirSync(dir,{recursive:true});
  for(const f of fs.readdirSync(dir)) fs.unlinkSync(dir+'/'+f);
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--hide-scrollbars']});
  const p=await (await b.newContext({viewport:{width:W,height:H}})).newPage();
  await p.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:30000});
  await p.click('[data-cls="melee"]');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running&&foes.length>0,{timeout:30000});

  await p.evaluate(ck=>{
    S.lvl=26; S.gold=120000; for(const _z of ZONES) S.open[_z.id]=1;
    /* the weapon roll is random across archetypes and kept handing out a bow,
       so the melee swing never appeared. Roll until it is a melee weapon. */
    for(let i=0;i<40;i++){ const w=rollItem({ilvl:44,rar:4,kind:'weapon'});
      if(w && w.cls==='melee'){ S.equip.weapon=w; break; } }
    for(const [sl,sp] of [['offhand',{kind:'offhand'}],
        ['head',{slot:'head'}],['chest',{slot:'chest'}],['legs',{slot:'legs'}],
        ['hands',{slot:'hands'}],['feet',{slot:'feet'}]]){
      const it=rollItem({ilvl:44,rar:4,...sp}); if(it) S.equip[sl]=it; }
    computeStats&&computeStats(); P.hp=D.maxHp; P.mp=D.maxMp;
    travelTo('voidspire');   /* densest roster and the strongest palette */
    /* tighter framing than the desktop default, which puts the hero far away */
    window.camK = ()=>ck;
    /* #app{max-width:560px} is a phone-first cap; at 1080 wide it leaves black
       bars down both sides, which the cover guidelines prohibit. */
    if(innerHeight > innerWidth){
      const st=document.createElement('style');
      st.textContent='#app{max-width:none !important;}';
      document.head.appendChild(st);
      dispatchEvent(new Event('resize'));
    }
    running = false;            /* take the loop off rAF; we step it by hand */
  }, CAMK);
  await p.waitForTimeout(600);

  const t0=Date.now();
  for(let i=0;i<FRAMES;i++){
    await p.evaluate(([n,dt,total])=>{
      const t = n/total;
      /* choreography: circle-strafe, swing throughout, skill bursts, and a
         zone change at the midpoint for a palette shift */
      /* The first cut wandered: the hero drifted off, crowds thinned, and the
         opening seconds - the ones that matter for a hover preview - were
         nearly empty. Pull strays in constantly so the fight never stops. */
      if(n%7===0){
        let moved=0;
        for(const f of foes){ if(moved>=6) break;
          const d=Math.hypot(f.x-P.x,f.y-P.y);
          if(d>300){ const a=Math.random()*Math.PI*2;
            f.x=P.x+Math.cos(a)*(120+Math.random()*70);
            f.y=P.y+Math.sin(a)*(120+Math.random()*70); moved++; } }
      }
      atkHeld = true;
      if(typeof keys!=='undefined'){
        const ang = t*Math.PI*6.0;      /* tight orbit, not a march */
        keys['w']=Math.sin(ang)>0.55?1:0;  keys['s']=Math.sin(ang)<-0.55?1:0;
        keys['a']=Math.cos(ang)<-0.55?1:0; keys['d']=Math.cos(ang)>0.55?1:0;
      }
      if(n===Math.floor(total*0.22) || n===Math.floor(total*0.70)){
        try{ P.mp=D.maxMp; useSkill(); }catch(e){}
      }
      P.hp = Math.max(P.hp, D.maxHp*0.55);     /* never die mid-trailer */
      update(dt); render();
    }, [i, DT, FRAMES]);
    await p.screenshot({path:`${dir}/f${String(i).padStart(4,'0')}.jpg`, type:'jpeg', quality:92});
    if(i && i%60===0){
      const el=(Date.now()-t0)/1000;
      console.log(`  ${TAG}: ${i}/${FRAMES} frames, ${el.toFixed(0)}s elapsed, eta ${((el/i)*(FRAMES-i)).toFixed(0)}s`);
    }
  }
  console.log(`  ${TAG}: done ${FRAMES} frames in ${((Date.now()-t0)/1000).toFixed(0)}s`);
  await b.close();
})();
