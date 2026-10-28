const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const T=[]; const chk=(n,pass,d='')=>T.push({n,pass,d});
const OUT='/tmp/claude-0/-home-user-RunePortal/256dfdb7-80ba-5509-944c-0cc7b791d092/scratchpad/video/';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/sdk\.crazygames|ERR_TUNNEL/.test(m.text()))errs.push(m.text().slice(0,120));});
  await p.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
  await p.click('[data-cls="melee"]');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running&&foes.length>0,{timeout:25000});
  await p.waitForTimeout(900);

  const state = ()=>p.evaluate(()=>({
    step:S.tut,
    barOn:document.getElementById('tutBar').classList.contains('on'),
    barOnPanel:document.getElementById('tutBar').classList.contains('onPanel'),
    msg:(document.getElementById('tutMsg').innerText||'').slice(0,46),
    pulsing:[...document.querySelectorAll('.tab.tutPulse')].map(e=>e.dataset.tab),
  }));

  let s=await state();
  chk('step 0 on a fresh save', s.step===0, JSON.stringify(s));
  chk('bar visible on arena', s.barOn===true);
  chk('step 0 mentions movement', /drag|wasd/i.test(s.msg), s.msg);
  chk('nothing pulses on step 0', s.pulsing.length===0, s.pulsing.join());
  await p.screenshot({path:OUT+'tut_step0.png'});

  /* a kill clears step 0 */
  await p.evaluate(()=>{ S.meta.kills=(S.meta.kills||0)+1; });
  await p.waitForFunction(()=>S.tut===1,{timeout:8000}).catch(()=>{});
  s=await state();
  chk('kill advances to step 1', s.step===1, JSON.stringify(s));
  chk('BAG pulses on step 1', s.pulsing.includes('pBag'), s.pulsing.join());

  /* each remaining step is cleared by opening the tab it points at */
  const walk=[['pBag',2,'pGear'],['pGear',3,'pSkill'],['pSkill',4,'pZone'],['pZone',5,null]];
  for(const [open,wantStep,wantPulse] of walk){
    await p.evaluate(t=>document.querySelector('[data-tab="'+t+'"]').click(), open);
    await p.waitForTimeout(350);
    const st=await state();
    chk(`opening ${open} -> step ${wantStep}`, st.step===wantStep, JSON.stringify(st));
    const lastStep = wantPulse === null;
    chk(`bar ${lastStep?'gone after the last step':'still readable'} on ${open}`,
        st.barOn === !lastStep, `barOn=${st.barOn} step=${st.step}`);
    if(!lastStep) chk(`bar is docked clear of the panel on ${open}`, st.barOnPanel===true,
        `onPanel=${st.barOnPanel}`);
    if(wantPulse) chk(`${wantPulse} pulses next`, st.pulsing.includes(wantPulse), st.pulsing.join());
  }

  await p.evaluate(()=>document.querySelector('[data-tab="arena"]').click());
  await p.waitForTimeout(350);
  s=await state();
  chk('tutorial finished, bar gone', s.barOn===false && s.step>=5, JSON.stringify(s));
  chk('no tabs left pulsing', s.pulsing.length===0, s.pulsing.join());

  /* real loot badges still work after the tutorial has used its own class */
  const alertOk = await p.evaluate(()=>{ markAlert();
    return document.querySelector('[data-tab="pBag"]').classList.contains('alert'); });
  chk('markAlert still works', alertOk===true);

  /* survives a reload */
  await p.reload({waitUntil:'load'});
  await p.waitForTimeout(2500);
  const after=await p.evaluate(()=>({step:S.tut,
    barOn:document.getElementById('tutBar').classList.contains('on')}));
  chk('stays finished after reload', after.step>=5 && after.barOn===false, JSON.stringify(after));

  /* and the dismiss button kills it outright from step 0 */
  const p2=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  await p2.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
  await p2.waitForSelector('[data-cls="melee"]',{timeout:25000});
  await p2.click('[data-cls="melee"]');
  await p2.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:25000});
  await p2.waitForTimeout(800);
  await p2.evaluate(()=>{ localStorage.removeItem(SAVE_KEY); S.tut=0; tutSync(); });
  await p2.waitForTimeout(250);
  const before2=await p2.evaluate(()=>document.getElementById('tutBar').classList.contains('on'));
  await p2.evaluate(()=>document.getElementById('tutX').click());
  await p2.waitForTimeout(300);
  const after2=await p2.evaluate(()=>({on:document.getElementById('tutBar').classList.contains('on'), step:S.tut}));
  chk('dismiss hides it immediately', before2===true && after2.on===false, JSON.stringify(after2));

  console.log('=== TUTORIAL ===');
  let pass=0; for(const t of T){ console.log(`  ${t.pass?'PASS':'FAIL'}  ${t.n}${t.pass?'':'   <- '+t.d}`); if(t.pass)pass++; }
  console.log(`\n${pass}/${T.length} passed | js errors: ${errs.length}`);
  errs.slice(0,4).forEach(e=>console.log('  '+e));
  await b.close();
})();
