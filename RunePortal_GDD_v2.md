# RunePortal — Master Game Design Document v2.0

> **Status:** Living document — update after every major design decision  
> **Repo:** jordan23wagner-ops/RunePortal  
> **Last Updated:** June 2026

---

## Table of Contents

1. [Vision Statement](#1-vision-statement)
2. [Art Direction](#2-art-direction)
3. [Technical Stack](#3-technical-stack)
4. [World Lore](#4-world-lore)
5. [Character System](#5-character-system)
6. [Combat System](#6-combat-system)
7. [Gear System — Rarities](#7-gear-system--rarities)
8. [Gear System — Affixes](#8-gear-system--affixes)
9. [Zone System](#9-zone-system)
10. [Enemy & Boss Roster](#10-enemy--boss-roster)
11. [Homestead Hub](#11-homestead-hub)
12. [Idle RPG System](#12-idle-rpg-system)
13. [Crafting System](#13-crafting-system)
14. [Progression & Stats](#14-progression--stats)
15. [Death System](#15-death-system)
16. [v1.0 Ship Criteria](#16-v10-ship-criteria)
17. [Distribution Plan](#17-distribution-plan)
18. [Future Vision / Post-v1.0](#18-future-vision--post-v10)

---

## 1. Vision Statement

**RunePortal** is a mobile-first browser ARPG — a single HTML file, zero install, open in any browser and play.

It fuses:
- **OSRS grind loop** — always something to level, always the next tier to chase
- **Diablo loot depth** — rare drops that matter, affixes that define your build
- **Dark Souls / Fallout aesthetic** — grotesque mutated enemies, ruined world, brutal atmosphere
- **Idle RPG flexibility** — play actively or let the game run; no punishing wait walls, but real tradeoffs for instant gratification

The core promise: **you are never locked out of content by the game. Only your stats, your gear, and your strategy hold you back.**

---

## 2. Art Direction

### Visual Style Reference
**XP Hero (iOS)** — Stick figure-style humanoid base character. Simple, iconic silhouette. Equipment is chunky, immediately readable, and visually distinct per tier. The character's power is communicated through visual density of gear.

### Character Rendering
- **Base:** Stick figure humanoid — clean, mobile-readable at small sizes
- **Layered sprites** (rendered bottom to top):
  1. Body base
  2. Legs (armor)
  3. Chest (armor)
  4. Helmet
  5. Boots
  6. Weapon (held in hand, visible)
  7. Aura (particle effect, rarity-colored)
- Every equipped item has a unique sprite that updates live on the character
- Enemy characters use tinted/reskinned versions of the same layer system

### Environment
- **No tile grid** — zone backgrounds are parallax-scrolling layered environments
- Each zone has a unique visual environment (see Zone System)
- Background layers: sky/atmosphere, mid-ground structures, foreground ground layer
- Dynamic lighting per zone (warm fire tones in Smoldering Halls, cold void light in Fractures, etc.)

### UI Theme
- Dark slate base (`#1a1a2e`) with gold accents (`#e8c97a`)
- Rarity colors used consistently across all UI elements (see Gear Rarities)
- Bonfire glow effect on homestead hub screen

### Aura Colors by Rarity
| Rarity | Aura Color |
|--------|-----------|
| Rare | Blue (`#4fc3f7`) |
| Epic | Purple (`#ab47bc`) |
| Legendary | Orange (`#ff8f00`) |
| Mythic | Red (`#e53935`) |
| Void | Black/deep purple (`#1a0030`) with dark tendrils |
| Radanite | Cyan crystal glow (`#00e5ff`) |
| Titanite | Silver/white shimmer (`#eceff1`) |
| Zionite | Gold prismatic (`#ffd700`) rotating spectrum |
| Untradable Upgraded | Full rainbow prismatic pulse |

---

## 3. Technical Stack

### Renderer
**PixiJS 8.x** (CDN import — no build step, stays single file)
- Replaces raw canvas 2D rendering
- WebGL-accelerated — mobile friendly, smooth 60fps
- Native support for layered sprite containers
- Built-in particle system for auras and hit effects

### Architecture
```
Single HTML file: runeportal_phase4.html
├── <head>
│   └── CDN imports: PixiJS, PixiJS Particles
├── <style>
│   └── UI overlay (HTML/CSS — NOT canvas)
└── <script>
    ├── PixiJS app init
    ├── Layer system (background, entities, UI effects)
    ├── Character sprite manager (layered containers)
    ├── Game loop (single requestAnimationFrame — do NOT add a second)
    ├── Combat engine
    ├── Loot system
    ├── Idle/crafting system
    └── Save/load (localStorage, always try/catch)
```

### Sprite Source (TBD — choose one)
- Option A: AI-generated PNGs (Midjourney/DALL-E) exported per gear tier
- Option B: LPC (Liberated Pixel Cup) free asset base + custom layered pieces
- Option C: Commission pixel art pack per zone unlock milestone

### Constraints (NON-NEGOTIABLE)
- Single HTML file — no framework, no bundler, no external files
- CDN-only imports (PixiJS, no others without explicit approval)
- All JS, CSS, HTML in one file
- localStorage saves wrapped in try/catch — always
- Mobile-first: virtual joystick, touch buttons, portrait-native

---

## 4. World Lore

### The Setting: The Shattered Expanse
The world was fractured by an ancient catastrophe called **The Rend** — an event that cracked reality itself, bleeding void energy into the physical world. Civilizations mutated, died, or adapted into monstrous forms. The surviving human remnants cluster around **Bonfires** — ancient anchors of reality that resist the void's corruption.

The player is a **Runseeker** — one of a rare few who can absorb the energy of the Rend rather than be destroyed by it. The portals left by the Rend are lethal to normal humans. You walk through them.

### Zones: All Open, No Locks
There are no level gates. All 10 zones are accessible from the start. The world does not close doors — it just puts things in those rooms that will kill you if you're not ready. That's the game.

---

## 5. Character System

### Stats (4 Core)
| Stat | Controls |
|------|----------|
| **Dexterity** | Attack speed |
| **Strength** | Melee damage |
| **Vigor** | Max HP — formula: `50 + (Vigor * 5)` |
| **Intelligence** | Magic damage (active in v1.0 if magic weapons exist, otherwise passive) |

- All 4 stats gain XP on kills
- XP split per kill: 40% Dexterity, 40% Strength, 20% Vigor (Intelligence from magic kills only)
- Level threshold: `100 * currentLevel` XP per level
- Each stat levels independently (OSRS-style)

### Gear Slots (5 visible on character)
1. Helmet
2. Chest
3. Legs
4. Boots
5. Weapon

All 5 slots render as visible layered sprites on the character model.

### Dodge/Roll
- **Mobile:** Dedicated button, bottom-right of screen (near joystick)
- **Desktop:** Spacebar or double-tap direction
- **Cooldown:** 1.5 seconds
- **Invincibility frames:** 0.25 seconds at roll start
- **Distance:** Short forward dash in current movement direction
- **Visual:** Brief speed-blur particle trail

---

## 6. Combat System

### Auto-Combat
- Proximity-triggered — no tap/click to attack
- Player auto-attacks the nearest enemy within range (80px)
- Attack speed controlled by Dexterity stat
- Damage controlled by Strength stat
- Combat stops when player walks out of range or enemy dies

### Dodge/Roll (Active Mechanic)
- See Character System section above
- Successful roll through an enemy attack = brief slow-motion flash (visual feedback)
- Timing-based reward: master dodgers take significantly less damage over time

### Hit Effects (PixiJS Particles)
- Hit sparks on every attack connection
- Rarity-colored burst on loot drops
- Death explosion effect (larger for boss kills)
- Aura pulse on level up

### Enemy Combat
- Enemies wander randomly, aggro when player is within range
- Each enemy type has unique attack pattern (see Enemy Roster)
- Boss enemies have multi-phase behavior

---

## 7. Gear System — Rarities

9 tiers. No Common. No Uncommon. Every drop matters.

| # | Rarity | Color | Affixes | Notes |
|---|--------|-------|---------|-------|
| 1 | **Rare** | Blue | 1 | Entry-level meaningful gear |
| 2 | **Epic** | Purple | 2 | First real build identity |
| 3 | **Legendary** | Orange | 3 | Feels powerful, findable mid-game |
| 4 | **Mythic** | Red | 4 | Deep zone drops |
| 5 | **Void** | Dark purple/black | 5 | Void zone+ only |
| 6 | **Radanite** | Cyan crystal | 6 | Radanite Depths+ |
| 7 | **Titanite** | Silver/white | 7 | Zion Spire zone |
| 8 | **Zionite** | Gold prismatic | 8 | Final zone boss drops |
| 9 | **Untradable Upgraded** | Rainbow prismatic | All + set bonus | See Death System |

### Affix Count Per Rarity
| Rarity | Prefixes | Suffixes | Special |
|--------|----------|----------|---------|
| Rare | 1 | 0 | — |
| Epic | 1 | 1 | — |
| Legendary | 2 | 1 | — |
| Mythic | 2 | 2 | — |
| Void | 3 | 2 | — |
| Radanite | 3 | 3 | — |
| Titanite | 4 | 3 | — |
| Zionite | 4 | 4 | — |
| Untradable Upgraded | 4 | 4 | Unique set bonus |

### Zone Drop Table (Rough)
| Zone | Primary Drops | Max Possible |
|------|--------------|--------------|
| Zones 1–3 | Rare, Epic | Legendary (rare) |
| Zones 4–6 | Legendary, Mythic | Void (rare) |
| Zones 7–8 | Void, Radanite | Titanite (rare) |
| Zone 9 | Radanite, Titanite | Zionite (rare) |
| Zone 10 | Titanite, Zionite | Zionite guaranteed from boss |

---

## 8. Gear System — Affixes

### Prefixes (Stat Modifiers)
| Prefix Name | Effect |
|-------------|--------|
| Dextrous | +X Dexterity |
| Mighty | +X Strength |
| Stalwart | +X Vigor |
| Wise | +X Intelligence |
| Reinforced | +X% Defense |
| Accelerated | +X% Attack Speed |
| Surging | +X% Damage |
| Ancient | +X to all stats |

### Suffixes (Special Effects)
| Suffix Name | Effect |
|-------------|--------|
| of the Wolf | Lifesteal on hit (X%) |
| of Shattering | Chance to stun on hit |
| of the Void | Chance to inflict Void Burn (damage over time) |
| of Warding | Damage reduction (X%) |
| of the Radanite | Chance to trigger crystal explosion on hit |
| of Momentum | Kills grant temporary movement speed |
| of Resilience | Reduces death penalties |
| of the Titan | +X% damage against bosses |

### Special Affix (Untradable Upgraded only)
| Name | Effect |
|------|--------|
| Set Bonus | Unique per armor set — varies (e.g., "Complete 5-piece: all attacks pierce") |

### Affix Scaling
- Affix values scale with zone tier where the item dropped
- Same affix name, higher magnitude in deeper zones
- Two items of the same name from different zones are NOT equivalent

---

## 9. Zone System

All zones accessible from the Homestead portal room. No level gates. No key items. Just your stats.

### Zone 1 — The Ashfields
**Environment:** Crumbling ruins of the old civilization. Dust, fire, broken walls.  
**Atmosphere:** Warm ash tones, perpetual haze, collapsed skyline in background  
**Enemies:** Ashwalker Scavengers, Raider Brutes, Feral Hounds, Bone Collectors  
**Boss:** **The Warden** — A massive former peacekeeper, his armor radiation-fused to his skin. Slow, brutal, telegraphed slams.  
**Primary Drops:** Rare → Epic

---

### Zone 2 — Bleakwood Hollow
**Environment:** Dead forest. Trees twisted into humanoid shapes. No light reaches the floor.  
**Atmosphere:** Deep blacks, bioluminescent fungi, sound-hunt mechanics feel  
**Enemies:** Hollow Hunters (skeletal werewolves), Thornback Lurkers, Wraith Stalkers  
**Boss:** **The Nightmother** — Ancient werewolf matriarch. Fast, unpredictable, summons wolves during phase 2.  
**Primary Drops:** Rare → Epic → Legendary

---

### Zone 3 — Ironbone Flats
**Environment:** An ancient battlefield frozen in time. Rusted war machines still patrol. Corpses that won't stay dead.  
**Atmosphere:** Gray wasteland, flickering war-machine lights, bone-white fog  
**Enemies:** Undead Soldiers, Iron Constructs (mechanical humanoids), Revenants, Iron Knights  
**Boss:** **General Mourne** — A revenant general commanding a ghost army. Teleports, calls reinforcement waves.  
**Primary Drops:** Epic → Legendary

---

### Zone 4 — The Brine Wastes
**Environment:** Dried ancient seabed. Salt-bleached, cracked white earth. Enormous creatures evolved from sea life walk on land.  
**Atmosphere:** Blinding white ground, dark horizon, carcasses of old ships  
**Enemies:** Saltborn Brutes, Deep Crawlers (crustacean-humanoid hybrids), Tide Wraiths  
**Boss:** **The Drowned God** — Colossal amphibian draped in shipwreck debris. Ranged water-acid projectiles, charges.  
**Primary Drops:** Legendary → Mythic

---

### Zone 5 — Verdant Decay
**Environment:** Jungle overtaken by toxic mutation. Everything is massive and aggressive.  
**Atmosphere:** Sickly greens, bioluminescent veins, oppressive canopy, rain effect  
**Enemies:** Venom Stalkers (humanoid predators with toxin quills), Fungal Behemoths, Pack Hunters  
**Boss:** **The Overgrowth** — A humanoid titan with his body merged with the jungle itself. Roots emerge from ground as attacks.  
**Primary Drops:** Legendary → Mythic

---

### Zone 6 — The Smoldering Halls
**Environment:** Underground volcanic forge-city. The smiths who built it never left — they became the forge.  
**Atmosphere:** Deep reds and blacks, rivers of lava in background, forge-fire particle ambient  
**Enemies:** Forge Wraiths, Magmaborn Goliaths, Ember Knights  
**Boss:** **The Furnace King** — A titanic blacksmith with his body fused to a mobile forge chassis. Throws molten slag, forges minions mid-fight.  
**Primary Drops:** Mythic → Void

---

### Zone 7 — Void Fractures
**Environment:** Where the Rend tore reality. The ground doesn't always agree on where it is. Sky is fractured.  
**Atmosphere:** Purple/black void tears across the sky, floating debris, corrupted light sources  
**Enemies:** Voidborn Sentinels, Fracture Stalkers (blink/teleport), Reality Eaters (distortion field around them)  
**Boss:** **The Herald of Nothing** — A former archmage consumed by the void. Phases in and out of visibility, summons void rifts.  
**Primary Drops:** Void → Radanite

---

### Zone 8 — The Pale Sanctum
**Environment:** Ancient religious complex now occupied by a death cult of monstrous zealots. Hauntingly beautiful architecture, horrifying inhabitants.  
**Atmosphere:** White marble, gold accents, deep shadow, stained glass light effects  
**Enemies:** Sanctum Zealots, Penitent Giants (chains and self-flagellation weapons), Pale Knights (armored, relentless, don't flinch)  
**Boss:** **The Archpriest** — Enormous mutated religious figure wielding cursed relics as flails. Has a second form: splits into three Pale Knight echoes.  
**Primary Drops:** Radanite → Titanite

---

### Zone 9 — Radanite Depths
**Environment:** Deep underground veins of Radanite crystal. Everything here has been warped by the mineral's energy — beautiful and deadly.  
**Atmosphere:** Cyan crystal formations, prismatic light, humming ambience  
**Enemies:** Crystal Wardens, Radanite Golems, Vein Crawlers (fast, crystalline-skinned humanoids)  
**Boss:** **The Radanite Core** — A humanoid crystallized at the exact center of a Radanite vein. Slow, but each hit spawns crystal shards. Room fills with hazards over time.  
**Primary Drops:** Titanite → Zionite

---

### Zone 10 — The Zion Spire
**Environment:** A massive tower erupting from the exact point of the Rend's origin. The apex of the Shattered Expanse. Reality here is thin.  
**Atmosphere:** Black and gold, prismatic void energy, no visible sky — just the spire ascending into nothingness  
**Enemies:** Zionite Sentinels, Titan Wardens, Apex Predators (top-tier of all enemy types, enhanced)  
**Boss:** **The Warden of the Rend** — The entity that has existed at the wound in reality since the cataclysm. Multiple phases. Summons echoes of every previous boss. Final v1.0 encounter.  
**Primary Drops:** Zionite (guaranteed from boss). Rare chance: Untradable Upgraded material drop.

---

## 10. Enemy & Boss Roster

### Enemy Design Principles
- **No slimes. No generic fantasy.** Every enemy is a humanoid, a mutated beast, a construct, or something that was once human.
- Dark Souls grotesque + Fallout mutated aesthetic
- Three base rarities: Standard, Elite (larger, more HP, glowing eyes), Champion (named, unique behavior, guaranteed good drop)

### Enemy Type Reference
| Enemy | Type | Behavior | Zone(s) |
|-------|------|----------|---------|
| Ashwalker Scavenger | Mutated humanoid | Fast, swarm in groups | 1 |
| Raider Brute | Armored humanoid | Charges, high damage | 1 |
| Bone Collector | Skeleton construct | Ranged thrown bones | 1, 3 |
| Hollow Hunter | Skeletal werewolf | Sprint attacks, pack AI | 2 |
| Wraith Stalker | Spectral humanoid | Phases briefly, ambush | 2, 7 |
| Iron Construct | Mechanical humanoid | Slow, high armor, AoE stomp | 3 |
| Revenant | Undead soldier | Self-heals if not killed fast | 3 |
| Saltborn Brute | Sea-mutant humanoid | Slow, enormous reach | 4 |
| Deep Crawler | Crustacean-humanoid | Sideways movement, claw flurry | 4 |
| Venom Stalker | Predator humanoid | Ranged toxin spit, fast | 5 |
| Fungal Behemoth | Mutated giant | Slow, leaves spore pools | 5 |
| Forge Wraith | Fire spirit humanoid | Burns ground on death | 6 |
| Magmaborn Goliath | Lava-mutant giant | Slams, spawns fire pools | 6 |
| Voidborn Sentinel | Void entity | Distorts player controls briefly | 7 |
| Fracture Stalker | Blink-humanoid | Teleports before attacking | 7, 10 |
| Sanctum Zealot | Cultist humanoid | Suicide charge (explodes) | 8 |
| Pale Knight | Armored undead | Does not flinch, relentless | 8, 10 |
| Crystal Warden | Radanite-encrusted humanoid | Reflects damage when idle | 9 |
| Radanite Golem | Crystal construct giant | Slow, spawns crystal hazards | 9 |
| Zionite Sentinel | Apex humanoid construct | Full moveset, high everything | 10 |

---

## 11. Homestead Hub

The Homestead is where the player begins and returns. It is not a menu — it is a **place**.

### Layout
- **Central Bonfire** — the anchor of reality, visual focal point. Flickering warm light. Player respawns here. Idle activity accumulates here.
- **Blacksmith Hut** — gear upgrades, untradable armor repair, rarity upgrades (material-hungry)
- **Alchemist Hut** — crafting consumables (potions, buffs), poison/elemental infusions
- **Merchant Hut** — buy/sell gear, purchase crafting materials, restock on timer
- **Barracks** — unlock and upgrade idle defenders (generate passive gold and XP while away)
- **Portal Room** — 10 visible portal arches, each with zone-specific visual (no loading screen — instant zone transition)

### Visual Design
- Bonfire-centered layout, huts radiating outward
- Dark, lived-in aesthetic — dirt paths, rough-hewn wood, faint firelight
- Each hut has a unique NPC merchant with visible character model
- Idle activity visualized (defenders patrol, crafting smoke from Alchemist, etc.)

---

## 12. Idle RPG System

### Core Philosophy
Play how you want. No punishment for going idle — but active play has real advantages. The tradeoff is yours.

### Idle Features
| Feature | Behavior |
|---------|----------|
| Offline XP | Accumulates at 30% of active rate, capped at 8 hours of offline time |
| Crafting Queue | Runs fully offline — queue items before you log out |
| Passive Gold | Barracks defenders generate gold at a slow rate while idle |
| Idle Combat | Toggle "Idle Mode" to auto-fight in your last visited zone at reduced efficiency |

### Active vs. Idle Tradeoffs
- Active play: full XP rate, full loot rate, dodge roll available (reduces damage taken significantly)
- Idle mode: 30% XP, 50% loot rate, no dodge roll (take full damage — need strong enough gear to survive)
- This creates a meaningful gear threshold: "Am I geared enough to idle Zone 4?"

### Return Experience
- On returning after offline time: summary screen showing XP/gold/crafts completed
- No "click through 50 popups" — single summary card, one dismiss

---

## 13. Crafting System

### Core Mechanic: Speed vs. Certainty
Every craft has two options:
- **Timed Craft:** Wait the full duration → **100% success rate**
- **Instant Craft:** Complete immediately → **60% success rate** (materials consumed on failure)

This creates genuine player decisions without walls. Active players gamble. Patient players are always rewarded.

### Crafting Times (Base — scales by output rarity)
| Output Rarity | Timed Duration | Instant Success |
|---------------|---------------|-----------------|
| Rare | 15 min | 60% |
| Epic | 30 min | 60% |
| Legendary | 1 hour | 60% |
| Mythic | 2 hours | 60% |
| Void | 4 hours | 60% |
| Radanite | 6 hours | 60% |
| Titanite | 10 hours | 60% |
| Zionite | 24 hours | 60% |

### Materials
- Each zone drops zone-specific crafting materials
- Higher zone materials required for higher rarity outputs
- Materials tradeable (unlike Untradable armor)

### Upgrade Path
- Gear can be upgraded in rarity: Rare → Epic → Legendary etc.
- Requires: current item + zone materials + gold
- Affixes are re-rolled on upgrade (adds the appropriate number of new affixes for the new tier)
- **You cannot upgrade Zionite** — it either drops or it doesn't

### Recipes
- Unlocked by purchasing from Merchant or Alchemist NPCs at homestead
- Some recipes only unlock after defeating a zone boss

---

## 14. Progression & Stats

### Stat Leveling
- All 4 stats gain XP on every kill (weighted by kill type)
- Each stat levels independently
- Level threshold: `100 * currentLevel` XP per level
- No stat cap in v1.0

### Zone Progression (Recommended, Not Required)
| Zone | Suggested Stat Levels | Notes |
|------|----------------------|-------|
| 1 — Ashfields | 1–5 all stats | Tutorial feel |
| 2 — Bleakwood Hollow | 5–10 | First real challenge |
| 3 — Ironbone Flats | 10–20 | Enemy HP spikes |
| 4 — Brine Wastes | 20–35 | Gear starts mattering |
| 5 — Verdant Decay | 30–45 | Legendary drops begin |
| 6 — Smoldering Halls | 45–60 | Void gear tier opens |
| 7 — Void Fractures | 55–70 | Telegraphed attacks get brutal |
| 8 — Pale Sanctum | 65–80 | Pale Knights require dodge mastery |
| 9 — Radanite Depths | 80–95 | Crystal reflect mechanics punish face-tanking |
| 10 — Zion Spire | 90+ | No ceiling — keep grinding |

These are *guidelines visible in the UI* as "Danger Rating." Not enforced as locks.

---

## 15. Death System

### Standard Death
- Player drops to 0 HP
- Respawns at Homestead Bonfire
- **Standard gear is dropped at death location** (lootable by re-entering zone, 5 min timer before despawn)
- Gold retained (50% lost on death as a tax — deposited to Homestead chest)

### Untradable Upgraded Armor
- **Never drops on death** — always stays with the player
- On death: armor enters **Broken** state
  - Equipped but all stat bonuses set to 0
  - Visual: armor appears cracked/damaged on character sprite
- **Repair:** Visit the Blacksmith at Homestead. Cost is high and scales with armor tier.
- Fully repaired = full stats restored, visual updated back to pristine

### Why This Matters
- Untradable armor is the best gear in the game — it should feel risky to own
- The repair economy creates ongoing gold sink
- Players feel the pain of dying in their best gear without permanent loss

---

## 16. v1.0 Ship Criteria

These must all be checked before GitHub Pages deployment and public sharing.

### Core Systems
- [ ] PixiJS renderer live (replaces canvas 2D shapes)
- [ ] Layered character sprites — all 5 gear slots visually rendered
- [ ] Aura particle system (all 9 rarity tiers have distinct auras)
- [ ] Environment backgrounds (parallax, no tile grid) — at minimum Zones 1–5
- [ ] Virtual joystick (mobile) + WASD (desktop) — both functional
- [ ] Dodge/roll with i-frames
- [ ] Auto-combat with proximity trigger
- [ ] All 4 stats + XP system + level up

### Gear & Loot
- [ ] All 8 standard rarity tiers dropping in appropriate zones
- [ ] Affix system — prefix and suffix system live
- [ ] All 5 gear slots equippable with visible stat changes
- [ ] Untradable Upgraded armor tier (obtainable from Zone 10 boss)
- [ ] Backpack/Equipment UI — dark slate, all tabs working

### Zones & Enemies
- [ ] Minimum 5 zones with unique environments (Zones 1–5)
- [ ] Full enemy roster for those 5 zones
- [ ] Minimum 3 bosses (The Warden, The Nightmother, General Mourne)
- [ ] All 10 zones accessible (even if Zones 6–10 have placeholder environments)

### Homestead
- [ ] Bonfire centered, full visual build
- [ ] Blacksmith, Merchant, Alchemist huts operational
- [ ] Portal room with 10 portals (Zones 6–10 can be "Coming Soon" placeholder)
- [ ] Barracks (basic version — passive gold)

### Idle & Crafting
- [ ] Offline XP accumulation (8 hour cap)
- [ ] Crafting system — timed and instant modes
- [ ] Crafting queue runs offline
- [ ] Return summary screen

### Save & Death
- [ ] localStorage save — all player fields, fully robust
- [ ] Save runs every 10 seconds + on zone transition
- [ ] Player death + respawn at bonfire
- [ ] Gear drop on death + recovery window
- [ ] Untradable armor broken state + Blacksmith repair

### Polish
- [ ] Minimap (current zone)
- [ ] Hit effects (PixiJS particles)
- [ ] Death explosion effect
- [ ] Level up visual burst
- [ ] HUD: HP bar, XP bar, gold, active gear displayed

---

## 17. Distribution Plan

### Phase 1 — GitHub Pages (Now)
- Free, instant, shareable link
- Goal: playtest feedback from friends, OSRS community, indie dev community
- Share on: Reddit (r/indiegaming, r/webgames, r/incremental_games), Twitter/X, Discord

### Phase 2 — Itch.io
- Game-specific discovery audience
- Free to play, optional pay-what-you-want
- Goal: ratings, wishlists, organic discoverability

### Phase 3 — Monetization (Post-Feedback)
- **Cosmetic only** — skins, alternative aura colors, homestead cosmetic upgrades
- **Quality of life** — crafting slot expansion, additional idle defender slots
- **Never pay-to-win** — no gear, no stats, no game advantage behind paywall
- Model: One-time purchases via Itch.io or in-game shop (Stripe/Gumroad backend)

---

## 18. Future Vision / Post-v1.0

### Endgame Systems
- **The Endless Rend** — infinitely scaling dungeon (Zone 10+ difficulty, no ceiling)
- **Prestige System** — reset stats for permanent passive bonuses + exclusive cosmetics
- **Set Items** — full armor sets with unique multi-piece bonuses (separate from Untradable tier)
- **Void Corruption system** — optional hardcore mode where death has permanent consequences

### Social Features
- **Leaderboards** — highest stat total, fastest boss kill, deepest Endless Rend floor
- **Clan/Guild** — shared idle resource pool, group crafting bonuses

### Content Expansions
- Zones 11–20 (second continent — The Sunken Archive, post-Rend underwater ruins)
- New enemy factions (Void Cultists, Rend Hunters — player-like AI)
- New gear slots: Ring, Amulet, Off-hand
- Ranged and magic weapon classes (Intelligence becomes primary)

### Platform
- Progressive Web App (PWA) — installable on home screen, offline capable
- Potential: Native iOS/Android wrapper (Capacitor.js) if audience justifies it

---

## Open Design Questions (TBD)

> These need decisions before implementation. Flag before Fable 5 sessions that touch these systems.

| # | Question | Notes |
|---|----------|-------|
| 1 | Is dropped gear at death lootable by re-entry or permanently lost? | Current spec: 5 min lootable window |
| 2 | Instant craft failure — full material loss or partial? | Current spec: full loss |
| 3 | What is the exact stat split for XP on kills? | Current spec: 40/40/20 (DEX/STR/VIG) |
| 4 | Is gold lost on death recoverable with gear, or flat tax? | Current spec: 50% flat tax |
| 5 | Sprite source decision — AI gen, LPC, commissioned? | Blocked until art pipeline decision |
| 6 | Are crafting recipes one-time unlocks or require repeat purchase? | TBD |
| 7 | Idle combat mode — per zone or only last visited? | Current spec: last visited |

---

*RunePortal GDD v2.0 — jordan23wagner-ops — June 2026*
