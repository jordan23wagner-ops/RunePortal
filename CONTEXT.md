# RunePortal — Session Context

> **Purpose:** Load this file first every session. It is the cached context layer.
> **Maintenance:** Update after every feature that changes player schema, localStorage, or feature status.
> **Source of truth:** When this doc conflicts with `runeportal_phase5.html`, the HTML wins.

---

## SESSION_STATE

| Item | Value |
|------|-------|
| **Current Phase** | Phase 5 — Three.js r128, Open World |
| **Active File** | `runeportal_phase5.html` (3,765 lines) |
| **Renderer** | Three.js r128 (migrated from PixiJS 2026-06-13) |
| **Last Work** | Sprint 3 COMPLETE — Pool of Refreshment + Garden Potion Crafting (2026-06-14) |
| **Next Task** | Waypoint discovery, teleport scroll fast-travel UI |
| **Save Key** | `runeportal_save` (localStorage) |
| **Dev Server** | `python -m http.server 8080 --directory "C:\Users\Jordon\OneDrive\Desktop\RunePortal"` |

---

## Last 3 Patches

1. **[2026-06-14] Sprint 3 — Pool of Refreshment + Garden Potions (2 commits)**
   - C1: POOL_TIERS (Murky/Clear/Sacred/Blessed, 30%-100% HP, 5m→1m cooldown), pool 3D mesh (CylinderGeometry rim + emissive water disc + blue PointLight at -4,0,-9), openPoolUI/closePoolUI/renderPoolPanel/batheInPool/upgradePool, live countdown setInterval, poolTier+poolLastUsed in localStorage, HS_BUILDINGS entry, full KeyE/Escape/syncPanelState wiring
   - C2: POTION_RECIPES (36 recipes, 9 categories, 4 grades), 5 free starters, unlock-with-gold for rest, Garden GROW/BREW tab switcher, renderBrewTab (grouped by category, locked/unlocked state), unlockPotion/brewPotion (stacks qty), useConsumableItem extended for instant_hp + buff dispatch, critDmgMult wired into crit formula, atkSpeedBuff wired into atkInterval, unlockedPotions in localStorage

2. **[2026-06-14] Loot Sprint 2 (2 commits)**
   - C1: ZONE_TIER mapping (ash=T1..ashen_crown=T5), LOOT_ROLLS (std:2/elite:3/boss:5), ITEM_DROP_CHANCE, MATERIAL_DROP_CHANCE, ZONE_MATERIAL_TABLE (5 tiers weighted), ELITE/BOSS_BONUS_MATERIALS, randRange/rollGold/rollMaterial/matDropColor, dropLootFromEnemy full rewrite (multi-roll, typed enemy, pile.materialDrops[]), pickup handler handles materialDrops qty
   - C2: ZONE_RARITY_SHIFT, ZONE_GEAR_POOL (T1 basics to T5 all types), rollRarity() (RARITY_TIERS + shift + boss/elite boosters), pickSetDrop() (player-aware 2-pc preference), rollGear() replacing rollZoneGear, set items gated T4+, enhanced pickup notifications (mythic+ rarity label)

3. **[2026-06-14] Equipment Sprint 1 (3 commits)**
   - C1: SLOT_LABEL/SLOT_ORDER, 11 slots (offhand/hands/back/neck/ring1/ring2), player.combatMeta, equipFromBag ring routing + 2H lock, bp-slot.locked CSS, set bonus display, atkInterval weapon speed, crit combatMeta
   - C2: WEAPON_TYPES[8]/OFFHAND_TYPES[3]/MAGE_BOOKS, GEAR_DB +30 items (shields/quivers/books/hands x4/capes x5/amulets x4/rings x4/typed weapons x6), recalcEquippedBonuses full rewrite
   - C3: RARITY_TIERS[9]/AFFIX_CAPS, SET_DEFINITIONS[3]+getActiveSetBonuses(), mythic/ancient/eternal/set tiers, CSS glow keyframes

---

## Feature Status

| Feature | Status |
|---------|--------|
| Three.js migration | Done 2026-06-13 |
| Zone system (7 zones) | Done 2026-06-13 (ash/blea/iron/rot/veil/cind/ashen_crown) |
| Minimap + fog of war | Done 2026-06-14 (50x50 grid, radius-3 reveal) |
| Homestead Building UI | COMPLETE 2026-06-14 (all 9 buildings wired) |
| Equipment Sprint 1 | COMPLETE 2026-06-14 (11 slots, weapon types, rarity tiers, set system) |
| Loot Sprint 2 | COMPLETE 2026-06-14 (zone-tiered drops, rarity rolling, set system wired) |
| Pool of Refreshment | COMPLETE 2026-06-14 (4 tiers, cooldown, 3D mesh, upgrade UI) |
| Garden Potion Crafting | COMPLETE 2026-06-14 (36 recipes, brew system, GROW/BREW tabs, combat wired) |
| Waypoint discovery | Next |
| Teleport scroll | Forge-craftable; fast travel UI pending |

---

## Key Constants (runeportal_phase5.html)

| Constant | Location | Purpose |
|----------|----------|---------|
| `ZONES` | ~L575 | 7 combat zones + homestead; tier/lootMult/enemyTypes/boss/dropTable |
| `ZONE_TIER` | ~L1173 | zoneId to tier number (1-5) |
| `GEAR_DB` | ~L712 | 51 items: 21 original + 30 Sprint 1 |
| `RARITY_TIERS` | ~L2350 | 9 tiers with dropWeight/affixCount/glowColor |
| `RARITY_TEXT/DOT` | ~L2356 | Color maps for all 9 tiers |
| `SELL_VALUE` | ~L2358 | Gold sell values per rarity |
| `WEAPON_TYPES` | ~L691 | 8 weapon archetypes with speed/dmgMult/twoHand |
| `OFFHAND_TYPES` | ~L701 | shield/quiver/mage_book with bonuses |
| `SET_DEFINITIONS` | ~L2600 | 3 sets: ashwalker/void_sentinel/arcane_focus |
| `ZONE_MATERIAL_TABLE` | ~L1183 | 5 tiers of weighted material drop pools |
| `ZONE_RARITY_SHIFT` | ~L1173 | Rarity weight shift per zone tier |
| `ZONE_GEAR_POOL` | ~L1182 | Gear types available per zone tier |
| `SLOT_ORDER` | ~L683 | weapon/offhand/helmet/neck/chest/back/hands/legs/boots/ring1/ring2 |
| `POOL_TIERS` | ~L925 | 4 pool upgrade tiers with restorePercent/cooldownMs/upgradeCost |
| `POTION_RECIPES` | ~L932 | 36 recipes: 9 categories × 4 grades; effect/ingredients/unlockCost |

---

## Player Object Schema (Phase 5 current)

```javascript
player = {
  x, y,               // tile coords (GRID = 100)
  hp, maxHp,          // maxHp = 50 + vigor*10 + bonusMaxHp (halved during death sickness)
  speed: 2,
  isDead: false,
  uiLocked: false,    // transient
  currentZone: 'ashfields',
  deathSickness: 0,   // ms remaining
  totalXP: 0,
  trainingXP: 0,
  skills: { xp:{ dex:0,str:0,vig:0,int:0 }, level:{ dex:1,str:1,vig:1,int:1 } },
  baseStats: { dexterity:10, strength:10, vigor:10, intelligence:10 },
  equippedBonuses: { dexterity:0, strength:0, vigor:0, intelligence:0 },
  equipped: { weapon:null, offhand:null, helmet:null, chest:null, legs:null, boots:null,
              hands:null, back:null, neck:null, ring1:null, ring2:null },
  combatMeta: { weaponSpeedMult:1.0, critChance:0.0, dmgReduction:0.0,
                rangedBonus:0.0, magicBonus:0.0, twoHandLock:false, activeSets:[] },
  activeBuffs: [],    // transient - NOT saved
  untradableArmor: { equipped:false, broken:false },
}
backpack = {
  items: [],          // potion items have: { id, name, type:'consumable', effect:{type,amount|statMod,duration}, qty }
  food: [],
  materials: { iron_ore:0, bog_root:0, void_shard:0, runic_dust:0, iron_ingot:0,
               leather_scraps:0, void_seed:0, herb_seed:0, root_seed:0, runic_seed:0 },
  gold: 0
}
```

---

## Save Schema Notes

**localStorage key:** `runeportal_save`

Changes since phase4 (all backward-safe, default to 0/[]/null):
- `player.trainingXP` — guild training XP pool
- `player.equipped` — expanded to 11 slots
- `player.combatMeta` — derived/transient, NOT saved
- `player.activeBuffs` — transient, NOT saved
- `backpack.materials` — added runic_dust/iron_ingot/leather_scraps/void_seed/herb_seed/root_seed/runic_seed
- `homedStorage` — 20-slot homestead chest array
- `gardenPlots` — 6-slot garden array (old `gardenPlot` key kept for compat)
- `restedBonusClaimed` — transient flag, resets on Homestead entry
- `poolTier` — Pool of Refreshment tier (1-4, default 1)
- `poolLastUsed` — timestamp of last bathe (null = never used)
- `unlockedPotions` — array of unlocked potion recipe ids (5 free by default)

Clear localStorage (`runeportal_save`) if schema errors occur.

---

## Buff System (statMod keys)

| Key | Helper | Usage |
|-----|--------|-------|
| `strength/dexterity/vigor/intelligence` | `getBuffBonus(stat)` | Additive stat bonus |
| `critBonus` | `getBuffAdd('critBonus')` | Added to combatMeta.critChance |
| `critDmgMult` | `getBuffAdd('critDmgMult')` | Crit dmg = dmg*(1.5+value) |
| `atkSpeedBuff` | `getBuffMult('atkSpeedBuff')` | Multiplicative divisor in atkInterval |
| `speedMult` | `getBuffMult('speedMult')` | Player movement speed multiplier |
| `xpMult` | `getBuffMult('xpMult')` | XP gain multiplier (Rested bonus) |
| `bonusMaxHp` | `getBuffAdd('bonusMaxHp')` | Added to maxHp in recalcMaxHp |

---

## Critical Rules (CLAUDE.md)

- **No CapsuleGeometry** — use CylinderGeometry + SphereGeometry
- **Patch format:** Python str.replace() only
- **Line-targeted surgery:** Never block-search `<script>` tags
- **After schema change:** Flag + clear localStorage note
- **Commit after every patch**

---

## Zone Map

| Zone | Tier | Level | lootMult | Boss |
|------|------|-------|----------|------|
| homestead | 0 (safe) | -- | 0 | none |
| ashfields | 1 | 1-5 | 1 | The Warden |
| bleakwood | 2 | 5-10 | 2 | The Nightmother |
| ironbone | 3 | 10-20 | 4 | General Mourne |
| rot_flats | 3 | 20-35 | 6 | The Corruptor |
| veilstone | 4 | 35-55 | 9 | The Blind Watcher |
| cindermaw | 4 | 55-80 | 13 | Cindermaw the Eternal |
| ashen_crown | 5 | 80-100 | 20 | The Ashen King |
