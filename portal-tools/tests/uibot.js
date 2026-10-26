/* UI CLICK BOT — exercises button wiring and menu rendering, the gap the
   function-level probes could not reach. Clicks via el.click() in-page so the
   delegated handlers fire without hit-testing; layout/clipping was already
   asserted separately in the viewport matrix. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const PANELS = ['arena','pBag','pGear','pSkill','pCraft','pZone','pMenu'];
/* every delegated dataset found in source, minus the destructive ones */
const SAFE = ['act','buy','cact','charm','ct','forge','gfx','mvol','opt','pool',
              'ringslot','sel','sk','sktake','stat','step','unattune','gt'];
const SAFE_BTN = ['btnSortBag','btnAutoSalvage','btnRespec'];
/* data-dev  test-only;  data-mode / btnWipe|Export|Import|Update|Restore|Clone
   reload the page, open a file dialog, or destroy the save */
const SKIP = ['dev','mode','zone','seal'];

(async()=>{
  const funded = process.argv[2]==='funded';
  const url = 'file:///home/user/RunePortal/zonelooter3d.html' + (funded?'?test':'?live');
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text().slice(0,160));});

  await p.goto(url,{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:20000});
  await p.click('[data-cls="melee"]'); await p.click('#startBtn');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:20000});
  await p.waitForTimeout(800);

  if(funded){
    /* fund + level so purchase/upgrade/respec paths actually execute instead
       of bouncing off "cannot afford" */
    await p.evaluate(()=>{
      if(typeof devRiches==='function') devRiches();
      if(typeof devSetLevel==='function') devSetLevel(30);
      S.gold = 50_000_000;
      for(const k in S.mats) S.mats[k] = 9999;
      S.sp = (S.sp||0) + 40;
      for(const _z of ZONES) S.open[_z.id]=1;
      saveGame();
    });
    await p.waitForTimeout(300);
  }

  const panelReport=[], clickLog=[];
  let clicks=0;

  for(const panel of PANELS){
    const before=errs.length;
    await p.evaluate(t=>{
      const el=document.querySelector(`[data-tab="${t}"]`);
      if(el) el.click();
    }, panel);
    await p.waitForTimeout(450);

    /* did the panel actually render anything? */
    const info=await p.evaluate(t=>{
      if(t==='arena') { const a=document.getElementById('arenaWrap');
        return {vis:!!a && getComputedStyle(a).display!=='none', len:-1, clickable:0}; }
      const el=document.getElementById(t);
      if(!el) return {vis:false,len:0,clickable:0};
      const vis = getComputedStyle(el).display!=='none' && el.offsetParent!==null;
      return {vis, len:(el.innerText||'').trim().length,
              clickable:el.querySelectorAll('[data-act],[data-buy],[data-cact],[data-charm],[data-ct],[data-forge],[data-gfx],[data-mvol],[data-opt],[data-pool],[data-ringslot],[data-sel],[data-sk],[data-sktake],[data-stat],[data-step],[data-unattune],[data-gt],button').length};
    }, panel);
    panelReport.push({panel, ...info, newErrs:errs.length-before});

    if(panel==='arena') continue;

    /* click each safe dataset inside this panel, re-querying every time
       because handlers re-render the panel underneath us */
    for(const ds of SAFE){
      for(let i=0;i<6;i++){
        const did=await p.evaluate(([t,d,idx])=>{
          const panel=document.getElementById(t); if(!panel) return null;
          const list=[...panel.querySelectorAll(`[data-${d}]`)]
            .filter(e=>e.offsetParent!==null);
          if(idx>=list.length) return null;
          const el=list[idx]; const val=el.dataset[d];
          el.click(); return val===undefined?'':String(val).slice(0,24);
        },[panel,ds,i]);
        if(did===null) break;
        clicks++;
        await p.waitForTimeout(90);
        if(errs.length>0 && clickLog.length<40 && errs.length!==before)
          clickLog.push(`${panel} [data-${ds}="${did}"] -> ${errs[errs.length-1]}`);
      }
    }
    for(const id of SAFE_BTN){
      const hit=await p.evaluate(b=>{
        const el=document.getElementById(b);
        if(!el || el.offsetParent===null) return false;
        el.click(); return true;
      }, id);
      if(hit){ clicks++; await p.waitForTimeout(150); }
    }
  }

  /* zone travel + gate last: they move the player and rebuild the world */
  await p.evaluate(()=>{const e=document.querySelector('[data-tab="pZone"]'); if(e)e.click();});
  await p.waitForTimeout(400);
  const travels=await p.evaluate(async()=>{
    const out=[];
    const zs=[...document.querySelectorAll('#pZone [data-zone]')].map(e=>e.dataset.zone);
    for(const z of zs){
      const el=document.querySelector(`#pZone [data-zone="${z}"]`);
      if(!el) continue;
      el.click();
      await new Promise(r=>setTimeout(r,900));
      out.push({zone:z, now:(typeof zoneCur==='function'?zoneCur():(S.zone||'?')),
                foes:typeof foes!=='undefined'?foes.length:-1,
                hp:Math.round(P.hp)});
      const t=document.querySelector('[data-tab="pZone"]'); if(t)t.click();
      await new Promise(r=>setTimeout(r,350));
    }
    return out;
  });

  const final=await p.evaluate(()=>({build:BUILD,mode:MODE,gold:S.gold,
    lvl:S.lvl, bag:S.bag.length, hp:Math.round(P.hp), foes:foes.length,
    draws:T3.renderer.info.render.calls}));

  console.log(`\n=== UI CLICK BOT — ${funded?'FUNDED (?test)':'UNFUNDED (?live)'} ===`);
  console.log('panel    visible  textLen  clickable  newErrs');
  for(const r of panelReport)
    console.log(r.panel.padEnd(9)+String(r.vis).padEnd(9)+String(r.len).padStart(7)+
      String(r.clickable).padStart(11)+String(r.newErrs).padStart(9));
  console.log(`\nclicks fired: ${clicks}`);
  console.log('zone travel:', travels.map(t=>`${t.zone}->${t.now}(${t.foes}f)`).join(' '));
  console.log('final:', JSON.stringify(final));
  console.log(`errors: ${errs.length}`);
  for(const e of errs.slice(0,8)) console.log('  '+e);
  for(const c of clickLog.slice(0,8)) console.log('  @ '+c);
  await b.close();
})();
