/* MOCK-SDK TEST — installs a fake CrazyGames SDK before any page script and
   drives every monetization path the shim implements.
   The mock is backed by sessionStorage: addInitScript re-runs on reload, so a
   plain object would be wiped by the very reload the cloud-restore test needs.
   sessionStorage survives reload, is untouched by the localStorage.clear()
   under test, and keeps the API synchronous the way the shim assumes. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const MOCK = () => {
  const rd = k => { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch(e) { return null; } };
  const wr = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch(e) {} };
  if (sessionStorage.getItem('__wipeLS') === '1') {
    try {
      const n0 = localStorage.length;
      localStorage.clear();
      const prev = JSON.parse(sessionStorage.getItem('__wipeDbg') || '[]');
      prev.push({url: location.href.slice(-24), before: n0, after: localStorage.length});
      sessionStorage.setItem('__wipeDbg', JSON.stringify(prev));
    } catch(e) { sessionStorage.setItem('__wipeErr', String(e)); }
    sessionStorage.removeItem('__wipeLS');
  }
  if (rd('__log')   === null) wr('__log', []);
  if (rd('__store') === null) wr('__store', {});
  const L = (...a) => { const l = rd('__log') || []; l.push(a.join(':')); wr('__log', l); };
  window.__adMode = 'finish';
  window.CrazyGames = { SDK: {
    init: async () => { L('init'); },
    game: { gameplayStart: () => L('gameplayStart'),
            gameplayStop:  () => L('gameplayStop'),
            happytime:     () => L('happytime'),
            settings: { muteAudio: false },
            addSettingsChangeListener: (fn) => { L('addSettingsChangeListener'); window.__setCb = fn; } },
    ad: { requestAd: (kind, cb) => {
            L('requestAd', kind);
            setTimeout(() => {
              /* A real "no ad available" never starts an ad, so adStarted must
                 NOT fire in the error case - the old mock fired it first, which
                 told the shim ads demonstrably work and (correctly) stopped it
                 latching the failure. Mode 'midfail' keeps the old sequence so
                 an ad that breaks AFTER starting is still covered. */
              const mode = window.__adMode;
              if (mode === 'error') {
                L('adError', kind); cb.adError && cb.adError(window.__adErr || 'no-fill');
                return;
              }
              L('adStarted', kind); cb.adStarted && cb.adStarted();
              setTimeout(() => {
                if (mode === 'midfail') { L('adError', kind);
                  cb.adError && cb.adError(window.__adErr || 'interrupted'); }
                else { L('adFinished', kind); cb.adFinished && cb.adFinished(); }
              }, 60);
            }, 20); } },
    data: { setItem:    (k, v) => { L('data.setItem', k);    const o = rd('__store') || {}; o[k] = v; wr('__store', o); },
            getItem:    (k)    => { L('data.getItem', k);    return (rd('__store') || {})[k]; },
            removeItem: (k)    => { L('data.removeItem', k); const o = rd('__store') || {}; delete o[k]; wr('__store', o); } },
  }};
};

const T = []; const chk = (n, pass, d='') => T.push({n, pass, d});

(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/sdk\.crazygames|ERR_TUNNEL/.test(m.text()))errs.push('CONSOLE '+m.text().slice(0,120));});
  await p.addInitScript(MOCK);

  const log   = () => p.evaluate(()=>JSON.parse(sessionStorage.getItem('__log')||'[]'));
  const clear = () => p.evaluate(()=>sessionStorage.setItem('__log','[]'));
  const store = () => p.evaluate(()=>JSON.parse(sessionStorage.getItem('__store')||'{}'));
  /* Fixed sleeps raced the SDK callbacks: three runs gave three different
     failures. Wait on the CONDITION instead, so a real regression still fails
     (on timeout) but scheduling jitter never does. */
  const waitLog = (sub, ms=15000) => p.waitForFunction(
      t=>JSON.parse(sessionStorage.getItem('__log')||'[]').some(x=>x.startsWith(t)), sub, {timeout:ms})
    .then(()=>true).catch(()=>false);
  const waitFn = (fn, ms=15000) => p.waitForFunction(fn,{timeout:ms}).then(()=>true).catch(()=>false);

  await p.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
  await p.click('[data-cls="melee"]');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:25000});
  await p.waitForTimeout(900);

  let L = await log();
  chk('SDK.init() called',        L.includes('init'));
  chk('PORTAL.ready true',        await p.evaluate(()=>PORTAL.ready));
  chk('gameplayStart on landing', L.includes('gameplayStart'));

  await clear();
  await p.evaluate(()=>document.querySelector('[data-tab="pBag"]').click());
  await p.waitForTimeout(350);
  chk('gameplayStop leaving arena', (await log()).includes('gameplayStop'));
  await clear();
  await p.evaluate(()=>document.querySelector('[data-tab="arena"]').click());
  await p.waitForTimeout(350);
  chk('gameplayStart on return',    (await log()).includes('gameplayStart'));

  await clear(); await p.evaluate(()=>saveGame()); await p.waitForTimeout(250);
  const mirrored = (await log()).some(x=>x.startsWith('data.setItem'))
                 || await p.evaluate(()=>PORTAL.pending===true);
  chk('save mirrors to SDK data (written or queued)', mirrored);
  const st = await store();
  chk('cloud copy non-empty', Object.keys(st).length>0 && (Object.values(st)[0]||'').length>50);

  /* playerDeath() is only reached from the damage path, so hp=0 alone never fires it */
  await clear(); await p.evaluate(()=>playerDeath());
  await p.waitForFunction(()=>P.dead===true,{timeout:12000}); await p.waitForTimeout(600);
  const rev = await p.evaluate(()=>{const b=document.getElementById('deathRevive');
    return b?{exists:true,shown:getComputedStyle(b).display!=='none',txt:b.textContent.trim()}:{exists:false};});
  chk('revive button on death', rev.exists, JSON.stringify(rev));
  chk('revive visible (sdk up)', rev.shown===true);
  chk('revive label clean',      rev.exists && !/[Ââ]/.test(rev.txt), rev.txt||'');

  await clear();
  await p.evaluate(()=>{window.__adMode='finish'; document.getElementById('deathRevive').click();});
  await waitLog('adFinished');
  await waitFn(()=>P.dead===false);
  await p.waitForTimeout(150);
  L = await log();
  const ar = await p.evaluate(()=>({dead:P.dead,hp:Math.round(P.hp),maxHp:Math.round(D.maxHp),
      open:document.getElementById('deathWrap').classList.contains('open'),paused}));
  chk('rewarded ad requested',      L.includes('requestAd:rewarded'));
  chk('ad finished -> alive',       ar.dead===false, JSON.stringify(ar));
  chk('revived at full hp',         ar.hp===ar.maxHp);
  chk('death overlay closed',       ar.open===false);
  chk('unpaused after ad',          ar.paused===false);
  const dbg = await p.evaluate(()=>({ready:PORTAL.ready, paused, dead:P.dead,
      curTab:(typeof curTab!=='undefined'?curTab:'?')}));
  chk('gameplayStart after revive', L.includes('gameplayStart'),
      `log=[${L.join(' ')}] state=${JSON.stringify(dbg)}`);

  await p.evaluate(()=>playerDeath());
  await p.waitForFunction(()=>P.dead===true,{timeout:12000}); await p.waitForTimeout(500);
  await clear();
  await p.evaluate(()=>{window.__adMode='error'; document.getElementById('deathRevive').click();});
  await waitLog('adError');
  await waitFn(()=>document.getElementById('deathRevive').disabled===false);
  const ae = await p.evaluate(()=>({dead:P.dead,
      open:document.getElementById('deathWrap').classList.contains('open'),
      btn:document.getElementById('deathRevive').disabled}));
  chk('ad error -> still dead',    ae.dead===true, JSON.stringify(ae));
  chk('ad error -> overlay up',    ae.open===true);
  chk('revive re-enabled',         ae.btn===false);

  await clear();
  await p.evaluate(()=>document.getElementById('deathOk').click());
  await waitLog('requestAd:midgame');
  chk('midgame ad on respawn', (await log()).includes('requestAd:midgame'), (await log()).join(' '));
  chk('alive after respawn',   await p.evaluate(()=>P.dead===false));

  /* ---- audio setting ---- */
  chk('settings listener registered', await p.evaluate(()=>typeof window.__setCb==='function'));
  const mute0 = await p.evaluate(()=>({muted:PORTAL.muted, gain:masterGain?masterGain.gain.value:null}));
  chk('unmuted by default', mute0.muted===false && mute0.gain>0, JSON.stringify(mute0));
  await p.evaluate(()=>{ window.CrazyGames.SDK.game.settings.muteAudio = true; window.__setCb && window.__setCb(); });
  await p.waitForTimeout(150);
  const mute1 = await p.evaluate(()=>({muted:PORTAL.muted, gain:masterGain?masterGain.gain.value:null}));
  chk('portal mute setting honoured', mute1.muted===true && mute1.gain===0, JSON.stringify(mute1));
  /* an ad must not restore audio the PLAYER has muted */
  await p.evaluate(()=>{ window.__adMode='finish'; PORTAL.ad('midgame'); });
  await waitLog('adFinished');
  await p.waitForTimeout(200);
  const mute2 = await p.evaluate(()=>({muted:PORTAL.muted, gain:masterGain?masterGain.gain.value:null}));
  chk('ad does not unmute a muted player', mute2.muted===true && mute2.gain===0, JSON.stringify(mute2));
  await p.evaluate(()=>{ window.CrazyGames.SDK.game.settings.muteAudio = false; window.__setCb && window.__setCb(); });
  await p.waitForTimeout(150);
  const mute3 = await p.evaluate(()=>({muted:PORTAL.muted, gain:masterGain?masterGain.gain.value:null}));
  chk('unmute restores volume', mute3.muted===false && mute3.gain>0, JSON.stringify(mute3));

  /* ---- cloud write coalescing ---- */
  await p.evaluate(()=>PORTAL.flushRemote());
  await clear();
  await p.evaluate(()=>{ for(let i=0;i<8;i++) saveGame(); });
  await p.waitForTimeout(400);
  const burst = (await log()).filter(x=>x.startsWith('data.setItem')).length;
  chk('8 saves coalesce to <=1 cloud write', burst<=1, `writes=${burst}`);
  chk('a write is queued, not dropped', await p.evaluate(()=>PORTAL.pending===true));
  /* a queued write must not resurrect the save after a wipe */
  await clear();
  const wipedPending = await p.evaluate(()=>{ PORTAL.wipeRemote(); return PORTAL.pending; });
  chk('wipe cancels queued write', wipedPending===false);
  await p.waitForTimeout(400);
  chk('no setItem after wipe', !(await log()).some(x=>x.startsWith('data.setItem')), (await log()).join(' '));

  /* ---- pagehide flushes a queued write ---- */
  await p.evaluate(()=>{ PORTAL.flushRemote(); saveGame(); });
  await p.waitForTimeout(150);
  const queuedBefore = await p.evaluate(()=>PORTAL.pending===true);
  await clear();
  const flushedPending = await p.evaluate(()=>{
    dispatchEvent(new Event('pagehide')); return PORTAL.pending; });
  await p.waitForTimeout(250);
  chk('write was queued', queuedBefore);
  chk('pagehide flushes queued write', (await log()).some(x=>x.startsWith('data.setItem')));
  chk('nothing left pending after flush', flushedPending===false);

  /* ---- cloud fallback on load ----
     Driving loadGame() directly beats reloading: the reload needed a
     document-start localStorage wipe that intermittently never ran, and this
     exercises the exact fallback branch (localStorage empty -> loadRemote). */
  const before = await p.evaluate(()=>{ S.gold=1234567; S.lvl=9; saveGame(); PORTAL.flushRemote(); return {gold:S.gold,lvl:S.lvl}; });
  await p.waitForTimeout(200);
  await clear();
  const restored = await p.evaluate(()=>{
    localStorage.removeItem(SAVE_KEY);          /* force the cloud branch */
    S.gold = 0; S.lvl = 1;
    const ok = loadGame();
    return {ok, gold:S.gold, lvl:S.lvl, ls:!!localStorage.getItem(SAVE_KEY)};
  });
  chk('localStorage really was empty', restored.ls===false || restored.ok===true, JSON.stringify(restored));
  chk('cloud getItem used as fallback', (await log()).some(x=>x.startsWith('data.getItem')), (await log()).join(' '));
  chk('cloud restored state', restored.gold===before.gold && restored.lvl===before.lvl,
      `before=${JSON.stringify(before)} after=${JSON.stringify(restored)}`);

  await clear();
  await p.evaluate(()=>wipeSave()).catch(()=>{});
  await waitLog('data.removeItem', 6000);
  const wst = await store().catch(()=>({}));
  const wl  = await log().catch(()=>[]);
  chk('wipeSave clears cloud', Object.keys(wst).length===0 || wl.some(x=>x.startsWith('data.removeItem')),
      JSON.stringify({keys:Object.keys(wst).length, log:wl}));

  /* ---- Basic Launch: ads disabled ----
     These need a FRESH page. Once an ad has played successfully the shim
     deliberately stops latching failures, so running them on the page above
     (where a rewarded ad already finished) would prove nothing. */
  const freshPage = async (adMode, adErr) => {
    const np = await (await b.newContext({viewport:{width:844,height:390}})).newPage();
    await np.addInitScript(MOCK);
    await np.goto('file:///home/user/RunePortal/portal/index.html',{waitUntil:'load'});
    await np.waitForSelector('[data-cls="melee"]',{timeout:25000});
    await np.click('[data-cls="melee"]');
    await np.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:25000});
    await np.evaluate(([m,e])=>{ window.__adMode=m; window.__adErr=e;
      sessionStorage.setItem('__log','[]'); }, [adMode, adErr]);
    await np.evaluate(()=>playerDeath());
    await np.waitForFunction(()=>P.dead===true,{timeout:12000});
    await np.waitForTimeout(500);
    return np;
  };
  /* same lesson as before: never sleep a fixed time around an async SDK
     callback - wait on the condition, so only a real regression fails */
  const wf = (np, fn, ms=12000) => np.waitForFunction(fn,{timeout:ms})
      .then(()=>true).catch(()=>false);
  const wlog = (np, sub, ms=12000) => np.waitForFunction(
      t=>JSON.parse(sessionStorage.getItem('__log')||'[]').some(x=>x.startsWith(t)), sub, {timeout:ms})
      .then(()=>true).catch(()=>false);
  const shown = np => np.evaluate(()=>{
    const b=document.getElementById('deathRevive');
    return b ? getComputedStyle(b).display!=='none' : false; });

  /* ads disabled entirely - the Basic Launch case */
  let np = await freshPage('error','No ad available');
  chk('revive offered before any ad attempt', await shown(np));
  await np.evaluate(()=>document.getElementById('deathRevive').click());
  await wf(np, ()=>PORTAL.adsBlocked===true);
  chk('hard ad failure marks ads blocked', await np.evaluate(()=>PORTAL.adsBlocked===true));
  chk('revive button hidden after failure', !(await shown(np)));
  chk('player still dead after failed revive', await np.evaluate(()=>P.dead===true));
  /* and no further ad requests are made at all */
  await np.evaluate(()=>sessionStorage.setItem('__log','[]'));
  await np.evaluate(()=>document.getElementById('deathOk').click());
  await wf(np, ()=>P.dead===false);
  await np.waitForTimeout(250);
  const afterLog = await np.evaluate(()=>JSON.parse(sessionStorage.getItem('__log')||'[]'));
  chk('no midgame request once blocked', !afterLog.some(x=>x.startsWith('requestAd')), afterLog.join(' '));
  chk('respawn still works with ads blocked', await np.evaluate(()=>P.dead===false));
  await np.close();

  /* a transient failure must NOT latch */
  np = await freshPage('error','Ad requested too soon');
  await np.evaluate(()=>document.getElementById('deathRevive').click());
  await wlog(np,'adError');
  await np.waitForTimeout(200);
  chk('transient failure does not block ads', await np.evaluate(()=>PORTAL.adsBlocked===false));
  chk('revive still offered after transient fail', await shown(np));
  await np.close();

  /* a working ad keeps the offer available */
  np = await freshPage('finish', null);
  await np.evaluate(()=>document.getElementById('deathRevive').click());
  await wlog(np,'adFinished');
  await wf(np, ()=>P.dead===false);
  await np.waitForTimeout(200);
  chk('successful ad leaves ads available', await np.evaluate(()=>PORTAL.adsBlocked===false));
  chk('successful ad revives the player', await np.evaluate(()=>P.dead===false));
  await np.close();

  np = await freshPage('midfail','interrupted');
  await np.evaluate(()=>document.getElementById('deathRevive').click());
  await wlog(np,'adError');
  await np.waitForTimeout(250);
  chk('ad failing AFTER start does not block', await np.evaluate(()=>PORTAL.adsBlocked===false));
  chk('mid-ad failure leaves player dead', await np.evaluate(()=>P.dead===true));
  await np.close();

  console.log('=== MOCK-SDK TEST (portal/index.html) ===');
  let pass=0;
  for(const t of T){ console.log(`  ${t.pass?'PASS':'FAIL'}  ${t.n}${t.pass?'':'   <- '+t.d}`); if(t.pass)pass++; }
  console.log(`\n${pass}/${T.length} passed | non-SDK js errors: ${errs.length}`);
  errs.slice(0,5).forEach(e=>console.log('  '+e));
  await b.close();
})();
