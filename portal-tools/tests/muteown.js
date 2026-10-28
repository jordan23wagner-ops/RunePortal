/* Who owns masterGain. The game has a mute button, the tab can go to the
   background, and a portal shim mutes for ads and for the platform's own mute
   signal. They used to write the gain node independently, so whichever ran
   last won: tabbing away undid a platform mute, and a platform audio event
   undid the player's switch. The game is the only writer now; shims report a
   reason through setExtMute. Both directions are asserted. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const T = []; const chk = (n, p, d = '') => T.push({ n, pass: p, d });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.addInitScript(() => {
    const H = {};
    window.__fire = (ev, v) => { (H[ev] || []).forEach(f => f(v)); };
    window.bridge = {
      platform: { id: 'playgama', language: 'en', isPlatformAudioEnabled: true,
        sendMessage() {}, on(ev, fn) { (H[ev] = H[ev] || []).push(fn); } },
      game: { on() {} },
      storage: { isSupported: () => true, get: async k => k.map(() => null), set: async () => true, delete: async () => true },
      advertisement: { on(ev, fn) { (H[ev] = H[ev] || []).push(fn); }, showInterstitial() {}, showRewarded() {} },
      player: {}, initialize: async () => {}, on() {} };
  });
  await p.goto('file:///home/user/RunePortal/playgama/index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => { const b = document.querySelector('[data-cls="melee"]'); return b && !b.disabled; }, { timeout: 25000 });
  await p.click('[data-cls="melee"]');
  await p.waitForFunction(() => typeof running !== 'undefined' && running, { timeout: 25000 });
  await p.evaluate(() => { audioResume(); if (!MUS.on) musicStart(); });
  await p.waitForTimeout(1200);
  const g = () => p.evaluate(() => masterGain.gain.value);

  chk('audible to start', await g() > 0, 'gain ' + await g());

  // platform says mute
  await p.evaluate(() => { bridge.platform.isPlatformAudioEnabled = false; window.__fire('audio_state_changed', false); });
  await p.waitForTimeout(300);
  chk('platform mute silences audio', await g() === 0, 'gain ' + await g());

  // ...now something in the GAME touches audio while the platform mute is on
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(200);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(300);
  chk('platform mute SURVIVES a tab away/back', await g() === 0, 'gain ' + await g() + ' (game applyMute overrode the platform)');

  // player's own mute must survive a platform audio event too
  await p.evaluate(() => { bridge.platform.isPlatformAudioEnabled = true; window.__fire('audio_state_changed', true); });
  await p.waitForTimeout(300);
  chk('platform unmute restores audio', await g() > 0, 'gain ' + await g());
  await p.evaluate(() => { S.mute = 1; applyMute(); });
  await p.waitForTimeout(200);
  chk('player mute silences audio', await g() === 0, 'gain ' + await g());
  await p.evaluate(() => { window.__fire('audio_state_changed', true); });
  await p.waitForTimeout(300);
  chk('player mute SURVIVES a platform audio event', await g() === 0, 'gain ' + await g() + ' (shim applyAudio overrode the player)');

  console.log('=== MUTE OWNERSHIP ===');
  let ps = 0; for (const t of T) { console.log(`  ${t.pass ? 'PASS' : 'FAIL'}  ${t.n}${t.pass ? '' : '   <- ' + t.d}`); if (t.pass) ps++; }
  console.log(`\n${ps}/${T.length} passed`);
  await b.close();
  process.exit(ps === T.length ? 0 : 1);
})();
