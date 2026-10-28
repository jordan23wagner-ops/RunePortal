#!/usr/bin/env python3
"""Build a Playgama-ready copy of Riftfall from zonelooter3d.html.

Shares every portal-hygiene patch with make_portal.py (absolute paths, service
worker, profile UI, cross-promotion, host keys) and swaps the SDK layer, which
is NOT a port of the CrazyGames one:

  CrazyGames                        Playgama Bridge
  --------------------------------  -----------------------------------------
  SDK.init()                        bridge.initialize()
  game.gameplayStart/Stop()         platform.sendMessage('gameplay_started')
  ad.requestAd(kind, {callbacks})   advertisement.showRewarded() + events
  data.getItem()  SYNCHRONOUS       storage.get()  returns a PROMISE
  data.setItem/removeItem()         storage.set/delete()  PROMISES
  game.settings.muteAudio           platform.isPlatformAudioEnabled

The storage difference is the one that forces a rewrite rather than a port.
loadGame() is synchronous and reads localStorage, so the cloud copy is pulled
down during init and seeded into localStorage BEFORE boot runs - which leaves
loadGame's contract untouched.

Writes index.html AND playgama-bridge-config.json: Bridge loads the config
from ./playgama-bridge-config.json relative to the page.

Usage: make_playgama.py <src.html> <outdir>
"""
import sys, os, json

src_path, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "index.html")
s = open(src_path, encoding="utf-8").read()


def sub(old, new, label):
    global s
    n = s.count(old)
    assert n == 1, f"[{label}] anchor matched {n} times, expected 1"
    s = s.replace(old, new)
    print("ok", label)


# 1. Bridge from CDN, and drop the PWA head links
sub(
    "<title>RIFTFALL</title>",
    '<title>RIFTFALL</title>\n<script src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script>',
    "bridge tag",
)
# absolute-path tags 404 under a portal mount; the game needs none of them
sub('<link rel="manifest" href="/manifest.webmanifest">\n', "", "drop manifest link")
sub('<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n', "", "drop apple-touch-icon link")
sub('<link rel="icon" type="image/png" sizes="64x64" href="/favicon-64.png">\n', "", "drop favicon link")

# 2. Service worker off (portal hosts the files; a SW would fight its cache)
sub(
    "if('serviceWorker' in navigator && location.protocol.startsWith('http')){",
    "if(false){ /* portal build: no service worker */",
    "sw off",
)

# 3. Strip PWA / profile-switch / export-import UI. The markup is wrapped in a
#    display:none div instead of deleted, because the menu code binds listeners
#    to these ids and a null lookup would throw.
sub(
    "  h += '<div class=\"sectionLbl\">Profile</div>'+\n    '<div class=\"modeRow\">'+",
    "  h += '<div style=\"display:none\"><div class=\"sectionLbl\">Profile</div>'+\n    '<div class=\"modeRow\">'+",
    "profile wrap open",
)
sub(
    "      'Copy Live → Test (overwrites test)</button>';",
    "      'Copy Live → Test (overwrites test)</button></div>';",
    "profile wrap close",
)
sub(
    "    '<button class=\"btn sm\" id=\"btnUpdate\" style=\"width:100%;margin-top:8px;\">'+",
    "    '<div style=\"display:none\"><button class=\"btn sm\" id=\"btnUpdate\" style=\"width:100%;margin-top:8px;\">'+",
    "update wrap open",
)
sub(
    "      'Export before clearing site data, or to move a character between your phone and desktop.</div>'+",
    "      'Export before clearing site data, or to move a character between your phone and desktop.</div></div>'+",
    "update wrap close",
)

# 3b. Profile is always LIVE in a portal (a portal can append ?test or ?dev to the URL)
sub(
    "const MODE     = resolveMode();",
    "const MODE     = 'live'; /* portal build: profile switching is not exposed */",
    "force live",
)

# 3c. Browser storage / reload surface that is hostile inside an iframe
sub(
    "if(navigator.storage && navigator.storage.persist){",
    "if(false){ /* portal build: no storage.persist */",
    "storage persist off",
)

# 3d. Cross-promotion text (portals reject references to other properties)
sub(
    "RIFTFALL · independent of RunePortal<br>",
    "RIFTFALL<br>",
    "cross-promo text",
)

# 3e. Host-page keys: arrows scroll the host page and Tab walks focus out of the game
sub(
    "window.addEventListener('keydown',e=>{\n  keys[e.key.toLowerCase()]=1;",
    "window.addEventListener('keydown',e=>{\n  if((e.key==='Tab' || e.key.indexOf('Arrow')===0) && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||'')) e.preventDefault();\n  keys[e.key.toLowerCase()]=1;",
    "keys preventDefault",
)

# (D3 graphics-downgrade timing is fixed in zonelooter3d.html itself, commit d3b05e2,
#  so the portal build inherits it and needs no patch.)

# 3g. 'Delete Save' must also clear the cloud copy, or the next load restores it
sub(
    "function wipeSave(){ lsDel(SAVE_KEY); location.reload(); }",
    "function wipeSave(){ lsDel(SAVE_KEY); if(typeof PORTAL!=='undefined') PORTAL.wipeRemote(); location.reload(); }",
    "wipe clears cloud",
)

# 4. Playgama shim, inserted just before the boot section
SHIM = r"""
/* ================================================================
   PORTAL — Playgama Bridge glue (Playgama build only)
   Deliberately exposes the same surface as the other portal shim, so every
   hook below this point is identical across builds - but the SDK underneath
   is event-driven and its storage is asynchronous, which is why this is a
   rewrite rather than a port. Every call is guarded, so the file still runs
   standalone with no SDK at all.
   ================================================================ */
const PORTAL = (()=>{
  const B = ()=> window.bridge || null;
  let ready = false, playing = false, adBusy = false;

  /* masterGain is written once at audio init and never again, so it is a safe
     single mute point. Two things can mute: an ad, and the platform's own
     audio switch. Track them apart or they clobber each other. */
  let adMuted = false, setMuted = false;
  function applyAudio(){
    /* report the reason; the game owns masterGain and folds this in with the
       player's own switch and the backgrounded tab */
    try{ if(typeof setExtMute === 'function') setExtMute(adMuted || setMuted); }catch(e){}
  }
  function readSettings(){
    try{
      const b = B();
      if(b && b.platform) setMuted = (b.platform.isPlatformAudioEnabled === false);
    }catch(e){}
    applyAudio();
  }

  /* Ads are disabled or unfilled on some platforms, and the rewarded revive
     must not sit there offering something it cannot deliver. First hard
     failure before any ad has played marks ads unavailable for the session. */
  let adsBlocked = false, adEverShown = false;
  function markAdFailure(){
    if(adEverShown) return;
    adsBlocked = true;
    const b = document.getElementById('deathRevive');
    if(b) b.style.display = 'none';
    try{ toast('Ads unavailable right now'); }catch(e){}
  }

  function msg(m){ try{ B().platform.sendMessage(m); }catch(e){} }

  /* Bridge reports ad progress through events rather than callbacks, so the
     in-flight request is held here and resolved when a terminal state lands. */
  let pending = null;            /* {kind, done, started} */
  function settle(ok, hard){
    if(!pending) return;
    const p = pending; pending = null;
    adBusy = false;
    adMuted = false; applyAudio();
    paused = p.wasPaused;
    if(hard && !p.started) markAdFailure();
    p.done(ok);
  }
  function onAdState(kind){
    return state => {
      if(!pending || pending.kind !== kind) return;
      if(state === 'opened'){
        pending.started = true; adEverShown = true; adsBlocked = false;
        paused = true; adMuted = true; applyAudio();
      }
      else if(state === 'rewarded') pending.reward = true;
      else if(state === 'closed')   settle(kind === 'rewarded' ? !!pending.reward : true, false);
      else if(state === 'failed')   settle(false, true);
    };
  }

  /* The intro is live the instant it is drawn, so a player can pick a class
     while the cloud read is still in flight. That writes a brand new level-1
     save to localStorage, which then shadows the cloud copy and gets flushed
     over it. Hold the class buttons until the read settles. */
  function introLock(on){
    try{
      document.querySelectorAll('[data-cls]').forEach(b=>{
        b.disabled = on; b.style.opacity = on ? '.5' : '';
        b.style.pointerEvents = on ? 'none' : '';
      });
    }catch(e){}
  }
  function stamp(raw){
    try{ const o = JSON.parse(raw); return (o && typeof o.t === 'number') ? o.t : 0; }
    catch(e){ return -1; }       /* unparseable: always lose to anything valid */
  }
  function init(){
    introLock(true); paintIntro();
    const tick = setInterval(paintIntro, 400);
    setTimeout(()=>clearInterval(tick), 20000);
    const real = (async ()=>{
      try{
        const b = B(); if(!b) return;
        await b.initialize();
        ready = true;
        flushSave();
        msg('game_ready');
        /* Storage is ASYNC here. loadGame() is synchronous and reads
           localStorage, so pull the cloud copy down and seed it BEFORE boot
           reads it - that keeps loadGame's contract untouched. Only when
           there is no local save, so a device-local run is never clobbered. */
        try{
          const res = await b.storage.get([SAVE_KEY]);
          /* tolerate either shape: the docs say an array comes back, but a
             platform that answers the scalar must not lose the save either */
          let v = Array.isArray(res) ? res[0] : res;
          /* Bridge runs tryParseJson over what storage.get returns, so a save
             written as a JSON string comes BACK as a parsed object. Testing
             typeof === 'string' threw the whole save away and reported "no
             cloud save" while the console's storage panel plainly showed it.
             Take either shape and hand loadGame() the string it expects. */
          cloudShape = (v === null || v === undefined) ? 'empty' : typeof v;
          if(v && typeof v === 'object'){
            try{ v = JSON.stringify(v); }catch(e){ v = ''; }
          }
          hadCloud = (typeof v === 'string' && !!v);
          cloudRaw = (typeof v === 'string') ? v.length : 0;
          if(typeof v === 'string' && v){
            /* Always read the cloud, and let the NEWER save win. Consulting it
               only when localStorage was empty meant any local copy shadowed
               it - including a fresh one written moments earlier on this very
               load - which is how a cloud save got replaced by a level 1. */
            const local = localStorage.getItem(SAVE_KEY);
            if(!local || stamp(v) > stamp(local)){
              localStorage.setItem(SAVE_KEY, v); seeded = true;
            }
          }
        }catch(e){ readErr = (e && e.message) || 'threw'; }
        cloudRead = true;
        flushSave();
        if(seeded && lateHook){ try{ lateHook(); }catch(e){} }
        try{
          b.platform.on('audio_state_changed', readSettings);
          b.platform.on('pause_state_changed', st => { if(st) stop(); });
          b.advertisement.on('rewarded_state_changed', onAdState('rewarded'));
          b.advertisement.on('interstitial_state_changed', onAdState('interstitial'));
        }catch(e){}
        readSettings();
      }
      catch(e){ readErr = (e && e.message) || 'threw';
                console.warn('Playgama init failed', e); }
      finally{ cloudRead = true; flushSave(); introLock(false); paintIntro(); }
    })();
    /* an ad blocker can make init hang; never let that block the game */
    return Promise.race([real, new Promise(r=>setTimeout(r, 6000))])
      .then(()=>{ introLock(false); paintIntro(); });
  }

  function start(){
    if(!ready || playing || adBusy) return;
    playing = true; msg('gameplay_started');
  }
  function stop(){
    if(!ready || !playing) return;
    playing = false; msg('gameplay_stopped');
  }
  function tab(t){ if(t==='arena' && S && P && !P.dead) start(); else stop(); }

  /* kind: 'midgame' | 'rewarded'. done(ok): ok=true when a reward was earned. */
  function ad(kind, done){
    done = done || function(){};
    if(!ready || adBusy || adsBlocked){ done(false); return; }
    const want = (kind === 'rewarded') ? 'rewarded' : 'interstitial';
    adBusy = true;
    pending = {kind:want, done, started:false, reward:false, wasPaused:paused};
    stop();
    try{
      if(want === 'rewarded') B().advertisement.showRewarded();
      else                    B().advertisement.showInterstitial();
    }catch(e){ settle(false, true); return; }
    /* a platform that never answers must not strand the player */
    setTimeout(()=>{ if(pending && pending.kind===want && !pending.started) settle(false, true); }, 8000);
  }

  /* cloud saves: promises, and deliberately unawaited - a save must never
     block a frame, and localStorage already holds the authoritative copy */
  /* A save must never reach the cloud before the initial read has settled.
     init() races a 3.5s timeout so an ad blocker cannot hang boot, and when
     that timeout wins, loadGame() starts a FRESH save - writing that out
     would overwrite the player's real cloud save with an empty one. Hold the
     newest save until the read is done, then flush it. */
  let cloudRead = false, queuedSave = null, lateHook = null, seeded = false;
  let lastWrite = 0, writeErr = '', readErr = '', hadCloud = false;
  let cloudRaw = -1;   /* chars the cloud answered with; 0 = nothing there */
  let cloudShape = '';  /* what the platform actually handed back */
  /* boot registers here so a cloud save that arrives after the init budget
     still gets the player into their game instead of class-select */
  function lateSave(fn){ lateHook = fn; }
  function putRemote(str){
    try{
      const p = B().storage.set([SAVE_KEY], [str]);
      if(p && p.then) p.then(()=>{ lastWrite = Date.now(); writeErr = ''; },
                             e=>{ writeErr = (e && e.message) || 'rejected'; });
      else lastWrite = Date.now();
    }catch(e){ writeErr = (e && e.message) || 'threw'; }
  }
  function flushSave(){
    if(!ready || !cloudRead || !queuedSave) return;
    const q = queuedSave; queuedSave = null; putRemote(q);
  }
  function saveRemote(str){
    /* Two reasons to hold a save rather than drop it. Before `ready` the
       Bridge cannot take it, and the player can be several minutes in by then
       on a slow platform. Before `cloudRead` the save may be a FRESH one from
       a boot that gave up waiting, and writing that out would overwrite the
       player's real cloud save with an empty one. Keep the newest either way
       and flush when both are true. */
    if(!ready || !cloudRead){ queuedSave = str; return; }
    putRemote(str);
  }
  function loadRemote(){ return null; }   /* seeded into localStorage at init */
  function wipeRemote(){
    if(!ready) return;
    try{ const p = B().storage.delete([SAVE_KEY]); if(p && p.catch) p.catch(()=>{}); }catch(e){}
  }

  /* one rewarded revive per zone. Offering it on every death makes the ad
     a condition for continuing rather than a bonus, which the checklist
     calls out by name. */
  let reviveZone = null;
  function curZone(){ try{ return (S && S.zone) || null; }catch(e){ return null; } }
  function reviveInPlace(){
    reviveZone = curZone();
    $('deathWrap').classList.remove('open');
    computeStats();
    P.dead = false; P.hp = D.maxHp; P.mp = D.maxMp; P.inv = 3.0;
    burst(P.x, P.y, '#5ed39a', 30, 240, 0.7, 3.4);
    ring(P.x, P.y, '#5ed39a', 10, 120, 0.5);
    paused = false; start();
  }
  function offerRevive(){
    stop();
    let b = document.getElementById('deathRevive');
    if(!b){
      b = document.createElement('button');
      b.id = 'deathRevive'; b.className = 'btn pri';
      b.style.cssText = 'width:100%;margin-bottom:8px;';
      b.textContent = 'Revive here  ▶  watch an ad';
      $('deathOk').parentNode.insertBefore(b, $('deathOk'));
      b.addEventListener('click', ()=>{
        b.disabled = true;
        ad('rewarded', ok=>{ b.disabled = false; if(ok) reviveInPlace(); });
      });
    }
    b.style.display = (ready && !adsBlocked && reviveZone !== curZone()) ? 'block' : 'none';
  }
  /* Surfaced in CAMP so a failed sync can be read off the screen during QA
     instead of inferred from a lost character. */
  function who(){
    try{
      const p = B().player; if(!p) return '';
      return ' \u00b7 ' + (p.isAuthorized ? 'signed in' : (p.isGuest ? 'guest' : 'anon'))
           + (p.isAuthorizationSupported ? '' : ' (no login here)');
    }catch(e){ return ''; }
  }
  /* When a restore fails you land on class-select, where CAMP is not
     reachable - so the one fact that matters has to be on THIS screen:
     did the platform have the save and we failed to use it, or was it
     never stored? */
  function introStatus(){
    if(!B()) return 'No Playgama bridge';
    if(readErr)  return 'Cloud read failed: ' + readErr;
    if(writeErr) return 'Cloud write failed: ' + writeErr;
    if(!ready)   return 'Connecting to Playgama\u2026';
    if(!cloudRead) return 'Checking for a cloud save\u2026';
    if(cloudRaw > 0) return 'Cloud save found (' + cloudRaw + ' chars, '
                          + cloudShape + ')' + who();
    return 'No cloud save stored [' + (cloudShape || '?') + ']' + who();
  }
  function paintIntro(){
    try{
      const host = document.getElementById('intro'); if(!host) return;
      let el = document.getElementById('pgCloud');
      if(!el){
        el = document.createElement('div'); el.id = 'pgCloud';
        el.style.cssText = 'margin-top:10px;font-size:11px;opacity:.75;'+
          'text-align:center;color:#9fb0cc;letter-spacing:.3px;';
        host.appendChild(el);
      }
      el.textContent = introStatus();
    }catch(e){}
  }
  function diag(){
    if(!B()) return 'no bridge';
    if(cloudRead && cloudRaw >= 0 && !readErr && !writeErr) return introStatus();
    if(readErr) return 'read failed: ' + readErr;
    if(writeErr) return 'write failed: ' + writeErr;
    if(!ready) return 'connecting';
    if(!cloudRead) return 'reading';
    const w = lastWrite ? Math.round((Date.now()-lastWrite)/1000)+'s ago' : 'not yet';
    return (seeded ? 'restored from cloud' : (hadCloud ? 'cloud in sync' : 'new player'))
         + ' \u00b7 saved ' + w;
  }
  return { init, start, stop, tab, ad, saveRemote, loadRemote, wipeRemote, offerRevive, lateSave, diag,
           readSettings,
           get ready(){ return ready; },
           get adsBlocked(){ return adsBlocked; },
           get pending(){ return pending !== null; } };
})();

"""
sub("/* boot or intro */", SHIM + "/* boot or intro */", "shim")
# Cloud status row in CAMP, Playgama build only.
sub(
    "'<div class=\"kv\"><span>Progress saves automatically</span><b>\u2713</b></div>'+",
    "'<div class=\"kv\"><span>Progress saves automatically</span><b>\u2713</b></div>'+\n"
    "    '<div class=\"kv\"><span>Cloud</span><b>'+(typeof PORTAL!==\"undefined\"?PORTAL.diag():\"-\")+'</b></div>'+",
    "cloud status row",
)
# 5. Gameplay start/stop follows the active tab
sub(
    "function showTab(t){\n  curTab = t;",
    "function showTab(t){\n  curTab = t;\n  if(typeof PORTAL!=='undefined') PORTAL.tab(t);",
    "showTab hook",
)

# 6. Death: offer rewarded revive; ad break when the player gives up and respawns
sub(
    "  $('deathWrap').classList.add('open');\n  saveGame();\n}",
    "  $('deathWrap').classList.add('open');\n  saveGame();\n  PORTAL.offerRevive();\n}",
    "death hook",
)
sub(
    "  P.dead=false; P.hp=D.maxHp; P.mp=D.maxMp; P.inv=2.0;\n  buildZoneWorld();\n  showTab('pMenu');\n  saveGame();\n});",
    "  P.dead=false; P.hp=D.maxHp; P.mp=D.maxMp; P.inv=2.0;\n  buildZoneWorld();\n  showTab('pMenu');\n  saveGame();\n  PORTAL.ad('midgame');\n});",
    "death ok hook",
)

# 7. Save mirrors to the SDK data module; load falls back to it
sub(
    "    localStorage.setItem(SAVE_KEY, JSON.stringify({s:S,uid:uidSeq}));",
    "    const _sv = JSON.stringify({s:S,uid:uidSeq,t:Date.now()});\n    localStorage.setItem(SAVE_KEY, _sv);\n    PORTAL.saveRemote(_sv);",
    "save mirror",
)
# (no sync load fallback: Bridge storage is asynchronous, so the cloud copy is
#  seeded into localStorage during PORTAL.init() before boot ever reads it.)

# 8. One-tap class pick: choosing a class starts the run (no separate Enter step)
sub(
    "    $('startBtn').disabled = false;\n    sfx('buy');\n  });",
    "    $('startBtn').disabled = false;\n    sfx('buy');\n    $('startBtn').click(); /* portal: land in gameplay immediately */\n  });",
    "one tap start",
)

# 9. Boot waits (briefly) for the SDK so the cloud save can be read
sub(
    "buildIntro();\nif(loadGame()){",
    "buildIntro();\n"
    "let _booted = false;\n"
    "const _bootGame = ()=>{\n"
    "if(_booted) return;\n"
    "if(loadGame()){ _booted = true;",
    "boot wait open",
)
sub(
    "} else {\n  running = false;\n}\nrequestAnimationFrame(loop);",
    "} else {\n  running = false;\n}\n"
    "PORTAL.tab('arena');\n"
    "};\n"
    "PORTAL.init().then(_bootGame);\n"
    "/* a cloud save can land after the init budget; honour it, unless the\n"
    "   player already started a new game in the meantime */\n"
    "PORTAL.lateSave(()=>{ if(!running) _bootGame(); });\n"
    "requestAnimationFrame(loop);",
    "boot wait close",
)


open(out_path, "w", encoding="utf-8").write(s)

# Bridge loads its config from ./playgama-bridge-config.json next to the page.
# Written against the SDK's own ConfigFileOptions / AdvertisementOptions types
# (@playgama/bridge 2.3.1, dist/types/lib/bridge-config/types.d.ts) rather than
# guessed, so these keys are real. Placement IDs are deliberately absent: the
# game calls showRewarded()/showInterstitial() with no placement, which uses
# the platform fallback, and inventing placement names we have not registered
# would be worse than omitting them.
cfg = {
    "game": {
        # the game already pads for notches itself via env(safe-area-inset-*);
        # letting the SDK also adapt would double the inset
        "adaptToSafeArea": False
    },
    "advertisement": {
        # our midgame ad fires on respawn, which can come fast after a death
        # streak - 90s between them, against a default of 60
        "minimumDelayBetweenInterstitial": 90,
        # nothing interrupts the first two minutes. That window is what a
        # reviewer and a new player judge the game on.
        "initialInterstitialDelay": 120,
        # the shim already handles ad failure: it hides the revive offer and
        # tells the player once. A second popup on top would double up.
        "useBuiltInErrorPopup": False
    }
}
cfg_path = os.path.join(out_dir, "playgama-bridge-config.json")
open(cfg_path, "w", encoding="utf-8").write(json.dumps(cfg, indent=2) + "\n")

print("wrote", out_path, len(s), "bytes")
print("wrote", cfg_path)
