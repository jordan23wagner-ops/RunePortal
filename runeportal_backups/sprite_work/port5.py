# -*- coding: utf-8 -*-
import io
HTML = r"C:\Users\Jordon\OneDrive\Desktop\RunePortal\runeportal_phase5.html"
with io.open(HTML, "r", encoding="utf-8") as f:
    content = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1) Overlay CSS — injected before </style>
OVERLAY_CSS = r"""
  /* ── PHASE 5B HUD / OVERLAYS (HTML, projected over the WebGL canvas) ──── */
  #hud-zone {
    position: fixed; top: 8px; left: 0; right: 0; text-align: center; z-index: 10;
    font: 15px/1.3 monospace; color: #e8c97a; text-shadow: 0 1px 3px #000;
    pointer-events: none; letter-spacing: 1px;
  }
  #hud-zone small { display:block; font-size: 11px; color: #b9a16a; letter-spacing: 2px; }
  #hud-stats {
    position: fixed; top: 10px; left: 12px; z-index: 10; font: 13px/1.5 monospace;
    color: #e8c97a; text-shadow: 0 1px 2px #000; pointer-events: none;
  }
  #hud-stats .hp { color: #e44444; }
  #hud-stats .gold { color: #e8c97a; }
  #enemy-hpbars { position: fixed; inset: 0; z-index: 8; pointer-events: none; overflow: hidden; }
  .ehp { position: absolute; width: 34px; height: 5px; background: #222; border: 1px solid #000;
         transform: translate(-50%, -50%); }
  .ehp > i { display: block; height: 100%; background: #44aa44; }

  #zone-banner {
    position: fixed; top: 38%; left: 0; right: 0; text-align: center; z-index: 11;
    font: 26px/1.3 monospace; color: #e8c97a; text-shadow: 0 2px 6px #000;
    display: none; pointer-events: none; letter-spacing: 2px;
  }
  #zone-fade {
    position: fixed; inset: 0; background: #000; opacity: 0; z-index: 30;
    transition: opacity 0.25s linear; pointer-events: none;
  }
  #sickness-bar {
    position: fixed; bottom: 160px; left: 50%; transform: translateX(-50%); z-index: 12;
    display: none; font: 12px monospace; color: #b06ad0; text-shadow: 0 1px 2px #000;
    background: rgba(20,0,30,0.6); padding: 4px 10px; border: 1px solid #5a2a7a; border-radius: 4px;
  }
  #death-screen {
    position: fixed; inset: 0; z-index: 40; display: none;
    background: rgba(20, 0, 0, 0.78); color: #e44444; text-align: center;
    flex-direction: column; align-items: center; justify-content: center; font-family: monospace;
  }
  #death-screen.show { display: flex; }
  #death-screen h1 { font-size: 52px; letter-spacing: 8px; margin-bottom: 14px; text-shadow: 0 3px 10px #000; }
  #death-msg { color: #d8b070; font-size: 15px; margin-bottom: 26px; }
  #respawn-btn {
    min-width: 200px; min-height: 48px; font: 18px monospace; letter-spacing: 4px;
    color: #e8c97a; background: #2a1414; border: 2px solid #e8c97a; border-radius: 6px;
    cursor: pointer; padding: 10px 28px;
  }
  #respawn-btn:active { background: #3a1c1c; }
"""
old_style_close = "</style>\n</head>"
assert content.count(old_style_close) == 1, "style anchor"
content = content.replace(old_style_close, OVERLAY_CSS + "</style>\n</head>", 1)

# ─────────────────────────────────────────────────────────────────────────────
# 2) HUD HTML — replace the scaffold's single #hud div with the full overlay set
OLD_HUD = '''  <div id="hud">RunePortal — Phase 5 · Three.js scaffold<br>WASD / Arrows / joystick to move</div>'''
assert content.count(OLD_HUD) == 1, "hud anchor"
OVERLAY_HTML = '''  <div id="hud-zone"></div>
  <div id="hud-stats"><div class="hp" id="hud-hp">HP: 100/100</div><div class="gold" id="hud-gold">Gold: 0</div></div>
  <div id="enemy-hpbars"></div>
  <div id="zone-banner"></div>
  <div id="sickness-bar">Death Sickness <span id="sickness-timer">0:00</span></div>
  <div id="zone-fade"></div>
  <div id="death-screen">
    <h1>YOU DIED</h1>
    <div id="death-msg"></div>
    <button id="respawn-btn" onclick="respawnPlayer()">RESPAWN</button>
  </div>'''
content = content.replace(OLD_HUD, OVERLAY_HTML, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 3) Replace the entire inline <script> body (slice between two stable anchors)
START = "  /*\n  === CHANGELOG ==="
END = "</script>\n</body>"
si = content.index(START)
ei = content.index(END)
NEW_SCRIPT = open(r"C:\Users\Jordon\OneDrive\Desktop\runeportal_backups\sprite_work\game5.js", encoding="utf-8").read()
content = content[:si] + NEW_SCRIPT + "\n  " + content[ei:]

with io.open(HTML, "w", encoding="utf-8") as f:
    f.write(content)
print("patched. new size:", len(content))
