# RIFTFALL — project handoff

**Current build:** `2026.09.28-9 sword faces out` · `main` @ `2f3d0b4` · 50 commits
**Live:** `riftfall-delta.vercel.app/3d.html` (installed PWA launches `?live`)

A single-file mobile-web zone-looter ARPG. One 1.26 MB HTML file, Three.js r160
inlined, **zero external requests** — no CDN, no asset files, no fonts, no images.
Everything (geometry, icons, music, sound) is generated in-browser at runtime.

> `ZONELOOTER.md` is an older design doc for `zonelooter.html`, the 2D
> predecessor. It is stale. This file is the current one.

---

## 1 · Files that matter

| Path | What |
|---|---|
| `zonelooter3d.html` | **The game.** Edit this one. |
| `web/3d.html` | Byte copy, synced on every commit (`cp zonelooter3d.html web/3d.html`) |
| `web/sw.js` | Service worker — offline cache, `CACHE_V = riftfall-v3` |
| `web/manifest.webmanifest` | PWA manifest, `start_url: /3d.html?live` |
| `web/icon-*.png` | Launcher icons, generated from the game's own `drawIcon` |
| `.claude/CLAUDE.md` | Project rules (patch style, no CapsuleGeometry, etc.) |

**Vercel deploys `web/` only.** The repo root holds unrelated personal files — never
widen the deploy root.

---

## 2 · Running and testing it

Open `zonelooter3d.html` directly (`file://`) for everything except service-worker
and install behaviour, which need HTTP:

```bash
cd web && python3 -m http.server 8778      # then http://127.0.0.1:8778/3d.html
```

Headless harnesses live in the session scratchpad and drive the real game through
Playwright. Launch flags that matter:

```
--use-gl=swiftshader --enable-unsafe-swiftshader   # software GL; fps is meaningless,
                                                   # draw calls + triangles are valid
--autoplay-policy=no-user-gesture-required         # needed for any audio test
```

**The project's working method is: measure, don't infer.** Repeated bugs in this
codebase were found only by instrumenting — probe spheres parented to bones, facing
marker cones, offline audio renders with a hand-rolled FFT, counting scheduled audio
events, and sweeping a rotation against its resulting world-space direction. Several
"bugs" turned out to be errors in the *test*, not the game. Screenshot and assert.

---

## 3 · Content, with numbers

### Zones — 5, gated in order

| Zone | Tier | Levels | Enemies | Elites | Boss | Materials |
|---|---|---|---|---|---|---|
| Verdant Hollow | 1 | 1–9 | 15 | 6 | Alpha of the Hollow | hide · heart · fang |
| Ashen Waste | 2 | 8–19 | 15 | 6 | Magmaw, the Unbanked | cinder · ember · magma |
| Frostbite Rift | 3 | 17–30 | 15 | 6 | Hoarking Sereth | frost · glacier · crown |
| Rotmire Swamp | 4 | 27–42 | 15 | 6 | Mother Rotmire | ichor · fungal · bloom |
| Voidspire | 5 | 38–99 | 15 | 6 | THE RIFT ITSELF | void · rift · eye |

**110 enemy definitions total** (75 trash + 30 elites + 5 bosses), **19 materials**,
**16 weapon archetypes**, **5 elite affixes**.

Only **9–10 of the 15** trash types and **3–4 of the 6** elites are drawn per zone
build (`rollRoster()`), so two visits to the same zone field a different cast.

### Rigs

**23 distinct skeletal rigs** across **8 body families** (humanoid, golem, arachnid,
serpent, wraith, eye, flyer, ooze) and 9 shape keys. All are procedural
`SkinnedMesh` built from primitives — no imported models.

Bind-space order is strict and easy to get wrong:
parent bones → `updateMatrixWorld(true)` → `new THREE.Skeleton(list)` →
`geometry.applyMatrix4(bone.matrixWorld)` → merge → `mesh.bind(skeleton)`.

> **Rotation-channel accumulation is the recurring hazard.** Channels written by
> flinch/attack with `+=` must be *reset every frame by the base pose* or they
> compound. The regression test for this has caught the same class of bug four
> separate times.

### World and camera

| | |
|---|---|
| World size | derived from screen: `w = clamp(SW*10.2, 4050, 6300)`, `h = clamp(SH*8.7, 4950, 7500)` |
| Camps per build | `14 + tier*2` normal · **6 elite** · **1 boss** · `8 + tier*2` roamers |
| Camp respawn | 55 s (42 s roamers), only once you are **>900 units away** |
| Camera | `CAM_H 975` / `CAM_BACK 536`, 34° vertical FOV |
| Scaling | `camK() = clamp(SH/812, 0.55, 1)` — rig scales with viewport height |
| Spawn | `WORLD.h − 560` (was 190; the boundary wall was in frame on load) |

The camera clamp at 1 means **portrait can never be zoomed out** from the framing
everything was tuned against. 812 is the *arena* height in portrait, not the
viewport — the tab bar takes ~48px.

---

## 4 · Systems

### Progression

- 3 classes: **Vanguard** (melee) · **Warden** (ranged) · **Riftbinder** (magic)
- `5` attribute points + `1` skill point per level
- XP curve: **46** at L1 → **4,924** at L20 → **14,520** at L40
- Main-stat damage scaling: `statDmg 0.013` per point
- Elite HP ×`0.85`, boss HP ×`0.30` (bosses are *tankier per-unit* via other multipliers)

### Skill lattice

**61 nodes** on a hex grid, radius 4, four arms — `might`, `edge`, `arcana`, `blood`.
Ring costs `[0, 1, 1, 2, 3]`. The only rule is adjacency:

```js
skCanTake(id) → n.adj.some(a => skHas(a))
```

Free movement in any direction from the root. Respec costs `400 + skSpent()*260`.

### Loot

Rarity weights `[820, 148, 27, 4.4, 0.6]`, shifted up by zone tier, enemy rank and luck.

| Rarity | Dmg mult | Affixes | Salvage |
|---|---|---|---|
| Common | 1.00 | 0 | 1 |
| Uncommon | 1.12 | 1 | 2 |
| Rare | 1.30 | 2 | 4 |
| Epic | 1.55 | 3 | 7 |
| Legendary | 1.90 | 4 | 12 |
| Relic | 2.25 | — | 20 |

Drop chance per kill: boss `1.00` ×3 rolls · elite `0.45` · trash `0.07`.

**"Is it better?"** is answered by *simulating the swap through `computeStats()`*
(`statsIf`, `itemCompare`, `slotSwapDelta`), not by a stat-weight table. This matters:
`d.mainStat` already resolves through `WEAPONS[arch].stat`, so a str ring correctly
shows **+0.0%** on a wand and **+28.6%** on an axe. A weight table would drift.

### Rift Surge — danger you choose

Auto-ramps to **1**, then bought at the obelisk for `2 + lvl` of the zone's rare
material, to a max of **6**.

| Per level | |
|---|---|
| Enemy HP | +16% |
| Enemy damage | +10% |
| Gold | +30% |
| Drop rate | +22% |
| Rarity push | +34% |

`surge.peak` is tracked separately, because the seal tithe pays on the **highest**
danger held, not the current one.

### Waystones — how you leave a zone

Three keystones light the zone's gate. The way onward is a **drop**, not a level check.

| Source | Rate |
|---|---|
| Alpha (boss) | **1 / 3** |
| Elite | **1 / 20** |
| Chest | **1 / 40** |
| Pity | **+2%** per empty elite/alpha, resets on drop |

Measured over 6,000 simulated runs per play style:

| Play style | p50 | p95 | worst |
|---|---|---|---|
| Sweeper (walks the map) | **13.3 min** | 20.7 | 31.3 |
| Rusher (loops the alpha) | 12.7 | 22.2 | 42.8 |
| Avoidant (never fights the boss) | 15.2 | 24.8 | 40.3 |

Three very different routes land within 2 minutes of each other at the median — no
single style is the "correct" way to farm it. **The pity counter is what makes it
work:** without it, p95 goes 20.7 → **44.8 min** and the worst case 31 → **89**.

Walking through a lit gate **seals** the zone: summary card, materials + gold tithe
scaled by peak surge, one guaranteed prize (Rare floor, next tier's ilvl), and a
**Rift Charge** stack.

### Rift Charge

`+8% damage` and `+10% luck` per stack, max **5**. It survives a step **deeper** and
nothing else — go back to an easier tier and it is gone. That single rule is what
makes "next zone" better than "any zone".

### Travel costs something

A **sealed** exit heals you fully. Menu travel tops you to **50%** and only reaches
zones you have opened. Leaving used to be a free full heal, which is exactly why it
never felt like anything.

---

## 5 · Audio

Fully synthesized WebAudio — no files. Two buses (`sfxBus`, `musBus` through a
`DynamicsCompressor`), WaveShaper distortion, two-stage gain (soft asymmetric preamp
clip → hard power clip), cabinet sim (highpass 86 Hz + peaking + lowpass ~4.4 kHz),
and a `ConvolverNode` fed a procedurally generated impulse response.

**Two different pieces per zone**, not one at two volumes:

| Zone | BPM | Root | Scale |
|---|---|---|---|
| Verdant | 96 | 41.20 Hz | phrygian |
| Ashen | 112 | 36.71 | phrygian dominant |
| Frost | 84 | 32.70 | aeolian |
| Rotmire | 76 | 30.87 | phrygian |
| Voidspire | 132 | 34.65 | locrian |

Intensity mix: `explore 0.34` · `combat 0.50` · `boss 0.60`. Explore is drone, pad
and three drum hits in six seconds; combat is the riff. Timing and velocity are
humanised (`hT`, `hV`) so it does not read as a sequencer.

> **Open request:** rework to **instrumental melodic rock** — no vocals, cleaner and
> less distorted, more melody. This is a rewrite of `SONGS` plus the synth voicing
> and has not been started.

---

## 6 · Profiles, saving, updating

Two isolated slots that can never overwrite each other:

| Profile | localStorage key |
|---|---|
| **LIVE** | `riftfall_save` — the original key, so existing characters migrate for free |
| **TEST** | `riftfall_save:test` |

Mode resolves from the URL first (`?test` / `?live`), then a remembered value. The
**installed app pins `?live`**, so the home-screen icon can never open the test save.

- **Dev tools** (18 buttons: level set, invulnerable, fast move, gold/mats, open all
  rifts, light the gate, spawn enemy/elite/alpha/chest, loot by rarity) are gated on
  `IS_TEST` **at the point of use**, not merely hidden. Calling them against a live
  save moves nothing.
- A save from an older `SAVE_VER` is **archived**, not dropped, and offered back in
  Camp with a Restore button.
- **Export / Import** to `.json`, because localStorage is per-origin *and* per-device.
- **Camp → Check for Update** drops every cache and reloads on a cache-busting URL.
  An installed PWA has no address bar, so this is the only hard refresh.

---

## 7 · Performance

Draw calls, not triangles, are what hurt an integrated GPU. The whole art strategy is
merging parts into one vertex-coloured geometry so detail costs triangles (cheap) not
calls (expensive).

| Measured | |
|---|---|
| Typical field | **66 draw calls** · ~439k triangles · 122 foes |
| Combat closeup | ~28–30 draw calls · ~270k triangles |
| Rift gate | **10 draw calls** (was 15 for 172 triangles before merging) |

A 15-piece scenery prop costs **one** draw call — the same as the 4-piece thing it
replaced. Graphics auto-downgrade twice if frame time exceeds 26 ms.

---

## 8 · State of play — read this before building more

**It has never been properly playtested.** Roughly 50 commits of systems and one
30-minute human session. Everything else was verified mechanically. My honest rating
as a mobile web game is **6/10**: engineering ~8.5, retention ~3, and
moment-to-moment fun genuinely *unknown*.

Known weaknesses, in order of how much they matter:

1. **Combat is thin** — auto-attack, one weapon skill, dash, potion. ARPGs live on
   *how* you fight, not stat multipliers.
2. **~2–4 hours of content.** Five zones, camps reskinned across all of them.
3. **Nothing past Voidspire.** No paragon, no seasons, no second-character reason.
   The endgame ladder (sealing offering three modifier doors, infinite depth) is
   designed but not built.
4. **No reason to return tomorrow.** No dailies, no cross-session goals.
5. **Art is competent but anonymous.** Flat-shaded low-poly is the safe default.

Open items: the soundtrack rework; a possible naming bug where a forced-`ring`
trinket came out named *"Amulet of Ruin"*; and a GitHub Support ticket to purge
history that still serves two removed files by direct SHA.

---

## 9 · Conventions

- Patches are applied with Python `str.replace()` against unique anchors — never
  block-search `<script>` tags.
- **No `CapsuleGeometry`** — use `CylinderGeometry` + `SphereGeometry`.
- After any schema change: flag it and handle the old save (archive, don't drop).
- `cp zonelooter3d.html web/3d.html` on every commit.
- Bump `BUILD` for anything worth shipping; it is visible in **Camp → Save**, and it
  is the only way to tell from a phone which build is actually running.
- Comments explain *why*, especially where a previous approach failed. Several in the
  file are load-bearing warnings.
