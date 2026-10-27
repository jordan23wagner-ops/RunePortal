/* Mock Playgama Bridge. Deliberately async storage and event-driven ads,
   because those are exactly where a port of the CrazyGames shim breaks. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const MOCK = () => {
  const rd=k=>{try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch(e){return null;}};
  const wr=(k,v)=>{try{sessionStorage.setItem(k,JSON.stringify(v));}catch(e){}};
  if(rd('__log')===null) wr('__log',[]);
  if(rd('__cloud')===null) wr('__cloud',{});
  const L=(...a)=>{const l=rd('__log')||[];l.push(a.join(':'));wr('__log',l);};
  const H={};
  const on=(n,f)=>{(H[n]=H[n]||[]).push(f); L('on',n);};
  const fire=(n,...a)=>{(H[n]||[]).forEach(f=>f(...a));};
  window.__fire=fire;
  window.__adPlan='reward';     /* reward | noreward | fail | silent */
  window.bridge = {
    initialize: async ()=>{ L('initialize'); },
    platform: {
      on, isPlatformAudioEnabled: true, isPlatformPaused: false,
      sendMessage: async m => { L('msg', m); },
    },
    advertisement: {
      on,
      showRewarded: ()=>{ L('showRewarded'); runAd('rewarded'); },
      showInterstitial: ()=>{ L('showInterstitial'); runAd('interstitial'); },
    },
    storage: {
      get:    async k => { L('storage.get',k);    return (rd('__cloud')||{})[k]; },
      set:    async (k,v)=>{ L('storage.set',k);  const c=rd('__cloud')||{}; c[k]=v; wr('__cloud',c); },
      delete: async k => { L('storage.delete',k); const c=rd('__cloud')||{}; delete c[k]; wr('__cloud',c); },
    },
  };
  function runAd(kind){
    const plan=window.__adPlan, ev=kind+'_state_changed';
    if(plan==='silent') return;                       /* platform never answers */
    if(plan==='fail'){ setTimeout(()=>fire(ev,'failed'),20); return; }
    setTimeout(()=>{
      fire(ev,'opened');
      setTimeout(()=>{
        if(kind==='rewarded' && plan==='reward') fire(ev,'rewarded');
        fire(ev,'closed');
      },50);
    },20);
  }
};

const T=[]; const chk=(n,p,d='')=>T.push({n,pass:p,d});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const mk = async (seedCloud)=>{
    const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();
    await p.addInitScript(MOCK);
    if(seedCloud) await p.addInitScript(v=>{
      sessionStorage.setItem('__cloud', JSON.stringify({'riftfall_save': v}));
    }, seedCloud);
    await p.goto('file:///home/user/RunePortal/playgama/index.html',{waitUntil:'load'});
    /* With a cloud save seeded, init restores it and boot skips the intro
       entirely - so the class picker never appears. That is the restore
       working, not a failure. */
    if(seedCloud){
      await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:30000});
    } else {
      await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
      await p.click('[data-cls="melee"]');
      await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:25000});
    }
    await p.waitForTimeout(800);
    return p;
  };
  const log=p=>p.evaluate(()=>JSON.parse(sessionStorage.getItem('__log')||'[]'));
  const clr=p=>p.evaluate(()=>sessionStorage.setItem('__log','[]'));
  const wait=(p,fn,ms=9000)=>p.waitForFunction(fn,{timeout:ms}).then(()=>true).catch(()=>false);

  let p=await mk(null); let L=await log(p);
  chk('bridge.initialize() called', L.includes('initialize'));
  chk('PORTAL.ready', await p.evaluate(()=>PORTAL.ready===true));
  chk('game_ready sent', L.includes('msg:game_ready'));
  chk('gameplay_started on landing', L.includes('msg:gameplay_started'));
  chk('listeners registered', L.includes('on:rewarded_state_changed') && L.includes('on:audio_state_changed'));

  await clr(p);
  await p.evaluate(()=>document.querySelector('[data-tab="pBag"]').click());
  await p.waitForTimeout(300);
  chk('gameplay_stopped leaving arena', (await log(p)).includes('msg:gameplay_stopped'));
  await p.evaluate(()=>document.querySelector('[data-tab="arena"]').click());
  await p.waitForTimeout(300);
  chk('gameplay_started on return', (await log(p)).includes('msg:gameplay_started'));

  await clr(p); await p.evaluate(()=>saveGame());
  await wait(p, ()=>JSON.parse(sessionStorage.getItem('__log')||'[]').some(x=>x.startsWith('storage.set')));
  chk('save mirrors to storage.set', (await log(p)).some(x=>x.startsWith('storage.set')));

  /* audio switch */
  await p.evaluate(()=>{ bridge.platform.isPlatformAudioEnabled=false; window.__fire('audio_state_changed'); });
  await p.waitForTimeout(200);
  chk('platform mute honoured', await p.evaluate(()=>masterGain && masterGain.gain.value===0));
  await p.evaluate(()=>{ bridge.platform.isPlatformAudioEnabled=true; window.__fire('audio_state_changed'); });
  await p.waitForTimeout(200);
  chk('unmute restores', await p.evaluate(()=>masterGain && masterGain.gain.value>0));

  /* rewarded ad that pays out */
  await p.evaluate(()=>{ window.__adPlan='reward'; playerDeath(); });
  await wait(p, ()=>P.dead===true);
  await p.waitForTimeout(400);
  await clr(p);
  await p.evaluate(()=>document.getElementById('deathRevive').click());
  await wait(p, ()=>P.dead===false);
  chk('rewarded ad revives', await p.evaluate(()=>P.dead===false));
  chk('showRewarded called', (await log(p)).includes('showRewarded'));
  await p.close();

  /* closed WITHOUT reward must not revive */
  p=await mk(null);
  await p.evaluate(()=>{ window.__adPlan='noreward'; playerDeath(); });
  await wait(p, ()=>P.dead===true); await p.waitForTimeout(400);
  await p.evaluate(()=>document.getElementById('deathRevive').click());
  await p.waitForTimeout(1200);
  chk('no reward -> still dead', await p.evaluate(()=>P.dead===true));
  await p.close();

  /* hard failure blocks the offer */
  p=await mk(null);
  await p.evaluate(()=>{ window.__adPlan='fail'; playerDeath(); });
  await wait(p, ()=>P.dead===true); await p.waitForTimeout(400);
  await p.evaluate(()=>document.getElementById('deathRevive').click());
  await wait(p, ()=>PORTAL.adsBlocked===true);
  chk('failed ad blocks ads', await p.evaluate(()=>PORTAL.adsBlocked===true));
  chk('revive hidden after failure', await p.evaluate(()=>{
    const b=document.getElementById('deathRevive'); return getComputedStyle(b).display==='none'; }));
  await p.close();

  /* a platform that never answers must not strand the player */
  p=await mk(null);
  await p.evaluate(()=>{ window.__adPlan='silent'; playerDeath(); });
  await wait(p, ()=>P.dead===true); await p.waitForTimeout(400);
  await p.evaluate(()=>document.getElementById('deathRevive').click());
  const freed = await wait(p, ()=>PORTAL.pending===false, 12000);
  chk('silent platform settles via timeout', freed);
  chk('still playable after silent ad', await p.evaluate(()=>running===true));
  await p.close();

  /* ASYNC cloud restore: seeded into localStorage before boot reads it */
  const save = JSON.stringify({s:{ver:undefined},uid:1});
  p=await mk(null);
  const realSave = await p.evaluate(()=>{ S.gold=777777; S.lvl=12; saveGame();
    return localStorage.getItem(SAVE_KEY); });
  await p.close();
  p=await mk(realSave);
  await p.waitForTimeout(600);
  const restored = await p.evaluate(()=>({gold:S.gold, lvl:S.lvl,
    got:JSON.parse(sessionStorage.getItem('__log')||'[]').some(x=>x.startsWith('storage.get'))}));
  chk('storage.get read at init', restored.got, JSON.stringify(restored));
  chk('async cloud save restored', restored.gold===777777 && restored.lvl===12, JSON.stringify(restored));

  /* wipeSave() ends in location.reload(), so anything asserted after it reads
     the POST-reload log. Assert the cloud delete directly instead - that is
     the behaviour under test - then confirm the key really left the store. */
  await clr(p);
  await p.evaluate(()=>PORTAL.wipeRemote());
  await wait(p, ()=>JSON.parse(sessionStorage.getItem('__log')||'[]').some(x=>x.startsWith('storage.delete')));
  const wl = await log(p).catch(()=>[]);
  chk('wipeRemote deletes cloud copy', wl.some(x=>x.startsWith('storage.delete')), wl.join(' '));
  const gone = await p.evaluate(async()=>{
    await new Promise(r=>setTimeout(r,150));
    return !(JSON.parse(sessionStorage.getItem('__cloud')||'{}')['riftfall_save']); });
  chk('cloud key actually removed', gone===true);
  await p.close();

  console.log('=== PLAYGAMA BRIDGE ===');
  let pass=0; for(const t of T){ console.log(`  ${t.pass?'PASS':'FAIL'}  ${t.n}${t.pass?'':'   <- '+t.d}`); if(t.pass)pass++; }
  console.log(`\n${pass}/${T.length} passed`);
  await b.close();
})();
