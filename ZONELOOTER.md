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
| Visuals | Canvas arena for combat, DOM/CSS cards for every menu |

Joystick action and a card-game look pull in opposite directions, so they're split:
the canvas renders **only** the fight (vector shapes, rarity glow, damage numbers,
particles, screen shake). Everything you read stats on — backpack, equipment, forge,
loot reveal, level-up — is DOM/CSS.

---

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

## Controls

Left thumb drags anywhere to move · ⚔️ hold to attack (auto-targets nearest) ·
✦ weapon skill · 💨 dash (i-frames) · 🧪 draught.
Desktop: WASD · Space · Q · E · R · F.

Auto-Attack is on by default (fires when anything enters range); turn it off in Camp
to attack only while holding ⚔️.

---

## Verification

Tested headless in Chromium at 390×844 @2x:

- No JS errors across all 5 zones, all 16 weapons, all 10 relics, death/respawn,
  bulk salvage, and a save/load round-trip.
- **60fps locked** in a saturated Voidspire arena (18 enemies + boss + projectiles +
  particles): median 16.7ms, p99 16.9ms, **0 frames over 33ms** across 716 frames.
- Balance curve: trash TTK 1.5s → 4.6s across tiers 1→5; bosses 13s → 42s;
  time-to-die with three enemies in contact 40s → 7-12s. Melee tankiest (63%
  mitigation), magic glassiest (38%) but higher burst, ranged highest DPS ceiling.

Per-tier enemy multipliers are renormalised via `TIER_HP_NORM` / `TIER_DMG_NORM` —
the zone tables are authored on a per-zone "feels right" scale, so raw averages climb
far too steeply without it.

## Not built

Offline/idle progress and timed jobs were explicitly scoped out (active-only).
No cloud save — progress is `localStorage` on one device.
