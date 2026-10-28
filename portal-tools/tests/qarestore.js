/* The QA Tool's "Reload and check restore", modelled the way it actually
   behaves: platform storage survives, the browser's own storage does NOT.
   Three scenarios, because the first two passed while the real thing failed.

   1. plain      - reload, nothing else. Progress must come back.
   2. impatient  - the player clicks a class while the cloud read is still in
                   flight. That used to write a fresh level 1 over the cloud.
   3. staleLocal - localStorage holds an OLDER save than the cloud. The newer
                   one must win, not whichever happens to be local.                     */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const SCENARIO = process.argv[2] || 'plain';
const DELAY = Number(process.env.DELAY || 1500);
const CLOUD = new Map();
const T = []; const chk = (n, p, d = '') => T.push({ n, pass: p, d });

async function makeCtx(b, keepStorage) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 },
    storageState: keepStorage || undefined });
  const p = await ctx.newPage();
  await p.exposeFunction('__cloudGet', k => CLOUD.has(k) ? CLOUD.get(k) : null);
  await p.exposeFunction('__cloudSet', (k, v) => { CLOUD.set(k, v); return true; });
  await p.exposeFunction('__cloudDel', k => { CLOUD.delete(k); return true; });
  await p.addInitScript(d => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const strict = (v, who) => { if (!Array.isArray(v))
      throw new TypeError('bridge.storage.' + who + ' expects an array, got ' + typeof v); };
    window.bridge = {
      platform: { id: 'playgama', language: 'en', isPlatformAudioEnabled: true, sendMessage() {}, on() {} },
      game: { on() {} },
      storage: { isSupported: () => true,
        get: async keys => { strict(keys, 'get'); await wait(d);
          const o = []; for (const k of keys) o.push(await window.__cloudGet(k)); return o; },
        set: async (keys, vals) => { strict(keys, 'set'); strict(vals, 'set'); await wait(40);
          for (let i = 0; i < keys.length; i++) await window.__cloudSet(keys[i], vals[i]); return true; },
        delete: async keys => { strict(keys, 'delete');
          for (const k of keys) await window.__cloudDel(k); return true; } },
      advertisement: { on() {}, showInterstitial() {}, showRewarded() {} },
      player: { isAuthorizationSupported: true, isAuthorized: false, isGuest: true },
      initialize: async () => { await wait(d); }, on() {} };
  }, DELAY);
  return p;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });

  // ---- session 1: play to "level 2"
  let p = await makeCtx(b);
  await p.goto('file:///home/user/RunePortal/playgama/index.html', { waitUntil: 'load' });
  await p.waitForSelector('[data-cls="melee"]', { timeout: 25000 });
  await p.waitForFunction(() => { const b = document.querySelector('[data-cls="melee"]'); return b && !b.disabled; }, { timeout: 25000 });
  await p.click('[data-cls="melee"]');
  await p.waitForFunction(() => typeof running !== 'undefined' && running, { timeout: 25000 });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { S.lvl = 2; S.gold = 777; saveGame(); });
  const dl = Date.now() + 25000;
  while (!CLOUD.has('riftfall_save') && Date.now() < dl) await p.waitForTimeout(200);
  chk('progress reached the cloud', CLOUD.has('riftfall_save'));
  await p.context().close();

  if (SCENARIO === 'staleLocal') {
    // cloud moves ahead of the local copy, as another device would leave it
    CLOUD.set('riftfall_save', CLOUD.get('riftfall_save')
      .replace(/"lvl":2/, '"lvl":9').replace(/"t":\d+/, '"t":' + (Date.now() + 60000)));
  }

  // ---- session 2: the QA Tool reload. Fresh browser storage, same cloud.
  p = await makeCtx(b);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/RunePortal/playgama/index.html', { waitUntil: 'load' });

  if (SCENARIO === 'impatient') {
    // a player who taps a class the instant the intro appears
    await p.waitForSelector('[data-cls="melee"]', { timeout: 25000 });
    await p.waitForTimeout(150);
    const locked = await p.evaluate(() => {
      const b = document.querySelector('[data-cls="melee"]');
      return !!(b.disabled || getComputedStyle(b).pointerEvents === 'none');
    });
    chk('class select is held while the cloud read is in flight', locked);
    await p.evaluate(() => { const b = document.querySelector('[data-cls="melee"]'); if (b) b.click(); });
    await p.waitForTimeout(300);
  }

  const want = SCENARIO === 'staleLocal' ? 9 : 2;
  await p.waitForFunction(w => typeof S !== 'undefined' && S && S.lvl === w, want, { timeout: 30000 })
    .catch(() => {});
  const after = await p.evaluate(() => ({
    lvl: typeof S !== 'undefined' && S ? S.lvl : null,
    gold: typeof S !== 'undefined' && S ? S.gold : null,
    running: typeof running !== 'undefined' ? running : null }));
  chk('level restored after reload', after.lvl === want, `got ${after.lvl}, wanted ${want}`);
  if (SCENARIO !== 'staleLocal') chk('gold restored', after.gold === 777, String(after.gold));
  chk('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  // the cloud must not have been clobbered by a fresh save on the way through
  const cloudLvl = (CLOUD.get('riftfall_save') || '').match(/"lvl":(\d+)/);
  chk('cloud save was not overwritten with a fresh one',
      !!cloudLvl && Number(cloudLvl[1]) >= want, cloudLvl ? cloudLvl[1] : '(gone)');

  console.log(`=== QA RESTORE (${SCENARIO}, latency ${DELAY}ms) ===`);
  let ps = 0; for (const t of T) { console.log(`  ${t.pass ? 'PASS' : 'FAIL'}  ${t.n}${t.pass ? '' : '   <- ' + t.d}`); if (t.pass) ps++; }
  console.log(`\n${ps}/${T.length} passed`);
  await b.close();
  process.exit(ps === T.length ? 0 : 1);
})();
