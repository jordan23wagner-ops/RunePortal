/* The QA Tool's question: "Has your progress been restored after reloading?"
   Models it honestly - the cloud persists, the browser storage partition does
   NOT - and holds the Bridge to its DOCUMENTED contract: storage.get takes an
   ARRAY of keys and resolves to an ARRAY of values. A tolerant mock is what
   let the original bug ship. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const CLOUD = new Map();
const DELAY = Number(process.env.DELAY || 600);
const T=[]; const chk=(n,p,d='')=>T.push({n,pass:p,d});

async function makeCtx(b){
  const ctx = await b.newContext({viewport:{width:1280,height:720}});
  const p = await ctx.newPage();
  await p.exposeFunction('__cloudGet', k => CLOUD.has(k)?CLOUD.get(k):null);
  await p.exposeFunction('__cloudSet', (k,v)=>{ CLOUD.set(k,v); return true; });
  await p.exposeFunction('__cloudDel', k =>{ CLOUD.delete(k); return true; });
  await p.addInitScript(d=>{
    const wait = ms => new Promise(r=>setTimeout(r,ms));
    const strict = (v,who) => { if(!Array.isArray(v))
      throw new TypeError(`bridge.storage.${who} expects an array of keys, got ${typeof v}`); };
    window.bridge = {
      platform:{id:'playgama',language:'en',isPlatformAudioEnabled:true,sendMessage(){},on(){}},
      game:{on(){}},
      storage:{ isSupported:()=>true,
        get: async keys => { strict(keys,'get'); await wait(d);
          const out=[]; for(const k of keys) out.push(await window.__cloudGet(k)); return out; },
        set: async (keys,vals) => { strict(keys,'set'); strict(vals,'set'); await wait(40);
          for(let i=0;i<keys.length;i++) await window.__cloudSet(keys[i], vals[i]); return true; },
        delete: async keys => { strict(keys,'delete');
          for(const k of keys) await window.__cloudDel(k); return true; } },
      advertisement:{on(){},showInterstitial(){},showRewarded(){}},
      player:{}, initialize: async()=>{ await wait(d); }, on(){} };
  }, DELAY);
  return p;
}

(async()=>{
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const errs=[];

  // --- session 1: play and make progress worth losing
  let p = await makeCtx(b); p.on('pageerror',e=>errs.push('s1: '+e.message));
  await p.goto('file:///home/user/RunePortal/playgama/index.html',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
  await p.click('[data-cls="melee"]');
  await p.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:25000});
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{ S.lvl=14; S.gold=9876; S.tut=99; saveGame(); });
  /* The save is queued until the Bridge is ready AND the initial cloud read
     has settled, which on a slow platform is seconds away. Wait for the
     condition, never a fixed sleep - a sleep here just encodes one machine. */
  const deadline = Date.now() + 25000;
  while(!CLOUD.has('riftfall_save') && Date.now() < deadline) await p.waitForTimeout(250);
  const before = await p.evaluate(()=>({lvl:S.lvl,gold:S.gold,tut:S.tut}));
  chk('save reached the cloud', CLOUD.has('riftfall_save'), [...CLOUD.keys()].join()||'(none)');
  await p.context().close();

  // --- session 2: brand new storage partition, same cloud account
  p = await makeCtx(b); p.on('pageerror',e=>errs.push('s2: '+e.message));
  await p.goto('file:///home/user/RunePortal/playgama/index.html',{waitUntil:'load'});
  try{ await p.waitForFunction(()=>typeof S!=='undefined'&&S&&S.lvl===14,{timeout:30000}); }
  catch(e){
    console.log('  !! session 2 never restored. cloud keys:', [...CLOUD.keys()].join()||'(none)');
    console.log('  !! page state:', JSON.stringify(await p.evaluate(()=>({
      S: typeof S!=='undefined'&&!!S, lvl: typeof S!=='undefined'&&S?S.lvl:null,
      running: typeof running!=='undefined'?running:null,
      portalReady: typeof PORTAL!=='undefined'?PORTAL.ready:null,
      ls: !!localStorage.getItem('riftfall_save')}))));
    console.log('  !! page errors:', errs.join(' | ')||'(none)');
  }
  await p.waitForTimeout(600);
  const after = await p.evaluate(()=>({lvl:S.lvl,gold:S.gold,tut:S.tut,
    intro: (()=>{ const e=document.querySelector('[data-cls="melee"]');
      if(!e) return false; const r=e.getBoundingClientRect();
      return r.width>0 && r.height>0; })()}));
  chk('level restored',   after.lvl===before.lvl,   `${after.lvl} vs ${before.lvl}`);
  chk('gold restored',    after.gold===before.gold, `${after.gold} vs ${before.gold}`);
  chk('tutorial stays finished', after.tut===before.tut, `${after.tut} vs ${before.tut}`);
  chk('no class-select on a returning player', !after.intro);
  chk('no TypeError from the strict Bridge', errs.length===0, errs.slice(0,2).join(' | '));
  await p.context().close();

  // --- a fresh player must not be handed someone else's save
  CLOUD.clear();
  p = await makeCtx(b);
  await p.goto('file:///home/user/RunePortal/playgama/index.html',{waitUntil:'load'});
  await p.waitForSelector('[data-cls="melee"]',{timeout:25000});
  chk('empty cloud still starts a new game', true);

  console.log('=== CLOUD SAVE ===');
  let ps=0; for(const t of T){ console.log(`  ${t.pass?'PASS':'FAIL'}  ${t.n}${t.pass?'':'   <- '+t.d}`); if(t.pass)ps++; }
  console.log(`\n${ps}/${T.length} passed | bridge latency ${DELAY}ms`);
  await b.close();
  process.exit(ps===T.length?0:1);
})();
