  // ═══════════════════════════════════════════════════════════
  //  PLAYER UI LAYER (HTML overlay) — stats / minimap / backpack /
  //  equipment / dev / portal labels. No Three.js scene changes.
  // ═══════════════════════════════════════════════════════════
  const STAT_KEYS = [['dexterity','DEX'],['strength','STR'],['vigor','VIG'],['intelligence','INT']];
  const RARITY_DOT = { common:'#888888', rare:'#4a90d9', epic:'#9b59b6', legendary:'#ff8f00' };
  const RARITY_TEXT = { common:'#cccccc', rare:'#4a90d9', epic:'#9b59b6', legendary:'#ff8f00' };
  const SELL_VALUE = { common:10, rare:50, epic:150, legendary:500 };
  function getSellValue(item) { return SELL_VALUE[item.rarity] || 10; }

  // ── STATS PANEL (top-left) ──
  let statsBuilt = false;
  function buildStatsPanel() {
    const el = document.getElementById('ui-stats'); el.innerHTML = '';
    for (const [key, ab] of STAT_KEYS) {
      const row = document.createElement('div'); row.className = 'stat-row';
      row.innerHTML = `<span class="stat-name" id="st-${key}">${ab}: 1</span><div class="stat-xp"><i id="stx-${key}"></i></div>`;
      el.appendChild(row);
    }
    statsBuilt = true;
  }
  function updateStatsPanel() {
    if (!statsBuilt) buildStatsPanel();
    for (const [key, ab] of STAT_KEYS) {
      const lv = player.skills.level[key], xp = player.skills.xp[key], need = 100 * lv;
      document.getElementById('st-' + key).textContent = `${ab}: ${lv}`;
      document.getElementById('stx-' + key).style.width = Math.max(0, Math.min(1, xp / need)) * 100 + '%';
    }
  }

  // ── MINIMAP (top-right) ──
  const mmCanvas = document.getElementById('ui-minimap');
  const mmCtx = mmCanvas.getContext('2d');
  function allPortals() {
    const ps = getPortals().map(p => ({ x:p.x, y:p.y, target:p.target }));
    const hp = getHomesteadPortal(); if (hp) ps.push({ x:hp.x, y:hp.y, target:'homestead' });
    return ps;
  }
  function drawMinimap() {
    const W = 120, H = 120, s = W / GRID;
    mmCtx.clearRect(0, 0, W, H);
    mmCtx.fillStyle = '#111'; mmCtx.fillRect(0, 0, W, H);
    mmCtx.strokeStyle = '#e8c97a'; mmCtx.lineWidth = 1; mmCtx.strokeRect(0.5, 0.5, W - 1, H - 1);
    // portals (cyan)
    mmCtx.fillStyle = '#39d6ff';
    for (const p of allPortals()) mmCtx.fillRect(p.x * s - 1.5, p.y * s - 1.5, 3, 3);
    // enemies (rarity colored)
    for (const e of enemies) { mmCtx.fillStyle = RARITY_DOT[e.rarity] || '#888888'; mmCtx.fillRect(e.x * s - 1, e.y * s - 1, 2, 2); }
    // player (white)
    mmCtx.fillStyle = '#ffffff'; mmCtx.fillRect(player.x * s - 2, player.y * s - 2, 4, 4);
    document.getElementById('ui-minimap-label').textContent = ZONES[currentZoneId].name;
  }

  // ── PANEL OPEN/CLOSE STATE ──
  function syncPanelState() {
    const open = document.getElementById('backpack-overlay').classList.contains('open')
              || document.getElementById('dev-overlay').classList.contains('open');
    anyPanelOpen = open;
    player.uiLocked = open;
  }
  function toggleBag() {
    const o = document.getElementById('backpack-overlay');
    if (o.classList.contains('open')) closeBag(); else openBag();
  }
  function openBag() {
    document.getElementById('dev-overlay').classList.remove('open');
    document.getElementById('backpack-overlay').classList.add('open');
    anyPanelOpen = true; player.uiLocked = true;
    renderBackpack();
  }
  function closeBag() { document.getElementById('backpack-overlay').classList.remove('open'); syncPanelState(); }

  // ── BAG TABS ──
  let activeTab = 'items';
  function switchTab(tab) {
    activeTab = tab;
    document.getElementById('bptab-items').classList.toggle('active', tab === 'items');
    document.getElementById('bptab-equip').classList.toggle('active', tab === 'equipment');
    document.getElementById('bp-items-view').style.display = tab === 'items' ? 'block' : 'none';
    document.getElementById('bp-equip-view').style.display = tab === 'equipment' ? 'block' : 'none';
    renderBackpack();
  }

  // ── BAG RENDER ──
  function rarText(r) { return RARITY_TEXT[r] || '#cccccc'; }
  function renderBackpack() {
    document.getElementById('bp-gold').innerHTML = '&#9679; Gold: ' + backpack.gold;

    // Items
    const grid = document.getElementById('bp-item-grid'); grid.innerHTML = '';
    if (!backpack.items.length) grid.innerHTML = '<div class="bp-empty">Empty</div>';
    else backpack.items.forEach((item, idx) => {
      const d = document.createElement('div');
      d.className = 'bp-item ' + (item.rarity || 'common');
      d.innerHTML = `<div class="bp-item-name">${item.name}</div><div class="bp-item-type">${item.type || item.slot}</div>`
        + `<button class="bp-sell" onclick="event.stopPropagation();sellFromBag(${idx})">SELL ${getSellValue(item)}g</button>`;
      d.onclick = () => equipFromBag(idx);
      grid.appendChild(d);
    });

    // Food
    const fg = document.getElementById('bp-food-grid'); fg.innerHTML = '';
    if (!backpack.food.length) fg.innerHTML = '<div class="bp-empty">No food</div>';
    else backpack.food.forEach((f, idx) => {
      const d = document.createElement('div'); d.className = 'bp-item food';
      d.innerHTML = `<div class="bp-item-name">${f.name}</div><div class="bp-item-type">+${f.healAmt} HP</div>`;
      d.onclick = () => eatFromBag(idx);
      fg.appendChild(d);
    });

    // Materials
    const ml = document.getElementById('bp-materials'); ml.innerHTML = '';
    MATERIAL_DB.forEach(m => { const cnt = backpack.materials[m.id] || 0;
      ml.innerHTML += `<div class="bp-mat" style="color:${cnt > 0 ? '#7d5' : '#444'}">${m.name}: <b>${cnt}</b></div>`; });

    // Equipment slots
    const slotsEl = document.getElementById('bp-slots'); slotsEl.innerHTML = '';
    for (const slot of ['weapon','helmet','chest','legs','boots']) {
      const it = player.equipped[slot];
      const div = document.createElement('div'); div.className = 'bp-slot' + (it ? ' filled' : '');
      div.innerHTML = `<div class="bp-slot-label">${slot}</div>`
        + (it ? `<div class="bp-slot-item" style="color:${rarText(it.rarity)}">${it.name}</div>`
                + `<button class="bp-uneq" onclick="unequipSlot('${slot}')">UNEQUIP</button>`
              : `<div class="bp-slot-item empty">Empty</div>`);
      slotsEl.appendChild(div);
    }
    // Stat bonus summary
    const b = player.equippedBonuses;
    document.getElementById('bp-bonus').textContent = `DEX +${b.dexterity}   STR +${b.strength}   VIG +${b.vigor}   INT +${b.intelligence}`;
  }

  // ── EQUIP / UNEQUIP / SELL / EAT (logic ported from phase4) ──
  function equipFromBag(idx) {
    const item = backpack.items[idx]; if (!item) return;
    const slot = item.slot; if (!slot || !(slot in player.equipped)) return;
    const cur = player.equipped[slot];
    backpack.items.splice(idx, 1);          // task spec: remove from backpack
    if (cur) backpack.items.push(cur);       // swap the previously-equipped back in
    player.equipped[slot] = item;
    recalcEquippedBonuses(); recalcMaxHp(); saveGame(); renderBackpack();
  }
  function unequipSlot(slot) {
    const item = player.equipped[slot]; if (!item) return;
    player.equipped[slot] = null; backpack.items.push(item);
    recalcEquippedBonuses(); recalcMaxHp(); saveGame(); renderBackpack();
  }
  function sellFromBag(idx) {
    const item = backpack.items[idx]; if (!item) return;
    if (item.untradeable) return;
    backpack.gold += getSellValue(item);
    backpack.items.splice(idx, 1);
    saveGame(); renderBackpack();
  }
  function eatFromBag(idx) {
    const f = backpack.food[idx]; if (!f) return;
    player.hp = Math.min(player.maxHp, player.hp + f.healAmt);
    backpack.food.splice(idx, 1);
    saveGame(); renderBackpack();
  }

  // ── HOME button — teleport to Homestead if not in combat ──
  function goHome() {
    if (currentZoneId === 'homestead' || zoneFading) return;
    const inCombat = enemies.some(e => Math.hypot(player.x - e.x, player.y - e.y) < 3);
    if (inCombat) { showBanner('Cannot return\nwhile enemies are near'); return; }
    transitionToZone('homestead');
  }

  // ── DEV panel ──
  function toggleDev() {
    const o = document.getElementById('dev-overlay');
    if (o.classList.contains('open')) { o.classList.remove('open'); syncPanelState(); }
    else {
      document.getElementById('backpack-overlay').classList.remove('open');
      o.classList.add('open'); anyPanelOpen = true; player.uiLocked = true; renderDev();
    }
  }
  function renderDev() {
    document.getElementById('dev-json').textContent = JSON.stringify({ player, backpack, currentZoneId }, null, 2);
    document.getElementById('dev-inv').textContent = 'Invincible: ' + (devInvincible ? 'ON' : 'OFF');
  }
  function devToggleInvincible() { devInvincible = !devInvincible; renderDev(); }
  function devClearSave() { try { localStorage.removeItem('runeportal_save'); } catch(e) {} location.reload(); }

  // ── PORTAL PROXIMITY LABEL (within 3 units) + E / tap to enter ──
  let nearPortal = null;
  function updatePortalLabel() {
    const el = document.getElementById('portal-label');
    if (player.isDead || anyPanelOpen) { el.style.display = 'none'; nearPortal = null; return; }
    let best = null, bd = 3;
    for (const p of allPortals()) { const d = Math.hypot(player.x - p.x, player.y - p.y); if (d < bd) { bd = d; best = p; } }
    nearPortal = best;
    if (best) {
      const zn = ZONES[best.target] ? ZONES[best.target].name : best.target;
      el.innerHTML = `${zn} &rarr; <b>Press E to enter</b>`;
      el.style.display = 'block';
    } else el.style.display = 'none';
  }
  function tryEnterPortal() { if (nearPortal && !zoneFading) transitionToZone(nearPortal.target); }
