# RunePortal — Backlog & Known Issues

> Minor tweaks and bugs confirmed working but not yet fixed.  
> Pull from this list when starting polish/bug-fix sessions.  
> Format: [Priority] — Description — Discovered after [feature]

---

## UI / Layout

- **[Low]** Minimap overlaps slightly with death sickness notification — move minimap to top-right of screen
- **[Low]** Virtual joystick sits too low on left side — nudge up slightly so death sickness notification doesn't cover it

## Gameplay Bugs

- **[High]** On death, player respawns in current zone instead of Homestead Bonfire — spec (GDD §15) says respawn at Homestead. Now that Homestead zone exists, respawn should transition player to Homestead zone center.
- **[Medium]** Player can freely move while a shop/merchant UI is open at the Homestead — movement should be locked when any shop screen is active, unlocked on close.

## Loot / Gear

- **[Future]** Legendary gear currently uses "epic × 2 stats" as a placeholder — needs proper affix system (GDD §8, 3 affixes at Legendary tier). Fix when affix system is implemented.

## Zone System

- *(empty — portal label radius fix shipped with the PixiJS migration)*

---

## Completed (moved from backlog)

- ✅ Portal proximity label radius bumped 60px → 120px (2026-06-11, PixiJS migration patch)
- ✅ Death + respawn system (GDD §15)
- ✅ Zone system — Ashfields, Bleakwood Hollow, Ironbone Flats
- ✅ Minimap
- ✅ Per-stat XP and leveling
- ✅ Backpack + equipment UI (4 tabs)
- ✅ Homestead hub

---

*BACKLOG.md — RunePortal — jordan23wagner-ops*
