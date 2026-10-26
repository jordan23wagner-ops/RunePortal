#!/usr/bin/env python3
"""Build a CrazyGames-ready copy of Riftfall from zonelooter3d.html.

Source is never modified. Every patch is str.replace against a unique anchor and
asserts exactly one match, so a drifted source fails loudly instead of silently.
Usage: make_portal.py <src.html> <out.html>
"""
import sys

src_path, out_path = sys.argv[1], sys.argv[2]
s = open(src_path, encoding="utf-8").read()


def sub(old, new, label):
    global s
    n = s.count(old)
    assert n == 1, f"[{label}] anchor matched {n} times, expected 1"
    s = s.replace(old, new)
    print("ok", label)


# 1. SDK script + drop PWA head links (no manifest/install inside a portal iframe)
sub(
    "<title>RIFTFALL</title>",
    '<title>RIFTFALL</title>\n<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
    "sdk tag",
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

# 4. Portal shim, inserted just before the boot section
SHIM = r"""
/* ================================================================
   PORTAL — CrazyGames SDK glue (portal build only)
   Every call is guarded, so the same file still runs standalone.
   ================================================================ */
const PORTAL = (()=>{
  const sdk = ()=> (window.CrazyGames && window.CrazyGames.SDK) || null;
  let ready = false, playing = false, adBusy = false;

  /* masterGain is set once to 0.32 at audio init and never written again - the
     music slider scales per-source - so it is a safe single master mute point.
     Two things can mute: an ad in progress, and the player's own CrazyGames
     audio setting. Track them separately or they clobber each other. */
  let adMuted = false, setMuted = false, baseVol = null;

  /* Ads are disabled entirely during Basic Launch, so requestAd fails straight
     away. Without this the player dies, sees "Revive here - watch an ad",
     clicks it, and nothing happens: the request errors and the button just
     re-enables. Functionally safe but it reads as broken.
     So: the first NON-TRANSIENT failure, before any ad has ever played, marks
     ads unavailable for the session and the offer stops appearing. Transient
     errors - rate limiting, a request already in flight - must not latch,
     or one unlucky click would hide a feature that works fine. */
  let adsBlocked = false, adEverShown = false;
  const AD_TRANSIENT = /too soon|already in progress|in progress|not ready/i;
  function adErrText(e){
    try{ return String((e && (e.message || e.code || e.error)) || e || ''); }
    catch(_){ return ''; }
  }
  function markAdFailure(err){
    if(AD_TRANSIENT.test(adErrText(err))) return;   /* retryable, not a verdict */
    if(adEverShown) return;                          /* ads demonstrably work here */
    adsBlocked = true;
    const b = document.getElementById('deathRevive');
    if(b) b.style.display = 'none';                  /* pull it even if open right now */
    try{ toast('Ads unavailable right now'); }catch(_){}
  }
  function applyAudio(){
    try{
      if(!masterGain) return;
      if(baseVol === null && masterGain.gain.value > 0) baseVol = masterGain.gain.value;
      masterGain.gain.value = (adMuted || setMuted) ? 0 : (baseVol === null ? 0.32 : baseVol);
    }catch(e){}
  }
  function readSettings(){
    try{
      const s = sdk();
      if(s && s.game && s.game.settings) setMuted = !!s.game.settings.muteAudio;
    }catch(e){}
    applyAudio();
  }

  function init(){
    const real = (async ()=>{
      try{
        const s = sdk(); if(!s) return;
        await s.init(); ready = true;
        /* the player can mute from the portal chrome at any time */
        try{ s.game.addSettingsChangeListener(readSettings); }catch(e){}
        readSettings();
      }
      catch(e){ console.warn('CrazyGames init failed', e); }
    })();
    /* an ad blocker can make init hang; never let that block the game */
    return Promise.race([real, new Promise(r=>setTimeout(r, 3500))]);
  }
  function start(){
    if(!ready || playing || adBusy) return;
    playing = true; try{ sdk().game.gameplayStart(); }catch(e){}
  }
  function stop(){
    if(!ready || !playing) return;
    playing = false; try{ sdk().game.gameplayStop(); }catch(e){}
  }
  function tab(t){ if(t==='arena' && S && P && !P.dead) start(); else stop(); }

  /* kind: 'midgame' | 'rewarded'. done(ok): ok=true when an ad actually finished. */
  function ad(kind, done){
    done = done || function(){};
    if(!ready || adBusy || adsBlocked){ done(false); return; }
    adBusy = true;
    const was = paused;
    stop();
    const end = ok => {
      adBusy = false;
      adMuted = false; applyAudio();   /* restores to the SETTING, not to a snapshot */
      paused = was;
      done(ok);
    };
    try{
      sdk().ad.requestAd(kind, {
        adStarted:  ()=>{ adEverShown = true; adsBlocked = false;
                          paused = true; adMuted = true; applyAudio(); },
        adFinished: ()=>end(true),
        adError:    (err)=>{ markAdFailure(err); end(false); },
      });
    }catch(e){ markAdFailure(e); end(false); }
  }

  /* data module follows the player's CrazyGames account across devices.
     saveGame() fires on tab changes, death, purchases - far too often to mirror
     every one. Coalesce to one write per WRITE_MS per key, which is what the
     maintained SDK wrappers do. localStorage still takes every save, so nothing
     is lost locally; only the cloud copy lags. getItem is SYNCHRONOUS and
     returns string|null - confirmed against the SDK's typed interface. */
  const WRITE_MS = 30000;
  let lastWrite = -Infinity, pendTimer = null, pendVal = null;
  const nowMs = ()=> (typeof performance !== 'undefined' ? performance.now() : Date.now());
  function flushRemote(){
    if(pendVal === null) return;
    if(!ready){ pendVal = null; return; }
    try{ sdk().data.setItem(SAVE_KEY, pendVal); }catch(e){}
    lastWrite = nowMs(); pendVal = null;
  }
  function saveRemote(str){
    if(!ready) return;
    pendVal = str;
    if(pendTimer) return;                      /* already queued; it takes pendVal */
    const wait = WRITE_MS - (nowMs() - lastWrite);
    if(wait <= 0){ flushRemote(); return; }
    pendTimer = setTimeout(()=>{ pendTimer = null; flushRemote(); }, wait);
  }
  function loadRemote(){ if(!ready) return null; try{ return sdk().data.getItem(SAVE_KEY) || null; }catch(e){ return null; } }
  function wipeRemote(){
    /* a queued write would otherwise resurrect the save seconds after a wipe */
    if(pendTimer){ clearTimeout(pendTimer); pendTimer = null; }
    pendVal = null;
    if(!ready) return;
    try{ sdk().data.removeItem(SAVE_KEY); }catch(e){}
  }
  /* closing the tab must not cost the player up to WRITE_MS of cloud progress */
  try{
    addEventListener('pagehide', ()=>{ if(pendTimer){ clearTimeout(pendTimer); pendTimer = null; } flushRemote(); });
    addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden'){
      if(pendTimer){ clearTimeout(pendTimer); pendTimer = null; } flushRemote(); } });
  }catch(e){}

  function reviveInPlace(){
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
    b.style.display = (ready && !adsBlocked) ? 'block' : 'none';
  }
  return { init, start, stop, tab, ad, saveRemote, loadRemote, wipeRemote, offerRevive,
           flushRemote, readSettings,
           get ready(){ return ready; },
           get adsBlocked(){ return adsBlocked; },
           get muted(){ return adMuted || setMuted; },
           get pending(){ return pendVal !== null; } };
})();

"""
sub("/* boot or intro */", SHIM + "/* boot or intro */", "shim")

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
    "    const _sv = JSON.stringify({s:S,uid:uidSeq});\n    localStorage.setItem(SAVE_KEY, _sv);\n    PORTAL.saveRemote(_sv);",
    "save mirror",
)
sub(
    "    const raw = localStorage.getItem(SAVE_KEY);\n    if(!raw) return false;\n    const o = JSON.parse(raw);",
    "    let raw = localStorage.getItem(SAVE_KEY);\n    if(!raw) raw = PORTAL.loadRemote();\n    if(!raw) return false;\n    const o = JSON.parse(raw);",
    "load fallback",
)

# 8. One-tap class pick: choosing a class starts the run (no separate Enter step)
sub(
    "    $('startBtn').disabled = false;\n    sfx('buy');\n  });",
    "    $('startBtn').disabled = false;\n    sfx('buy');\n    $('startBtn').click(); /* portal: land in gameplay immediately */\n  });",
    "one tap start",
)

# 9. Boot waits (briefly) for the SDK so the cloud save can be read
sub(
    "buildIntro();\nif(loadGame()){",
    "buildIntro();\nPORTAL.init().then(()=>{\nif(loadGame()){",
    "boot wait open",
)
sub(
    "} else {\n  running = false;\n}\nrequestAnimationFrame(loop);",
    "} else {\n  running = false;\n}\nPORTAL.tab('arena');\n});\nrequestAnimationFrame(loop);",
    "boot wait close",
)

open(out_path, "w", encoding="utf-8").write(s)
print("wrote", out_path, len(s), "bytes")
