# RunePortal — Absolute Dev Rules

> These are NON-NEGOTIABLE constraints. Every agent, every session, every patch.  
> Violating any of these has caused black screens, data loss, or broken saves in the past.  
> Read before writing a single line of code.

---

## FILE OPERATIONS

**1. Never use PowerShell `-replace` for multi-line JS strings.**  
Always write a Python script via PowerShell here-string, then execute with `python`.

```powershell
# CORRECT
$script = @'
import re
with open(r"C:\...\runeportal_phase4.html", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("""OLD_STRING""", """NEW_STRING""")
with open(r"C:\...\runeportal_phase4.html", "w", encoding="utf-8") as f:
    f.write(content)
'@
$script | python
```

**2. Never use block search to find or remove `<script>` tags.**  
Block search will find the wrong script block and delete the main game script. Use line-number targeted surgery only.

**3. Always verify changes after applying.**
```powershell
Select-String -Path "runeportal_phase4.html" -Pattern "YOUR_NEW_CODE_SNIPPET"
```

**4. Always check file size before and after patching.**
```powershell
(Get-Item "runeportal_phase4.html").length
```
If size is unchanged after a patch, the change did not land. Do not proceed.

**5. Always create a timestamped backup before any patch.**
```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "runeportal_phase4.html" "C:\Users\Jordon\OneDrive\Desktop\runeportal_backups\runeportal_phase4_$ts.html"
```

---

## LOCALSTORAGE RULES

**6. All save/load operations must be wrapped in try/catch.**  
A corrupted save causes an instant black screen. There are no exceptions to this rule.

```javascript
// CORRECT
try {
    const saved = JSON.parse(localStorage.getItem('runeportal_save'));
    if (saved) loadState(saved);
} catch(e) {
    console.warn('Save corrupted, starting fresh:', e);
    localStorage.clear();
}
```

**7. After ANY change to the player object schema, flag it explicitly.**  
Output a warning in the changelog: `⚠️ PLAYER SCHEMA CHANGED — clear localStorage before testing.`  
Player must run `localStorage.clear()` in browser console before testing.

**8. After clearing localStorage, always hard refresh.**  
`Ctrl+Shift+R` — not a normal refresh. Cached state can persist otherwise.

**9. Black screen on load = corrupted save, not a code error.**  
First debug step is always: `localStorage.clear()` in console → hard refresh.

---

## SINGLE-FILE CONSTRAINT

**10. RunePortal is one HTML file. This never changes.**  
- Never split into multiple files
- Never add a build step or bundler
- Never add external JS/CSS files
- CDN imports via `<script src="...">` are the only allowed external references
- New CDN imports require explicit approval before adding

**11. All JS, CSS, and HTML stay in `runeportal_phase4.html`.**  
If you find yourself wanting to create a second file, restructure the approach.

---

## GAME LOOP

**12. There is one `requestAnimationFrame` game loop. Never add a second.**  
All new systems (idle, crafting timers, aura effects) hook into the existing loop or use `setInterval` for non-frame-critical updates.

**13. Never replace the main game loop. Only extend it.**  
Add new function calls inside the existing loop body. Do not restructure the loop itself.

---

## NAMING CONVENTIONS

**14. Use exact stat names from the current HTML — do not invent alternatives.**  
Check CONTEXT.md for confirmed current stat names. The handoff and GDD may be ahead of the actual code.

**15. Player object field names are locked once set.**  
Renaming a field = schema change = mandatory localStorage clear warning.

---

## PATCHING APPROACH

**16. Line-number targeted surgery only for structural HTML changes.**  
For changes near `<head>`, `<body>`, `<script>`, or `<style>` tags — identify the exact line numbers first, then patch by line reference, never by block content match.

**17. One feature per patch.**  
Do not bundle multiple unrelated changes into one patch. If one breaks, you need to know which one.

**18. Changelog comment block required on every patch.**  
Add or update a comment block at the top of the `<script>` section:
```javascript
/*
=== CHANGELOG ===
[DATE] — [FEATURE]: [what changed]
[DATE] — [FEATURE]: [what changed]
*/
```

---

## MOBILE CONSTRAINT

**19. Virtual joystick must never break.**  
After any patch, confirm the joystick still renders and responds on mobile viewport.  
Test at 390px wide (iPhone viewport) before marking a task complete.

**20. All new UI buttons must be touch-safe.**  
Minimum tap target size: 44x44px. No hover-only interactions.

---

## WHAT FABLE 5 / ANY AGENT MUST NEVER DO

- Never rename stats without a full find-replace audit across: player init, HUD render, combat logic, XP system, save/load, and equippedBonuses
- Never use `innerHTML` for HUD updates if the existing pattern uses `textContent`
- Never add a second game loop or second `requestAnimationFrame`
- Never break the mobile virtual joystick
- Never add a CDN import without flagging it for approval
- Never assume the handoff.md or GDD are in sync with the HTML — always read the HTML first
- Never mark a task complete without verifying the file size changed

---

*RULES.md — RunePortal — jordan23wagner-ops — June 2026*
