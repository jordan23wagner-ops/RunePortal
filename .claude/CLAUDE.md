# RunePortal — Claude Code Instructions

**File:** `runeportal_phase5.html` (Three.js r128)  
**Save Key:** `runeportal_save` (localStorage)

## Critical Rules
- **No CapsuleGeometry** — use CylinderGeometry + SphereGeometry
- **Patch format:** Python str.replace() only
- **Line-targeted surgery:** Never block-search `<script>` tags
- **After schema change:** Flag + clear localStorage

## Phase 5 Status
✅ Done: Three.js, death/respawn, Homestead 3D, zones, portals, minimap, danger bar, facing
❌ Next: Waypoint discovery, teleport scroll, building UIs

## Key Functions
- `travelToZone(zoneId, arrivalPos)` — zone transitions
- `respawnPlayer()` — death flow
- `buildHomestead()` — Homestead render
- `drawMinimap()` — 2D canvas

## Before Every Patch
Read SESSION_STATE in CONTEXT.md (top).

## After Every Patch
```powershell
git add -A
git commit -m "[patch] [feature]"
```
