/* CrazyGames cover rules: three sizes, NO border, no text but the game title.
   Each cover is written as a real .html file and opened with goto() - a
   setContent() document has an about:blank origin and Chromium refuses to load
   file:// subresources into it, which silently produced black covers. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const A='/tmp/claude-0/-home-user-RunePortal/256dfdb7-80ba-5509-944c-0cc7b791d092/scratchpad/assets/';
const SPECS=[
  {w:1920,h:1080,plate:'plate_land.png',out:'cover_landscape_1920x1080.png',fs:150,ls:20,bottom:0.10},
  {w:800, h:1200,plate:'plate_port.png',out:'cover_portrait_800x1200.png',  fs:74, ls:9, bottom:0.11},
  {w:800, h:800, plate:'plate_sq.png',  out:'cover_square_800x800.png',     fs:82, ls:10,bottom:0.11},
];
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();
  for(const s of SPECS){
    const html=`<!doctype html><meta charset="utf-8"><style>
      html,body{margin:0;padding:0;background:#0b0d14;overflow:hidden}
      .s{position:relative;width:${s.w}px;height:${s.h}px;overflow:hidden}
      img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
          filter:saturate(1.18) contrast(1.10)}
      .v{position:absolute;inset:0;
         background:radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 32%, rgba(4,5,10,.70) 80%),
                    linear-gradient(to bottom, rgba(4,5,10,.45) 0%, rgba(4,5,10,0) 26%,
                                    rgba(4,5,10,0) 55%, rgba(4,5,10,.94) 100%)}
      .t{position:absolute;left:0;right:0;bottom:${Math.round(s.h*s.bottom)}px;text-align:center;
         font-family:Georgia,'Times New Roman',serif;font-weight:900;
         font-size:${s.fs}px;letter-spacing:${s.ls}px;color:#f2e3c0;
         text-shadow:0 0 ${Math.round(s.fs*0.42)}px rgba(232,180,74,.60),
                     0 ${Math.round(s.fs*0.04)}px 0 rgba(0,0,0,.65),
                     0 0 ${s.fs}px rgba(167,139,250,.35)}
    </style><div class="s"><img src="${s.plate}"><div class="v"></div><div class="t">RIFTFALL</div></div>`;
    const f=A+'_cv_'+s.out.replace('.png','.html');
    fs.writeFileSync(f, html);
    await p.setViewportSize({width:s.w,height:s.h});
    await p.goto('file://'+f,{waitUntil:'load'});
    await p.waitForFunction(()=>[...document.images].length>0 &&
      [...document.images].every(i=>i.complete && i.naturalWidth>0), null, {timeout:15000});
    await p.waitForTimeout(350);
    await p.screenshot({path:A+s.out});
    console.log(` ${s.out}  ${s.w}x${s.h}`);
  }
  await b.close();
})();
