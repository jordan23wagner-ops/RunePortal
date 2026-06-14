# -*- coding: utf-8 -*-
import io
HTML = r"C:\Users\Jordon\OneDrive\Desktop\RunePortal\runeportal_phase5.html"
c = io.open(HTML, "r", encoding="utf-8").read()

def rep(old, new):
    assert c.count(old) == 1, f"anchor not unique ({c.count(old)}): {old[:60]!r}"
    return c.replace(old, new, 1)

# 1) CSS — drop the orphan .hp rule, add the bottom-left HP bar styles (phase4 look)
c = rep(
"""  #hud-stats .hp { color: #e44444; }
  #hud-stats .gold { color: #e8c97a; }""",
"""  #hud-stats .gold { color: #e8c97a; }
  /* ── PLAYER HP BAR (bottom-left, above the joystick) — phase4 style ── */
  #hud-hpbar { position: fixed; left: 24px; bottom: 150px; z-index: 10; pointer-events: none;
    font: 13px/1.4 monospace; color: #e44444; text-shadow: 0 1px 2px #000; }
  #hud-hp-text { margin-bottom: 3px; }
  #hud-hp-track { width: 140px; height: 10px; background: #333333; border: 1px solid #000; }
  #hud-hp-fill { height: 100%; width: 100%; background: #e44444; }""")

# 2) HTML — remove top-left HP text (keep Gold), add the HP bar overlay
c = rep(
'''  <div id="hud-stats"><div class="hp" id="hud-hp">HP: 100/100</div><div class="gold" id="hud-gold">Gold: 0</div></div>''',
'''  <div id="hud-stats"><div class="gold" id="hud-gold">Gold: 0</div></div>
  <div id="hud-hpbar"><div id="hud-hp-text">HP: 100 / 100</div><div id="hud-hp-track"><div id="hud-hp-fill"></div></div></div>''')

# 3) updateHUD() — write text + scale the fill each frame (replaces the old top-left line)
c = rep(
"""    document.getElementById('hud-hp').textContent = `HP: ${Math.ceil(player.hp)}/${player.maxHp}`;""",
"""    const hpFrac = player.maxHp > 0 ? Math.max(0, Math.min(1, player.hp / player.maxHp)) : 0;
    document.getElementById('hud-hp-text').textContent = `HP: ${Math.ceil(player.hp)} / ${player.maxHp}`;
    document.getElementById('hud-hp-fill').style.width = (hpFrac * 100) + '%';""")

io.open(HTML, "w", encoding="utf-8").write(c)
print("patched. new char length:", len(c))
