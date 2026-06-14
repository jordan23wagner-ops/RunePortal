# RunePortal — Session Context

> **Purpose:** Load this file first every Fable 5 session. It is the cached context layer.  
> **Maintenance:** Update after every feature that changes player schema, localStorage, or feature status.  
> **Source of truth:** When this doc conflicts with `runeportal_phase4.html`, the HTML wins.

---

## SESSION_STATE (for multi-tool sync)

> **For Groq/Qwen/Claude Web fallback:** Load this section first.  
> **Updated after every session.**

| Item | Value |
|------|-------|
| **Current Phase** | Phase 5 — Three.js migration + Open World |
| **Active File** | `runeportal_phase5.html` (1,598 lines) |
| **Renderer** | Three.js r128 (from PixiJS, 2026-06-13) |
| **Last Work** | Danger bar + character/enemy facing (2026-06-13) |
| **Next Task** | Waypoint/campfire discovery system |

### Last 3 Patches
1. [2026-06-13] Danger bar UI + player/enemy facing direction
2. [2026-06-13] Homestead 3D environment (9 buildings)
3. [2026-06-13] Three.js r128 full migration (replaced PixiJS)

### Known Bugs
- None currently

### Dev Notes
- Save key: `runeportal_save` (localStorage)
- Three.js version: r128 — NO CapsuleGeometry
- Death sickness: Active (halves max HP)
- Minimap: 2D canvas (top-right)
- Joystick: Mobile (bottom-left)

---

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | RunePortal |
| **Type** | Single-file mobile-first browser ARPG |
| **File** | `C:\Users\Jordon\OneDrive\Desktop\runeportal_phase4.html` |
| **Repo** | jordan23wagner-ops/RunePortal |
| **Renderer** | ✅ PixiJS 8.x WebGL (CDN UMD) — migrated from Canvas 2D 2026-06-11. Placeholder Graphics sprites; PNG art swap pending (Open Q #5) |
| **Constraint** | One HTML file. No framework. No build step. CDN imports only. |
| **Dev Server** | `python -m http.server 8080 --directory "C:\Users\Jordon\OneDrive\Desktop"` |
| **Desktop URL** | http://192.168.1.75:8080/runeportal_phase4.html |
| **Mobile URL** | http://192.168.1.69:8080/runeportal_phase4.html |

---

## Current Player Object Schema

> ✅ **VERIFIED AGAINST phase4 HTML — 2026-06-11.** Stat rename is COMPLETE in phase4.
> Confirmed stat names: `dexterity`, `strength`, `vigor`, `intelligence`.
> ⚠️ Legacy `magic` and `ranged` keys exist only in the **phase3** `skills` object — phase4 does
> NOT carry them. Flagged for cleanup in phase3 if it's ever revived; do not port them forward.
> (Note: phase4 gear uses `weaponStyle: 'melee' | 'ranged' | 'magic'` — that is a gear field, not a player stat.)

```javascript
// CONFIRMED phase4 state (2026-06-11)
player = {
    x, y,                 // tile coords (GRID = 30)
    hp: 100, maxHp: 100,  // maxHp derived: 50 + vigor*5 (halved during death sickness)
    speed: 2,
    isDead: false,        // ⚠️ renamed from `dead` 2026-06-11 — persisted in save
    uiLocked: false,      // transient movement lock while shop/panel UI open — NEVER saved (added 2026-06-11)
    currentZone: 'ashfields', // ⚠️ added 2026-06-11 — synced with currentZoneId, persisted in save
    deathSickness: 0,     // seconds remaining
    skills: {
        xp:    { dexterity: 0, strength: 0, vigor: 0, intelligence: 0 },
        level: { dexterity: 1, strength: 1, vigor: 1, intelligence: 1 }
    },
    baseStats:       { dexterity: 10, strength: 10, vigor: 10, intelligence: 10 },
    equippedBonuses: { dexterity: 0,  strength: 0,  vigor: 0,  intelligence: 0 },
    equipped: { weapon: null, helmet: null, chest: null, legs: null, boots: null },
    untradableArmor: { equipped: false, broken: false } // stub added 2026-06-11 — NEVER drops on death, no functionality yet
}
backpack = { items: [], food: [], materials: { iron_ore, bog_root, void_shard, iron_bar, bog_ingot, void_crystal }, gold: 0 }
```

> ⚠️ **SCHEMA CHANGED 2026-06-11** (`isDead` rename + `untradableArmor` stub) — clear localStorage before testing.

---

## Stat System

| Stat | Controls | HP Formula |
|------|----------|-----------|
| Dexterity (or attack) | Attack speed | — |
| Strength | Melee damage | — |
| Vigor (or defence) | Max HP | `50 + (vigor * 5)` |
| Intelligence (or magic) | Magic damage (future) | — |

- XP split per kill: **[VERIFY from HTML]** — target is 40% DEX / 40% STR / 20% VIG
- Level threshold: `100 * currentLevel` XP per level
- Each stat levels independently

---

## localStorage Schema

> ✅ **VERIFIED AGAINST phase4 HTML — 2026-06-11.** Single key: `runeportal_save`.

```javascript
// CONFIRMED phase4 save payload (2026-06-11)
localStorage.setItem('runeportal_save', JSON.stringify({
    skills,          // player.skills (xp + level objects)
    hp,              // player.hp
    baseStats,       // player.baseStats
    equippedBonuses, // player.equippedBonuses
    equipped,        // player.equipped (5 slots)
    isDead,          // player.isDead       — added 2026-06-11
    untradableArmor, // player.untradableArmor stub — added 2026-06-11
    deathSickness,   // player.deathSickness
    gold, items, food, materials, // backpack
    homestead, guilds, craftQueue, gardenPlot, shrineBuff,
    currentZone      // player.currentZone — ⚠️ replaced `zoneId` key 2026-06-11
}))
```

**Save cadence:** Auto-save every **10 seconds** in phase4 (`lastSave >= 10` in update loop) + on death and on respawn. There is NO save-on-zone-transition in phase4. (phase3 used a 30s `setInterval` — that cadence does not apply to phase4.)  
**Load guard:** Always wrapped in try/catch — bad save = localStorage.clear() + hard refresh  
**Debug command:** `localStorage.clear()` in browser console → Ctrl+Shift+R (or DEV panel → "Clear save data & reload")

---

## Features: Confirmed Built (verify against phase4 HTML)

| Feature | Status | Notes |
|---------|--------|-------|
| 2D world grid (30x30, GRID=30) | ✅ Built | Checkerboard tile RENDERING removed 2026-06-11 (PixiJS migration) — zones now render gradient backgrounds; logical tile coords unchanged |
| Player movement — WASD + Arrow keys | ✅ Built | Speed = 0.1 |
| Virtual joystick (mobile) | ✅ Built | Bottom-left |
| Auto-combat on proximity | ✅ Built | 80px range |
| Enemies fight back | ✅ Built | 10 spawned |
| XP system per stat | ✅ Built | Level at 100 * level XP |
| Loot drops — gear (30%) + gold | ✅ Built | On enemy death |
| Backpack UI | ✅ Built | Dark slate, Diablo theme |
| Equipment slots (Weapon, Helmet, Chest, Legs, Boots) | ✅ Built | — |
| Tab switching (BACKPACK / EQUIPMENT) | ✅ Built | — |
| Enemy respawning (rarity-based) | ✅ Built | Common/Rare/Epic |
| Gold tracked in backpack.gold | ✅ Built | — |
| Boundary clamping | ✅ Built | Player + enemies stay in grid |
| Close button on backpack | ✅ Built | — |
| Stat rename (ATK→DEX, DEF→VIG, +INT) | ✅ Built | Confirmed in phase4 (2026-06-11) |
| Save state (localStorage) | ✅ Built | Confirmed in phase4 — 10s auto-save (2026-06-11) |
| Player death + respawn (GDD §15) | ✅ Built | 2026-06-11 — drops all equipped standard gear (5 min despawn pile), 50% gold tax, death summary + RESPAWN, respawns at HOMESTEAD CENTER via fade transition (backlog fix 2026-06-11), death sickness retained |
| Untradable armor stub | ✅ Built | `player.untradableArmor = {equipped:false, broken:false}` — stub only, never drops |
| Zone system (GDD §9/§10) | ✅ Built | 2026-06-11 — Ashfields (Lv1-5), Bleakwood Hollow (Lv5-10), Ironbone Flats (Lv10-20) + Homestead hub. Per-zone enemyTypes config, named bosses (The Warden / The Nightmother / General Mourne), rarity multipliers, zone dropTables, 0.5s fade transitions, portal proximity labels, HUD zone name + rec. level |
| Legendary rarity tier | ✅ Built | Orange #ff8f00, 5% drop in Ironbone Flats, 2x epic stats, 500g sell — generated from epic bases (no GEAR_DB entries yet) |
| PixiJS renderer (GDD §3) | ✅ Built | 2026-06-11 — full Canvas 2D → PixiJS 8.x swap. 4-layer stage (bg gradient / world / particles / ui+HUD); layered player container (5 gear layers tint by rarity + aura particles); enemy containers (rarity tint, HP bar, glow, phasing/heal-flash kept); hit sparks; loot shapes + labels; portal labels at 120px; HUD rebuilt in Pixi (it was canvas-drawn, NOT HTML); PIXI ticker = the single loop |
| Character art pass (GDD §2, XP Hero style) | ✅ Built | 2026-06-11 — player stick figure (origin at feet) with shaped gear: helmet dome, chest trapezoid, leg plates, boots, sword; gear still white-drawn + rarity-tinted. Enemies: per-type humanoid silhouettes (ENEMY_SHAPE_DEFS — Ashwalker/Brute/Bone Collector/Hollow Hunter/Wraith/Construct/Revenant), rarity as light cast over type colors, hit flash = white overlay. All PIXI.Graphics, no PNGs — real art still pending (Open Q #5) |
| Polish pass (5 fixes) | ✅ Built | 2026-06-12 — (1) HP NaN sealed: `loadGame` now `Number.isFinite`-gates hp (JSON turns NaN→null, which passed the old guard); `recalcMaxHp` self-heals non-finite hp/vigor every frame; HUD + Bonfire show `Math.ceil(hp)`. (2) Aura → subtle halo: max 6 particles, 3-4px, orbiting ~13-17px around torso center (was 8-12 emitted/frame cloud). (3) Equipment tab item names colored by rarity via `.slot .slot-item.<rarity>` CSS (incl. future tiers mythic/void/radanite/titanite/zionite per GDD); empty slots stay gray. (4) Player animations — walk (legs ±12px sin, arms counter-swing, head bob ±2px), attack (right arm (10,-16)→(18,-26) 0.15s out / 0.1s back, phased off existing tick % atkInterval), idle breathing (torso ±2%); gear layers follow their limbs (leg plates/boots redrawn to joints, helmet rides head, chest scales at hip, weapon tracks right hand). (5) Creature shapes: Hollow Hunter = quadruped werewolf, Wraith Stalker = legless spectral taper + 3 wisps + hollow head, Iron Construct = box torso/rect limbs/eye slots + ±2px stomp every 20 frames; humanoids + bosses unchanged. All render-layer only — NO schema change |

---

## Features: Next In Queue (priority order)

1. ~~**Player death + respawn**~~ ✅ DONE 2026-06-11 (respawns at Homestead center via fade transition since the 2026-06-11 backlog fix — snap to the Bonfire itself when the bonfire respawn point visual is built)
   - ✅ Drop equipped standard gear at death location, 5 min despawn timer
   - ✅ 50% gold tax on death (round down, no recovery)
   - ✅ Death summary screen with RESPAWN button
   - ✅ Untradable armor schema stub (never drops; broken-state behavior still TODO)

2. ~~**Multiple zones**~~ ✅ 3 of 5 DONE 2026-06-11 (Ashfields / Bleakwood Hollow / Ironbone Flats per GDD §9, all open, scaled enemies, gradient backgrounds)
   - Remaining: Zones 4-5 (The Brine Wastes, Verdant Decay) for v1.0 ship criteria
   - Parallax layered backgrounds still pending (currently CSS-style canvas gradients — PixiJS migration handles real art)

3. **Minimap** — current zone, player position dot

4. ~~**PixiJS migration**~~ ✅ DONE 2026-06-11 — renderer swapped to PixiJS 8.x
   - ✅ Layered character sprites (body, helmet, chest, legs, boots, weapon, aura) — placeholder Graphics rects
   - ✅ Particle system for auras and hit effects
   - Remaining: real PNG sprite art (blocked on Open Q #5) + parallax multi-layer backgrounds (currently single gradient layer)

5. **Homestead Hub** — Bonfire centered, merchant huts, portal room

6. **Gear affix system** — prefix + suffix on all items (see GDD_v2.md section 8)

7. **Dodge/roll** — dedicated button, 1.5s cooldown, 0.25s i-frames

8. **Crafting system** — timed (100%) vs. instant (60%), offline queue

9. **Idle mode** — offline XP accumulation (8hr cap), passive gold from Barracks

---

## Enemy System

| Property | Value |
|----------|-------|
| Count spawned | 12 + 1 named boss per combat zone (phase4, verified 2026-06-11) |
| Rarities | Common (1x), Rare (2x HP / 1.5x dmg / 1.5x XP / 2x gold), Epic (4x HP / 2x dmg / 2x XP / 4x gold) — multipliers on zone base stats |
| Aggro range | 80px |
| Wander behavior | Random direction, changes every 2–3 seconds |
| Respawn | After death, rarity-based timing |
| Boundary | Clamped to tile grid |

---

## UI Architecture

| Element | Location | Notes |
|---------|----------|-------|
| Minimap | Top-right, 8px inset (PixiJS) | Moved from bottom-right 2026-06-11 (backlog fix) |
| BAG/HOME/DEV buttons | Right edge, below minimap (y 106/126/146; tap zones y 100–166) | Moved from top-right corner 2026-06-11 to make room for the minimap |
| Virtual joystick | Bottom-left, center (70, VH-110) | Nudged up 40px 2026-06-11 (backlog fix) — clears death sickness banner; HUD HP/GOLD/bar shifted to match |
| Backpack overlay | Full screen | Dark slate #1a1a2e, gold accents #e8c97a |
| BACKPACK tab | Backpack panel | Item grid |
| EQUIPMENT tab | Backpack panel | 5 gear slots |
| Gold display | Backpack panel top | — |
| HUD HP bar | Bottom-left, above joystick area | PixiJS (hudContainer in uiEffectsLayer), NOT HTML — `HP: x/y` text + 140px bar (bar added 2026-06-11) |
| HUD XP display | Top-left, under stats | PixiJS — 4 per-skill `LvN` labels + 80px XP bars |
| Whole HUD layer | PixiJS, same coords as old canvas HUD | Stats / BAG / HOME / DEV / zone name / gold / joystick ring / minimap — tap targets still handled by canvas listeners |

---

## Gear System (Current + Target)

**Current rarities in code:** Common, Rare, Epic, Legendary (added 2026-06-11 — drops only in Ironbone Flats at 5%)  

**Target rarities (GDD_v2.md):**
1. Rare
2. Epic
3. Legendary
4. Mythic
5. Void
6. Radanite
7. Titanite
8. Zionite
9. Untradable Upgraded (kept on death, breaks, repairable)

**Target affix system:** Prefix (stat modifier) + Suffix (special effect)  
See `RunePortal_GDD_v2.md` Section 8 for full affix table.

---

## Dev Environment

| Item | Path |
|------|------|
| Game file | `C:\Users\Jordon\OneDrive\Desktop\runeportal_phase4.html` |
| Studio script | `C:\Users\Jordon\runeportal_studio.py` |
| Memory file | `C:\Users\Jordon\runeportal_memory.json` |
| Patterns file | `C:\Users\Jordon\runeportal_patterns.json` |
| Backups folder | `C:\Users\Jordon\OneDrive\Desktop\runeportal_backups\` |
| Hardware | AMD Ryzen 7 5700U, 16GB RAM, Windows 11, PowerShell, Python 3.13 |

---

## Design Reference

Full game design spec lives in `RunePortal_GDD_v2.md`:
- World lore: The Shattered Expanse, The Rend
- All 10 zones with enemy rosters and boss designs
- Full gear rarity table with aura colors
- Full affix table (prefixes + suffixes)
- Homestead hub layout
- Idle RPG system design
- Crafting system (timed vs. instant)
- Death system (untradable armor)
- v1.0 ship criteria checklist

---

## Open Design Questions (Decisions Needed Before Implementation)

| # | Question | Current Assumption |
|---|----------|--------------------|
| 1 | Dropped gear on death — lootable on re-entry or lost? | 5 min lootable window |
| 2 | Instant craft failure — full material loss or partial? | Full loss |
| 3 | XP split per kill — exact percentages? | 40% DEX / 40% STR / 20% VIG |
| 4 | Gold lost on death — recoverable or flat tax? | 50% flat tax, no recovery |
| 5 | Sprite source — AI-generated, LPC free assets, or commissioned? | UNDECIDED — blocks PixiJS migration |
| 6 | Crafting recipes — one-time unlock or repeat purchase? | UNDECIDED |
| 7 | Idle combat — last visited zone only, or player-selectable? | Last visited |

---

*CONTEXT.md — RunePortal — jordan23wagner-ops — June 2026*  
*Update this file after every session that changes player schema, localStorage keys, or feature status.*
