# Abyssbound – Project Plan (High Level)

## Core Vision
Top-down ARPG survival grinder inspired by:
- OSRS (corpse runs, skilling, prep)
- Diablo (loot tiers, boss events)
- Extraction games (risk vs reward, lose gear on death)

## Current Focus
STEP 1 — ZoneEnemySpawner

**DONE WHEN:**
- ZoneEnemySpawner manages multiple EnemySpawnPoints.
- Each spawn point can spawn one enemy, which respawns after a delay when killed.
- There is a global max active enemy cap per zone.
- Old arena-style wave spawner is no longer used for main gameplay.

## Near-Term Steps
1. Finish ZoneEnemySpawner + respawn behavior.
2. Build Zone 1 layout (safe camp + enemy clusters + boss entrance).
3. Implement Item System (ScriptableObject-driven).
4. Implement Corpse Run system.
5. Implement first zone boss and boss variants.

## Workflow Rules
- Full-file C# replacements for any code changes.
- VS Code Agent handles most code edits.
- Use feature branches for each step.
- Keep GameConfig as central place for core tuning values.
