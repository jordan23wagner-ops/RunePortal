# portal-tools

Everything needed to rebuild, test and re-market the CrazyGames build of
Riftfall. `zonelooter3d.html` is never modified by anything in here.

## Build

    python3 -I portal-tools/make_portal.py zonelooter3d.html portal/index.html

Each patch is a `str.replace` against a unique anchor and asserts exactly one
match, so a drifted source fails loudly rather than producing a half-patched
build. If an anchor stops matching, fix the ANCHOR, not the source.

Zip it with the game file at the ROOT - the uploader looks for `index.html`
there:

    cd portal && zip -9 ../riftfall-crazygames.zip index.html

## Tests

Run against `portal/index.html` (Playwright + Chromium, software WebGL).

| script | what it covers |
|---|---|
| `tests/mocksdk.js`  | 49 assertions over the whole SDK shim: init, gameplay start/stop, rewarded revive, ad errors, ads-unavailable handling, mute setting, cloud save coalescing, pagehide flush, wipe |
| `tests/psmoke.js`   | boots and plays with the SDK host unreachable (the ad-blocker path) |
| `tests/final.js`    | overlay reachability, 20 states x 5 viewports |
| `tests/uibot.js`    | every tab, delegated handler and button |
| `tests/bagbot.js`   | populated bag, item modals, ring comparison, loot overlay |
| `tests/texdiag.js`  | GPU texture accounting across zone travel |
| `tests/soak.js`     | long-run memory and resource growth |
| `tests/lootlock.js` | loot overlay dismissability |
| `tests/fpsprobe.js` | render rate at candidate resolutions |

Two hard-won rules when editing these:

- Never sleep a fixed time around an async SDK callback. Wait on the
  CONDITION. Fixed sleeps made this suite flake three separate times.
- The mock must not fire `adStarted` on a request that fails - a real ad that
  was never available cannot start, and faking it tells the shim ads work.

## Store media

| script | output |
|---|---|
| `media/capture_plates.js`      | clean gameplay plates at the three cover ratios |
| `media/make_covers.js`         | the three covers (1920x1080, 800x1200, 800x800) |
| `media/capture_screenshots.js` | store screenshots |
| `media/render_video.js`        | preview video frames |

Video: software WebGL manages ~2fps here, so real-time capture is a slideshow.
`render_video.js` takes the game off `requestAnimationFrame`, steps `update()`
by a fixed dt, and screenshots each frame. Assemble with:

    ffmpeg -framerate 28 -i f%04d.jpg -f lavfi -i anullsrc \
      -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
      -c:a aac -b:a 64k -shortest -movflags +faststart out.mp4

28fps over 420 frames lands on exactly 15.0s.

## Portal requirements as confirmed at submission

Covers: three, 1920x1080 / 800x1200 / 800x800, NO border and NO text other
than the game's title. Videos: 15-20s, <=50MB, 1080p landscape 16:9 and
portrait 2:3, no black bars, no cursor, no logo transition. Build: initial
download <=50MB, total <=250MB, <=1500 files, gameplay within 20s, relative
paths only, no cross-promotion, no in-game fullscreen button, pause and mute
during ads.

Note: `#app{max-width:560px}` means a portrait viewport wider than 560px gets
background down both sides. `render_video.js` lifts it for recording. Real
tablets in portrait still see it.
