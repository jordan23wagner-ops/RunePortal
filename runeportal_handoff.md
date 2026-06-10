# RunePortal — Session Handoff

## Project Summary
Building a mobile browser ARPG called RunePortal — isometric 2D, OSRS-inspired, single HTML file, playable on phone and desktop browser.

## File Location
C:\Users\Jordon\OneDrive\Desktop\runeportal_phase3.html

## Local Server
python -m http.server 8080 --directory "C:\Users\Jordon\OneDrive\Desktop"
Desktop: http://192.168.1.75:8080/runeportal_phase3.html
Phone: http://192.168.1.69:8080/runeportal_phase3.html

## Groq Setup
- Free tier, no credit card
- OpenAI SDK pointed at Groq base URL
- Key stored as env var: GROQ_API_KEY
- Studio: python "$HOME\runeportal_studio.py"
- Alias: studio (if profile loaded)
- Model: llama-3.3-70b-versatile (patches), llama-3.1-8b-instant (classify/review)

## Dev Studio
runeportal_studio.py at C:\Users\Jordon\runeportal_studio.py
Version: v3.0
Features: Structured JSON outputs, MoA review (8B reviews 70B patch), fuzzy match, self-heal fallback, T1 memory, T2 pattern library, auto-backup, undo, server command, url command
Memory: C:\Users\Jordon\runeportal_memory.json
Patterns: C:\Users\Jordon\runeportal_patterns.json
Backups: C:\Users\Jordon\OneDrive\Desktop\runeportal_backups\

## CRITICAL LESSONS LEARNED
1. NEVER use block search to find/remove script tags — it will find the wrong block and delete the main game script
2. ALWAYS use line-number targeted surgery for structural HTML changes
3. localStorage crashes the game if save data is corrupted — always wrap in try/catch
4. Clear localStorage with localStorage.clear() in browser console if game shows black screen after a save state change
5. Python str.replace() fails silently on whitespace mismatches — always verify with Select-String after applying
6. When restore from backup gives black screen, clear localStorage first then hard refresh (Ctrl+Shift+R)

## Completed Features
- Isometric 2D tile world (20x20 grid, green/red checkerboard)
- Blue diamond player, red diamond enemies (10 spawned)
- Virtual joystick (mobile, bottom-left)
- WASD / Arrow keys (desktop, speed=0.1)
- Auto-combat on proximity (80px), enemies fight back
- XP system (ATK/STR/DEF), level up at 100*level XP
- Loot drops: gear (30% chance) + gold on enemy death
- Backpack UI (click BAG top-right) — dark slate Diablo theme
- Equipment slots: Weapon, Helmet, Chest, Legs, Boots
- Close button working
- Boundary clamping (player + enemies stay in grid)
- Gold tracked in backpack.gold, displays in backpack panel
- Enemy respawning (rarity-based: common/rare/epic)
- Tab switching (BACKPACK / EQUIPMENT) working

## NOT YET IMPLEMENTED (do these next in order)
1. Stat rename: ATK->Dexterity, STR->Strength, DEF->Vigor + add Intelligence
   - Vigor controls max HP (50 + vigor * 5)
   - Dexterity controls attack speed
   - Strength controls damage
   - Intelligence = future magic stat
   - Must rename in player init object AND HUD render AND combat logic AND XP system
   - Do NOT use block search — use targeted line-number replacement
2. Save state (localStorage) — must wrap in try/catch, save/load player.skills, backpack.gold, backpack.items, player.hp, player.baseStats, player.equippedBonuses
3. Player death + respawn at center
4. Multiple zones with tougher enemies
5. Minimap

## Current Player Object Structure (IMPORTANT)
player = {
  x, y, hp: 100, maxHp: 100, speed: 2,
  skills: {
    attack: 10, strength: 10, defence: 10, magic: 10, ranged: 10,
    xp: { attack: 0, strength: 0, defence: 0 },
    level: { attack: 1, strength: 1, defence: 1 }
  },
  baseStats: { attack: 10, strength: 10, defence: 10 },
  equippedBonuses: { attack: 0, strength: 0, defence: 0 }
}
backpack = { items: [], gold: 0 }

## File Writing Rules (CRITICAL)
- Always use Python scripts saved via PowerShell here-string then run
- Never use PowerShell -replace for multi-line JS strings
- Always verify changes with Select-String after applying
- Always check file size before/after to confirm change landed
- For structural HTML changes (script tags, head/body), use line-number targeting NOT block search
- After ANY save state change, clear localStorage in browser console before testing

## Hardware
AMD Ryzen 7 5700U, integrated AMD Radeon, 16GB RAM
Windows 11, PowerShell, Python 3.13
