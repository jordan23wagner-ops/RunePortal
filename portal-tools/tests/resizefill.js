const { chromium } = require('/opt/node22/lib/node_modules/playwright');
/* The QA Tool resizes the game's frame to test aspect ratios. A renderer that
   only sizes itself at boot leaves the canvas at its old dimensions, so the
   page shows through around it - "the background does not cover the full
   viewport". Load at one shape, resize to another, assert it still fills. */
const STEPS = [
  ['start wide', 1280, 720],
  ['-> square', 800, 800],
  ['-> tall portrait', 600, 1100],
  ['-> short landscape', 1100, 500],
  ['-> back to square', 800, 800],
];
const T = []; const chk = (n, p, d = '') => T.push({ n, pass: p, d });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  await p.goto('file:///home/user/RunePortal/portal/index.html', { waitUntil: 'load' });
  await p.waitForSelector('[data-cls="melee"]', { timeout: 25000 });
  await p.click('[data-cls="melee"]');
  await p.waitForFunction(() => typeof running !== 'undefined' && running, { timeout: 25000 });
  await p.waitForTimeout(1500);

  for (const [label, w, h] of STEPS) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(900);          // let any resize handler settle
    const r = await p.evaluate(() => {
      const a = document.getElementById('app').getBoundingClientRect();
      const cv = document.querySelector('canvas');
      const c = cv.getBoundingClientRect();
      const rail = document.getElementById('tabbar');
      const rb = rail ? rail.getBoundingClientRect() : { width: 0, height: 0 };
      return {
        vw: innerWidth, vh: innerHeight,
        appW: Math.round(a.width), appH: Math.round(a.height),
        cvCssW: Math.round(c.width), cvCssH: Math.round(c.height),
        cvBufW: cv.width, cvBufH: cv.height,
        railW: Math.round(rb.width), railH: Math.round(rb.height),
      };
    });
    const appFills = r.appW === r.vw && r.appH === r.vh;
    // the stage is the viewport minus the nav rail, whichever edge it sits on
    const stageW = r.vw - (r.railW < r.vw ? r.railW : 0);
    const stageH = r.vh - (r.railH < r.vh ? r.railH : 0);
    const cvFills = Math.abs(r.cvCssW - stageW) <= 2 && Math.abs(r.cvCssH - stageH) <= 2;
    chk(`${label} ${w}x${h}: app fills viewport`, appFills, `app ${r.appW}x${r.appH} vs ${r.vw}x${r.vh}`);
    chk(`${label} ${w}x${h}: canvas fills stage`, cvFills,
        `canvas ${r.cvCssW}x${r.cvCssH} vs stage ${stageW}x${stageH} (buffer ${r.cvBufW}x${r.cvBufH})`);
  }

  console.log('=== RESIZE FILL ===');
  let ps = 0; for (const t of T) { console.log(`  ${t.pass ? 'PASS' : 'FAIL'}  ${t.n}${t.pass ? '' : '   <- ' + t.d}`); if (t.pass) ps++; }
  console.log(`\n${ps}/${T.length} passed`);
  await b.close();
  process.exit(ps === T.length ? 0 : 1);
})();
