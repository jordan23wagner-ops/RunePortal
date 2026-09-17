# RIFTFALL — Zone Looter

**File:** `zonelooter.html` (single file, zero dependencies, zero asset files)
**Save Key:** `riftfall_save` — **completely separate from `runeportal_save`**

Standalone mobile web game. Not part of the RunePortal Phase 5 codebase — no shared
code, no shared save, no shared schema. Open the file directly or serve it statically.

---

## Design decisions

| Decision | Choice |
|---|---|
| Codebase | New standalone file, separate save slot |
| Combat | Virtual joystick + auto-targeted attacks |
| Pacing | Active-only — no offline progress, no timers |
| Structure | Explorable zone with enemy camps you choose to pull |
| Visuals | Rigged skeletal sprites in a canvas arena; DOM inventory grid |

The canvas renders **only** the fight. Everything you read stats on — inventory,
equipment, forge, loot reveal, level-up — is DOM/CSS.

## Sprite engine

Every character is a **bone hierarchy**, not a flipbook. Each bone bakes its shaded
body part once into an offscreen canvas (vertical gradient, dark outline, clipped
specular), so a frame is one `drawImage` per bone. Animation is **procedural**: a
`pose()` function writes joint angles each frame, giving real interpolated motion
rather than N fixed frames.

- **9 rig archetypes** — humanoid, quadruped, arachnid, wraith, golem, flyer, blob,
  worm, eye — mapped from each enemy's existing `shape`, so all 65 enemies are
  covered by palette and proportion variation.
- **States**: idle (breathing), walk (limb swing driven by *distance actually
  travelled*, so slowed or shoved enemies stay in sync), attack (anticipation →
  strike → recover, and separate draw-and-loose / gather-and-thrust poses for bow
  and staff), hurt flinch, and a death collapse — enemies leave a body that topples
  and fades instead of popping out of existence.
- **Equipped weapons render on the hero** and swing with the arm: blade family,
  axe, mace, bow with a drawing string, crossbow, gun, staff and orb with emissive
  tips, tome.
- Soft contact shadows, depth-sorted draw order, and rig ground-lines/widths
  **measured from the rig itself** at boot, so shadows and health bars stay correct
  when proportions change.
- Palettes are **luminance-aware**: ice and bone enemies were blowing out to flat
  white silhouettes until the base got pulled down to leave headroom for highlights.

---

## Zone structure

Each zone is a world several screens across with a camera that follows you — not a
fixed arena. Enemies live in **camps** and idle at home until you walk into their
aggro radius; pulling one alerts its packmates, so you fight **3–5 at a time**, not
a continuous horde. Walk away and they leash back to camp and heal. Clear a camp and
it stays clear for ~55s, and only respawns once you are 520px away.

- ~10 camps per zone: 6+tier normal, 2 elite, 1 boss placed as far from the entrance
  as the layout allows. 30–45 enemies alive in the world.
- You enter at the south edge, ~500px from the nearest camp, and explore outward.
- Minimap (top right) shows camps by kind, chests, the camera window and you;
  an edge arrow points at the nearest uncleared camp.
- 3 chests scattered in the world, respawning 95s after opening.
- Camps cleared is tracked in the HUD (`⚑ 3/10`).
- Off-camera characters are culled from both AI and drawing.

## Systems

- **5 zones**, tier 1–5, free travel at any time. 10 enemy types + 2 elites + 1 boss each (**65 enemies**).
- **5 drop rarities** — Common → Legendary. Relics are a 6th, crafted-only tier.
- **16 weapons** across melee/ranged/magic, each with a distinct attack pattern
  (arc cleaves, piercing shots, chaining bolts, homing bolts, splash, multi-shot).
- **Min/max damage rolls** — every weapon instance rolls its own damage window inside
  the archetype's band, surfaced as a roll-quality %. Every affix rolls 0–100% too.
- **10 equipment slots**, two-handed weapons lock the offhand.
- **17 affixes** with ilvl-scaled ranges.
- **Salvage** — single or bulk-by-rarity, yields tiered essences.
- **Upgrade** any item to +10 (+6% per rank).
- **10 craftable relics**, each with a unique mechanical power (burn, chill, poison,
  chain-extension, stacking damage reduction, detonations, extra pierce…).
- **Treasure chests** spawn on a kill counter, roll with a rarity floor of Uncommon.
- **Elites** every 22 kills, **bosses** every 75, with telegraphed charge/slam/barrage/summon patterns.
- **WebAudio** synthesised SFX — no audio files. Rarity-scaled loot stings.
- **Inventory grid** — square rarity-framed item cells with glow, ilvl and +N badges,
  padded to full carrying capacity; tap for the detail sheet.
- **Graphics tiers** (Sharp / Balanced / Battery) plus an adaptive fallback that
  drops a tier after sustained slow frames.

## Layout

The artifact host pads `:root` by the safe-area insets, which shifts a flow-layout
app down by the inset. `#app` is therefore `position:fixed; inset:0` (immune to root
padding, no measured height), with an in-flow spacer keeping the document tall for
embeds that size a frame to content. A `#stage` flex child holds the arena *and* the
panels, so a panel is geometrically bounded by the tab bar and can never hide the
tail of a scrolled list behind it.

## Controls

**Drag anywhere in the playable area to move** — the joystick is dynamic: it appears
under your finger wherever you touch, and is clamped so the ring is never cut off at
a screen edge. Touches that start on an action button never steer. ⚔️ hold to attack
(auto-targets nearest) ·
✦ weapon skill · 💨 dash (i-frames) · 🧪 draught.
Desktop: WASD · Space · Q · E · R · F.

Auto-Attack is on by default (fires when anything enters range); turn it off in Camp
to attack only while holding ⚔️.

---

## Verification

Tested headless in Chromium at 390×844 @2x:

- No JS errors across all 5 zones, all 16 weapons, all 10 relics, death/respawn,
  bulk salvage, and a save/load round-trip.
- **~60fps** in a saturated Voidspire arena (18 rigged enemies + boss + projectiles
  + particles): median 16.7ms, p99 23.7ms, **0 frames over 33ms**.
- Rig rendering is **fill-rate bound, not draw-call bound** — established by
  ablation, not assumption. At DPR 2 the same scene runs ~48fps; at DPR 1.5 it holds
  60 with every effect on, so the arena canvas caps at 1.5 (the DOM UI is unaffected
  and stays crisp). A packed part-atlas was tried and measured *slower* — rebuilding
  an atlas per entity size/flash palette cost more than the texture binds it saved.
- Layout, measured against a copy wrapped in the host's own CSS with 59/34px insets
  applied inline (env() resolves to 0 in headless Chromium, so the insets must be set
  on documentElement or the tab bar measures 45px instead of its real 79px): app and
  HUD flush at top 0, tab bar on screen, and every panel — Bag (incl. its footer
  buttons), Hero, Forge, Rifts, Camp — stops exactly at the tab bar top when scrolled
  fully down. The same test fails every panel against the pre-fix layout.
- Camp loop, measured: everything idle at spawn and outside aggro range; stepping
  inside wakes the whole pack (3/3) and no other camp; **max 3 enemies engaged at
  once**; a level-1 character clears a camp in 7–12s finishing at 61–79% HP.
  Leash traced end to end: chase to 466px from home → return → idle at 33px, healed.
- Balance curve: trash TTK 1.5s → 4.6s across tiers 1→5; bosses 13s → 42s;
  time-to-die with three enemies in contact 40s → 7-12s. Melee tankiest (63%
  mitigation), magic glassiest (38%) but higher burst, ranged highest DPS ceiling.

Per-tier enemy multipliers are renormalised via `TIER_HP_NORM` / `TIER_DMG_NORM` —
the zone tables are authored on a per-zone "feels right" scale, so raw averages climb
far too steeply without it.

## Not built

Offline/idle progress and timed jobs were explicitly scoped out (active-only).
No cloud save — progress is `localStorage` on one device.
