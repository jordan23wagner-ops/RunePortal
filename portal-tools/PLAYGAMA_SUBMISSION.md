# RIFTFALL on Playgama — submitted

Submitted through the Playgama Developer Cabinet MCP on 2026-10-28.
Do not hand-edit `playgama/index.html`; regenerate it with
`portal-tools/make_playgama.py zonelooter3d.html playgama`.

## Identifiers

| | |
|---|---|
| Application | `cmvrdtqfu03uwll0hu3iaga25` |
| Archive | `cmvrir8fj05o9l60hxb1y7191` — `riftfall-2026.10.28-6` |
| Sandbox | https://playgama.ai/play/e6wrbi3laenw2l |
| QA Tool | https://developer.playgama.com/qa-tool/cmvrir8fj05o9l60hxb1y7191 |
| Build string | `2026.10.28-6 parsed save` |
| Developer | Wagner Games |

## Launch path

| Step | State |
|---|---|
| archive | DONE — build check PASSED |
| bridge | DONE — SDK FOUND, Bridge 2.3.1, engine javascript |
| covers | DONE — all three slots |
| sandbox | DONE — PUBLISHED |
| form | BLOCKED: NO_CERTIFICATION — needs a human play-through in the QA Tool |
| traffic | TODO — needs public post links, `askDeveloper` |

Moderation is NOT open yet. `get_submission_state` answers
MODERATION_UNAVAILABLE, `catalogAvailable: false`. The gate is the sandbox
reaching **100 plays at a 5-minute average play time**, counted once a day.
There is no tool that submits to moderation; a human does it in the console
once the gate opens.

## Form as submitted

Title Riftfall · engine `js` · agent `claude-code` · category `action`
(core mechanic is melee combat with health bars, not aiming) ·
devices DESKTOP + ANDROID + IOS · language EN · both orientations ·
multiplayer/social/leaderboards all false ·
**distributeEverywhere true, excludedPlatforms empty** (developer's explicit
choice: partner platforms are where the impressions are).

Covers: square 800x800, portrait **1080x1920**, landscape 1920x1080. Note
the portrait slot is 1080x1920 here, NOT the 800x1200 CrazyGames wants.

## Checklist items fixed before upload

Read live from `get_game_checklist`. Three required items failed and were
fixed in `zonelooter3d.html` (so every portal gets them):

- **29** — no mute control existed at all. Added one in the HUD, persisted
  in the save.
- **29** — audio did not stop when the tab was backgrounded. A
  `visibilitychange` handler now silences it.
- **14** — the rewarded revive was offered on every death, the anti-pattern
  the checklist names. Now one revive per zone.

## Verified by measurement

Bridge SDK FOUND (Playgama's own check) · build check PASSED · 1 external
request, the Bridge script, nothing else (item 16, 19) · 0 occurrences of
"crazygames" · index.html at archive root (18) · 374,405-byte zip, 1.28 MB
uncompressed against 300 MB (17) · no page scrollbar at any of four
viewports (23) · every overlay dismissable, 0 of 20 unreachable (24) ·
`game_ready` sent after the first interactive frame (9) · mute 8/8 ·
bridge shim 21/21 · tutorial 22/22 · daily 17/17 · 0 js errors.

## NOT verified — do these yourself

- **Item 36: open the published link with Playwright and check it works
  there.** `playgama.ai` is outside this container's allowed network, so
  this could not be done from here. It is the one item that tests the REAL
  Bridge rather than a mock; everything about async `storage.get()` and
  interstitial pacing rests on it.
- Items 13, 25, 26, 33 (ad placement under the finger, long-press
  behaviour, real-device rotation and backgrounding) need a real phone.
- Tablet portrait at 820x1180 caps `#app` at 560px and leaves 260px of
  background down each side. Known, unfixed, cosmetic but visible.

## Share post (traffic step)

```
Made with AI. Brought to you by #PlaygamaMCP. Fine-tuned by me. Riftfall → https://playgama.ai/play/e6wrbi3laenw2l
#playgama #PlaygamaMCP #webdev #gamedev
```

Prefilled links: X, Threads and Reddit carry the text; Facebook and
LinkedIn take the link only.


---

# Cloud saves: what it actually was

Six builds. Worth writing down, because every wrong turn had the same
shape.

**The bug.** Bridge runs `tryParseJson` over whatever `storage.get`
returns - the SDK changelog lists it under Playgama, "Fixed tryParseJson
logic for the storage.get method". The save is written as a JSON string
and comes BACK as a parsed object. The read tested
`typeof v === 'string'`, rejected the object, and reported an empty
cloud. One type check.

**How it hid.** Every mock written for it returned the raw string,
because each was written to match our code rather than the platform. All
of them agreed with the bug, so every suite was green before and after
each "fix". A test that passes on both sides of a change proves nothing,
and three were shipped on exactly that basis.

**What broke it open.** Not a mock. The console's own Game Storage panel
showing `riftfall_save` with the full payload, next to the game saying
"No cloud save stored" on the same screen. That contradiction could not
be argued with. It only existed because an earlier build printed the
cloud state on the intro screen, where the failure happens, instead of
in a menu you cannot reach from class-select.

**The rule for next time.** A fix is not verified until the new test
FAILS on the old build. `qarestore.js` does: on the pre-fix build it
reports "level restored: got null, wanted 2". That is the only evidence
that mattered.

Real bugs found on the way, all kept, none of them the cause:
- `storage.get` takes an ARRAY of keys and answers an ARRAY of values;
  a bare string was being passed.
- The cloud was consulted only when localStorage was empty, so a fresh
  level 1 written while the read was in flight shadowed the real save
  and was flushed over it.
- Saves made before the Bridge finished initializing were dropped rather
  than queued.
- Class select was live during the read, which is what let that fresh
  save exist.

One detour worth keeping: the QA Tool withholds platform storage from
guests on purpose (changelog v1.27.0, "Internal storage is now available
only to authorized players"). Tick **Player is authorized** in Platform
Settings before testing saves there. On playgama.ai itself guests do get
cloud saves - v2.2.0, "Playgama cloud saves now work for guests".

# What is left

1. **Certification** - `form` is BLOCKED on NO_CERTIFICATION. Run Guided
   Certification through to the end now that restore passes.
2. **Traffic** - a FREE boost is available: 3 days, ~50 expected
   gameplays, 3 runs remaining. It needs public post URLs
   (`start_sandbox_traffic` with `postUrls`); there is no referral bonus
   on this account.
3. **Moderation** opens once the sandbox reaches 100 plays at a 5 minute
   average, counted daily. A human submits it from the console.
