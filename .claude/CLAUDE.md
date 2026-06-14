# RunePortal — Claude Code Development Instructions

**Engine:** Three.js r128 (single-file isometric browser ARPG)  
**File:** `runeportal_phase5.html` (1,598 lines, Three.js renderer)  
**Save Key:** `runeportal_save` (localStorage)

## Before Every Session
1. Read `SESSION_STATE` section in `CONTEXT.md` (top of file)
2. Check last 3 patches — avoid duplication
3. Review known bugs list

## Critical Rules
- **No CapsuleGeometry** — use CylinderGeometry + SphereGeometry (r128 only)
- **Patch format:** Python str.replace() ONLY, never PowerShell -replace
- **Line-targeted surgery:** Never block-search `<script>` tags
- **After schema change:** Flag in changelog + must clear localStorage before testing
- **Verify always:** Check file size before/after patch

## Phase 5 Status
✅ **Done:** Three.js renderer, death/respawn, Homestead 3D, zones, portals, minimap, danger bar, facing direction
❌ **Next:** Waypoint/campfire discovery, teleport scroll, Homestead building UIs, home waypoint portal

## Key Functions
- `travelToZone(zoneId, arrivalPos)` — zone transitions
- `respawnPlayer()` — death flow
- `buildHomestead()` — Homestead 3D render
- `drawMinimap()` — 2D canvas overlay
- `saveGame() / loadGame()` — localStorage persist

## After Every Patch
```powershell
git add -A
git commit -m "[patch] [feature] — $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
```
