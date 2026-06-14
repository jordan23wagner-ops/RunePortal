# -*- coding: utf-8 -*-
import io
HTML = r"C:\Users\Jordon\OneDrive\Desktop\RunePortal\runeportal_phase5.html"
c = io.open(HTML, "r", encoding="utf-8").read()
sizes = []
def mark(label): sizes.append((label, len(c)))

def rep(old, new):
    global c
    assert c.count(old) == 1, f"anchor not unique ({c.count(old)}): {old[:70]!r}"
    c = c.replace(old, new, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 1) CSS — full UI layer (phase4 palette), injected before </style>
CSS = r"""
  /* ════ PHASE 5C — PLAYER UI LAYER (HTML overlays, phase4 palette) ════ */
  #ui-stats { position: fixed; top: 10px; left: 10px; z-index: 10; font: 11px monospace; pointer-events: none; }
  #ui-stats .stat-row { margin-bottom: 4px; }
  #ui-stats .stat-name { color: #e8c97a; font-weight: bold; text-shadow: 0 1px 2px #000; display:block; }
  #ui-stats .stat-xp { width: 80px; height: 5px; background: #333; margin-top: 1px; }
  #ui-stats .stat-xp > i { display:block; height:100%; width:0%; background:#e8c97a; }

  #ui-minimap-wrap { position: fixed; top: 10px; right: 10px; z-index: 10; text-align:center; pointer-events:none; }
  #ui-minimap-label { color:#e8c97a; font:10px monospace; margin-bottom:3px; text-shadow:0 1px 2px #000; letter-spacing:1px; }
  #ui-minimap { background:#111; border:1px solid #e8c97a; display:block; }

  #ui-buttons { position: fixed; right: 10px; top: 145px; z-index: 11; display:flex; flex-direction:column; gap:6px; }
  .ui-btn { width:60px; min-height:44px; font:11px monospace; letter-spacing:1px; color:#e8c97a;
    background:#1a1a1a; border:1px solid #e8c97a; border-radius:3px; cursor:pointer; }
  .ui-btn:active { background:#2a2a2a; }
  .ui-btn.wide { width:auto; padding:10px 16px; }
  .ui-btn.danger { color:#ff7b7b; border-color:#ff7b7b; }

  #portal-label { display:none; position:fixed; bottom:200px; left:50%; transform:translateX(-50%); z-index:14;
    background:rgba(10,10,10,0.85); color:#e8c97a; border:1px solid #e8c97a; border-radius:8px;
    padding:10px 20px; font:14px monospace; letter-spacing:1px; cursor:pointer; min-height:44px; }

  /* Backpack + Dev full-screen overlays */
  #backpack-overlay, #dev-overlay {
    display:none; position:fixed; inset:0; z-index:100;
    background:rgba(26,26,46,0.97); color:#ccc; font-family:'Courier New',monospace;
    flex-direction:column; padding:14px; overflow-y:auto;
  }
  #backpack-overlay.open, #dev-overlay.open { display:flex; }
  .bp-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .bp-gold { color:#e8c97a; font-size:15px; letter-spacing:1px; }
  .bp-close { background:#333; color:#e8c97a; border:1px solid #e8c97a; border-radius:4px;
    min-width:44px; min-height:44px; font-size:18px; cursor:pointer; }
  .bp-tabs { display:flex; gap:6px; border-bottom:1px solid #333; padding-bottom:8px; margin-bottom:12px; }
  .bp-tab { padding:10px 18px; min-height:44px; cursor:pointer; font-size:12px; letter-spacing:1px;
    color:#666; border:1px solid #333; border-radius:3px; background:#111; }
  .bp-tab.active { color:#e8c97a; border-color:#e8c97a; background:#1f1f33; }
  .bp-section-title { color:#888; font-size:11px; letter-spacing:1px; margin:14px 0 6px; text-transform:uppercase; }
  .bp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:8px; }
  .bp-empty { color:#555; grid-column:1/-1; text-align:center; padding:18px; }
  .bp-item { background:#15152a; border:1px solid #333; border-radius:5px; padding:8px 6px; text-align:center; cursor:pointer; }
  .bp-item:hover { border-color:#e8c97a; }
  .bp-item.common{color:#ccc;border-color:#555;} .bp-item.rare{color:#4a90d9;border-color:#4a90d9;}
  .bp-item.epic{color:#9b59b6;border-color:#9b59b6;} .bp-item.legendary{color:#ff8f00;border-color:#ff8f00;}
  .bp-item.food{color:#fa8;border-color:#c85;}
  .bp-item-name{font-size:11px;} .bp-item-type{font-size:9px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-top:2px;}
  .bp-sell{margin-top:6px;width:100%;min-height:32px;font:10px monospace;color:#111;background:#e8c97a;border:none;border-radius:3px;cursor:pointer;}
  .bp-mat{font-size:12px;padding:2px 0;}
  .bp-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;}
  .bp-slot{background:#111;border:1px solid #2a2a2a;border-radius:6px;padding:12px 8px;text-align:center;min-height:96px;}
  .bp-slot.filled{border-color:#e8c97a55;}
  .bp-slot-label{font-size:9px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;}
  .bp-slot-item{font-size:12px;color:#e8c97a;margin-bottom:8px;} .bp-slot-item.empty{color:#444;}
  .bp-uneq{min-height:32px;padding:5px 12px;font:10px monospace;color:#fff;background:#555;border:none;border-radius:3px;cursor:pointer;}
  .bp-bonus{margin-top:16px;color:#4a90d9;font-size:13px;letter-spacing:1px;}
  #dev-json{background:#0a0a14;border:1px solid #333;border-radius:5px;padding:10px;font:11px monospace;color:#9fd;white-space:pre-wrap;max-height:60vh;overflow:auto;}
  .dev-actions{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;}
"""
rep("</style>\n</head>", CSS + "</style>\n</head>")
mark("CSS")

# ─────────────────────────────────────────────────────────────────────────────
# 2) HTML — remove top-left gold, add persistent UI overlays (stats/minimap/buttons/portal)
rep(
'''  <div id="hud-stats"><div class="gold" id="hud-gold">Gold: 0</div></div>
''',
'''  <div id="ui-stats"></div>
  <div id="ui-minimap-wrap"><div id="ui-minimap-label"></div><canvas id="ui-minimap" width="120" height="120"></canvas></div>
  <div id="ui-buttons">
    <button class="ui-btn" id="btn-bag" onclick="toggleBag()">BAG</button>
    <button class="ui-btn" id="btn-home" onclick="goHome()">HOME</button>
    <button class="ui-btn" id="btn-dev" onclick="toggleDev()">DEV</button>
  </div>
  <div id="portal-label" onclick="tryEnterPortal()"></div>
''')
mark("HUD html")

# 3) HTML — backpack + dev overlays, injected before the Three.js script tag
THREE_TAG = '''  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'''
PANELS = '''  <div id="backpack-overlay">
    <div class="bp-header">
      <div class="bp-gold" id="bp-gold">&#9679; Gold: 0</div>
      <button class="bp-close" onclick="closeBag()">&#10005;</button>
    </div>
    <div class="bp-tabs">
      <div class="bp-tab active" id="bptab-items" onclick="switchTab('items')">BACKPACK</div>
      <div class="bp-tab" id="bptab-equip" onclick="switchTab('equipment')">EQUIPMENT</div>
    </div>
    <div id="bp-items-view">
      <div id="bp-item-grid" class="bp-grid"></div>
      <div class="bp-section-title">Food</div>
      <div id="bp-food-grid" class="bp-grid"></div>
      <div class="bp-section-title">Materials</div>
      <div id="bp-materials"></div>
    </div>
    <div id="bp-equip-view" style="display:none">
      <div id="bp-slots" class="bp-slots"></div>
      <div class="bp-bonus" id="bp-bonus"></div>
    </div>
  </div>
  <div id="dev-overlay">
    <div class="bp-header">
      <div class="bp-gold">DEV PANEL</div>
      <button class="bp-close" onclick="toggleDev()">&#10005;</button>
    </div>
    <pre id="dev-json"></pre>
    <div class="dev-actions">
      <button class="ui-btn wide" id="dev-inv" onclick="devToggleInvincible()">Invincible: OFF</button>
      <button class="ui-btn wide danger" onclick="devClearSave()">Clear Save &amp; Reload</button>
    </div>
  </div>
'''
rep(THREE_TAG, PANELS + THREE_TAG)
mark("panels html")

# ─────────────────────────────────────────────────────────────────────────────
# 4) JS — UI functions, injected before the GAME LOOP section
UI_JS = open(r"C:\Users\Jordon\OneDrive\Desktop\runeportal_backups\sprite_work\ui5.js", encoding="utf-8").read()
LOOP_ANCHOR = """  // ═══════════════════════════════════════════════════════════
  //  GAME LOOP — single requestAnimationFrame (no PIXI ticker)
  // ═══════════════════════════════════════════════════════════"""
rep(LOOP_ANCHOR, UI_JS + "\n" + LOOP_ANCHOR)
mark("UI js")

# 5) updateHUD — drop the gold line, add UI per-frame updates
rep(
"""    document.getElementById('hud-hp-fill').style.width = (hpFrac * 100) + '%';
    document.getElementById('hud-gold').textContent = `Gold: ${backpack.gold}`;
  }""",
"""    document.getElementById('hud-hp-fill').style.width = (hpFrac * 100) + '%';
    updateStatsPanel();
    drawMinimap();
    updatePortalLabel();
  }""")
mark("updateHUD")

# 6) Input — add E (enter portal) / B (toggle bag) / Escape (close panels)
rep(
"""  window.addEventListener('keyup',   e => { if (MOVE_KEYS[e.code]) { keys[MOVE_KEYS[e.code]] = false; e.preventDefault(); } });""",
"""  window.addEventListener('keyup',   e => { if (MOVE_KEYS[e.code]) { keys[MOVE_KEYS[e.code]] = false; e.preventDefault(); } });
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyE') { if (!anyPanelOpen) tryEnterPortal(); }
    else if (e.code === 'KeyB') { toggleBag(); e.preventDefault(); }
    else if (e.code === 'Escape') {
      document.getElementById('backpack-overlay').classList.remove('open');
      document.getElementById('dev-overlay').classList.remove('open');
      syncPanelState();
    }
  });""")
mark("input")

io.open(HTML, "w", encoding="utf-8").write(c)
print("PATCHED. char length progression:")
prev = 57488
for label, sz in sizes:
    print(f"  after {label:12} : {sz}  (+{sz-prev})"); prev = sz
