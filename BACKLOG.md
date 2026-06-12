# RunePortal — Backlog & Known Issues

> Minor tweaks and bugs confirmed working but not yet fixed.  
> Pull from this list when starting polish/bug-fix sessions.  
> Format: [Priority] — Description — Discovered after [feature]

---

## UI / Layout

- **[Low]** Void-tier item-name CSS (`#1a0030` + purple glow) added speculatively per GDD color table — verify readability on the dark panel when Void gear actually drops (zones 6+).

## Gameplay Bugs

- *(empty — HP NaN guard shipped with the polish pass patch 2026-06-12)*

## Loot / Gear

- **[Future]** Legendary gear currently uses "epic × 2 stats" as a placeholder — needs proper affix system (GDD §8, 3 affixes at Legendary tier). Fix when affix system is implemented.

## Zone System

- *(empty — portal label radius fix shipped with the PixiJS migration)*

---

## Completed (moved from backlog)

- ✅ HP NaN fix — `loadGame` Number.isFinite gate + per-frame self-heal in `recalcMaxHp` + integer HP display (2026-06-12, polish pass)
- ✅ Aura reworked: cloud → subtle halo (max 6 orbiting 3-4px particles, ~15px radius around torso) (2026-06-12, polish pass)
- ✅ Equipment tab item names colored by rarity (CSS rules were missing; JS class was already set) (2026-06-12, polish pass)
- ✅ Player walk / attack / idle-breathing animations; gear layers follow their limbs (2026-06-12, polish pass)
- ✅ Enemy shape split — Hollow Hunter quadruped, Wraith Stalker legless spectral, Iron Construct mechanical + stomp; humanoids/bosses unchanged (2026-06-12, polish pass)
- ✅ Minimap moved to top-right, 8px inset; BAG/HOME/DEV buttons + tap zones moved below it (2026-06-11, art pass patch)
- ✅ Virtual joystick nudged up 40px — clear of death sickness banner (2026-06-11, art pass patch)
- ✅ Death respawn now fades to Homestead center via existing zone transition (GDD §15) (2026-06-11, art pass patch)
- ✅ Movement locked while any shop/panel UI is open — transient `player.uiLocked`, never saved (2026-06-11, art pass patch)
- ✅ Portal proximity label radius bumped 60px → 120px (2026-06-11, PixiJS migration patch)
- ✅ Death + respawn system (GDD §15)
- ✅ Zone system — Ashfields, Bleakwood Hollow, Ironbone Flats
- ✅ Minimap
- ✅ Per-stat XP and leveling
- ✅ Backpack + equipment UI (4 tabs)
- ✅ Homestead hub

---

*BACKLOG.md — RunePortal — jordan23wagner-ops*
