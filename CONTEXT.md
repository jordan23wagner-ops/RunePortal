# RunePortal — Session Context

> **Purpose:** Load this file first every Fable 5 session. It is the cached context layer.  
> **Maintenance:** Update after every feature that changes player schema, localStorage, or feature status.  
> **Source of truth:** When this doc conflicts with `runeportal_phase4.html`, the HTML wins.

---

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | RunePortal |
| **Type** | Single-file mobile-first browser ARPG |
| **File** | `C:\Users\Jordon\OneDrive\Desktop\runeportal_phase4.html` |
| **Repo** | jordan23wagner-ops/RunePortal |
| **Renderer** | [VERIFY] Canvas 2D (phase4) → migrating to PixiJS 8.x |
| **Constraint** | One HTML file. No framework. No build step. CDN imports only. |
| **Dev Server** | `python -m http.server 8080 --directory "C:\Users\Jordon\OneDrive\Desktop"` |
| **Desktop URL** | http://192.168.1.75:8080/runeportal_phase4.html |
| **Mobile URL** | http://192.168.1.69:8080/runeportal_phase4.html |

---

## Current Player Object Schema

> ⚠️ **VERIFY AGAINST HTML** — stat rename (attack→Dexterity, defence→Vigor) may or may not be complete in phase4. Read the HTML `player` init block and update this section.

```javascript
// LAST CONFIRMED STATE (phase3 — verify phase4 matches or differs)
player = {
    x, y,
    hp: 100,
    maxHp: 100,
    speed: 2,
    skills: {
        attack: 10,      // may be renamed to dexterity in phase4
        strength: 10,
        defence: 10,     // may be renamed to vigor in phase4
        magic: 10,       // may be renamed to intelligence in phase4
        ranged: 10,
        xp: { attack: 0, strength: 0, defence: 0 },
        level: { attack: 1, strength: 1, defence: 1 }
    },
    baseStats: { attack: 10, strength: 10, defence: 10 },
    equippedBonuses: { attack: 0, strength: 0, defence: 0 }
}
backpack = { items: [], gold: 0 }
```

**IMPORTANT:** If stat rename is complete in phase4, this schema will look like:
```javascript
skills: {
    dexterity: 10,    // controls attack speed
    strength: 10,     // controls damage
    vigor: 10,        // controls max HP (50 + vigor * 5)
    intelligence: 10, // controls magic damage (future)
    xp: { dexterity: 0, strength: 0, vigor: 0, intelligence: 0 },
    level: { dexterity: 1, strength: 1, vigor: 1, intelligence: 1 }
}
```

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

> ⚠️ **VERIFY AGAINST HTML** — read the save/load functions and list exact keys

```javascript
// EXPECTED SAVE KEYS (verify phase4 matches)
localStorage.setItem('runeportal_save', JSON.stringify({
    skills,          // player.skills object
    hp,              // player.hp
    gold,            // backpack.gold
    items,           // backpack.items array
    baseStats,       // player.baseStats
    equippedBonuses  // player.equippedBonuses
}))
```

**Save cadence:** Auto-save every 10 seconds + on zone transition  
**Load guard:** Always wrapped in try/catch — bad save = localStorage.clear() + hard refresh  
**Debug command:** `localStorage.clear()` in browser console → Ctrl+Shift+R

---

## Features: Confirmed Built (verify against phase4 HTML)

| Feature | Status | Notes |
|---------|--------|-------|
| Isometric 2D tile world (20x20 grid) | ✅ Built | Green/red checkerboard |
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
| Stat rename (ATK→DEX, DEF→VIG, +INT) | ⚠️ VERIFY | Listed as todo in phase3 handoff — may be done in phase4 |
| Save state (localStorage) | ⚠️ VERIFY | Listed as todo in phase3 — may be done in phase4 |

---

## Features: Next In Queue (priority order)

1. **Player death + respawn** at Homestead Bonfire (center for now)
   - Drop standard gear at death location, 5 min despawn timer
   - 50% gold tax on death
   - Death summary screen with respawn button
   - Untradable armor schema stub (never drops, broken state on death)

2. **Multiple zones** — minimum 5 with unique environments
   - All zones accessible (no locks)
   - Enemy HP/damage scaling by zone
   - Background environments (parallax layers, no tile grid)

3. **Minimap** — current zone, player position dot

4. **PixiJS migration** — full renderer swap from Canvas 2D to PixiJS 8.x
   - Layered character sprites (body, helmet, chest, legs, boots, weapon, aura)
   - Particle system for auras and hit effects
   - Parallax zone backgrounds

5. **Homestead Hub** — Bonfire centered, merchant huts, portal room

6. **Gear affix system** — prefix + suffix on all items (see GDD_v2.md section 8)

7. **Dodge/roll** — dedicated button, 1.5s cooldown, 0.25s i-frames

8. **Crafting system** — timed (100%) vs. instant (60%), offline queue

9. **Idle mode** — offline XP accumulation (8hr cap), passive gold from Barracks

---

## Enemy System

| Property | Value |
|----------|-------|
| Count spawned | 10 (phase3) — [VERIFY phase4] |
| Rarities | Common, Rare, Epic |
| Aggro range | 80px |
| Wander behavior | Random direction, changes every 2–3 seconds |
| Respawn | After death, rarity-based timing |
| Boundary | Clamped to tile grid |

---

## UI Architecture

| Element | Location | Notes |
|---------|----------|-------|
| BAG button | Top-right | Opens backpack overlay |
| Backpack overlay | Full screen | Dark slate #1a1a2e, gold accents #e8c97a |
| BACKPACK tab | Backpack panel | Item grid |
| EQUIPMENT tab | Backpack panel | 5 gear slots |
| Gold display | Backpack panel top | — |
| HUD HP bar | [VERIFY position in HTML] | — |
| HUD XP display | [VERIFY position in HTML] | — |

---

## Gear System (Current + Target)

**Current rarities in code:** Common, Rare, Epic  

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
