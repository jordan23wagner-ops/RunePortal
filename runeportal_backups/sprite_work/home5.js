  // ═══════════════════════════════════════════════════════════
  //  HOMESTEAD ZONE (Three.js) — 8 structures, paths, 3 portals,
  //  8 trees, projected labels + proximity prompts. Built into a
  //  homesteadGroup, cleared/rebuilt on zone entry. No game logic
  //  changes beyond the 3-portal homestead hub + bonfire rest.
  // ═══════════════════════════════════════════════════════════
  let homesteadGroup = null;
  let homesteadLabels = [];        // { el, w:[x,y,z] }
  let homesteadInteractables = []; // { w:[x,z], range, prompt, type, name }
  let nearInteract = null;
  const HS = { flames: [], orb: null, sparks: [], portals: [] };

  function hsLambert(color, opts) { return new THREE.MeshLambertMaterial(Object.assign({ color, flatShading: true }, opts || {})); }
  function hsMesh(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; homesteadGroup.add(m); return m;
  }
  function hsLabel(text, color, x, y, z) {
    const el = document.createElement('div'); el.className = 'hs-label';
    el.textContent = text; el.style.color = color;
    document.getElementById('homestead-labels').appendChild(el);
    homesteadLabels.push({ el, w: [x, y, z] });
  }
  function hsPath(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const p = hsMesh(new THREE.BoxGeometry(len, 0.02, 0.7), hsLambert(0x55504a), (ax + bx) / 2, 0.02, (az + bz) / 2);
    p.rotation.y = Math.atan2(-dz, dx); p.castShadow = false;
  }

  function clearHomestead() {
    if (homesteadGroup) {
      scene.remove(homesteadGroup);
      homesteadGroup.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
      homesteadGroup = null;
    }
    for (const l of homesteadLabels) l.el.remove();
    homesteadLabels = []; homesteadInteractables = [];
    HS.flames = []; HS.orb = null; HS.sparks = []; HS.portals = [];
    const pr = document.getElementById('homestead-prompt'); if (pr) pr.style.display = 'none';
  }

  function buildHomestead() {
    clearHomestead();
    homesteadGroup = new THREE.Group();
    scene.add(homesteadGroup);

    // ── 1. BONFIRE (-1.5, -9.5) ──
    { const bx = -1.5, bz = -9.5;
      hsMesh(new THREE.CylinderGeometry(1.0, 1.2, 0.25, 10), hsLambert(0x888880), bx, 0.125, bz);
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3;
        const log = hsMesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), hsLambert(0x4a2e10), bx + Math.cos(a) * 0.3, 0.4, bz + Math.sin(a) * 0.3);
        log.rotation.z = Math.cos(a) * 0.4; log.rotation.x = Math.sin(a) * 0.4; }
      const flame = hsMesh(new THREE.ConeGeometry(0.28, 0.75, 7), hsLambert(0xff6600, { emissive: 0xff3300, emissiveIntensity: 1.0 }), bx, 0.7, bz);
      HS.flames.push(flame);
      const fl = new THREE.PointLight(0xff4400, 2.0, 7); fl.position.set(bx, 0.9, bz); homesteadGroup.add(fl);
      hsLabel('⚒ Bonfire', '#ff8800', bx, 1.5, bz);
      homesteadInteractables.push({ w: [bx, bz], range: 2, prompt: 'Press E — Rest & Recover', type: 'rest' });
    }

    // ── 2. GARDEN (7, -9.5) ──
    { const gx = 7, gz = -9.5;
      hsMesh(new THREE.BoxGeometry(2.5, 0.15, 2.0), hsLambert(0x3d5c1a), gx, 0.075, gz);
      hsMesh(new THREE.BoxGeometry(2.6, 0.3, 0.1), hsLambert(0x5a4020), gx, 0.15, gz - 1.0);
      hsMesh(new THREE.BoxGeometry(2.6, 0.3, 0.1), hsLambert(0x5a4020), gx, 0.15, gz + 1.0);
      const sl = hsMesh(new THREE.BoxGeometry(2.6, 0.3, 0.1), hsLambert(0x5a4020), gx - 1.25, 0.15, gz); sl.rotation.y = Math.PI / 2;
      const sr = hsMesh(new THREE.BoxGeometry(2.6, 0.3, 0.1), hsLambert(0x5a4020), gx + 1.25, 0.15, gz); sr.rotation.y = Math.PI / 2;
      const tufts = [[-0.8, -0.5], [0.0, -0.6], [0.8, -0.4], [-0.7, 0.5], [0.1, 0.55], [0.85, 0.45]];
      for (const [dx, dz] of tufts) { const t = hsMesh(new THREE.SphereGeometry(0.18, 5, 4), hsLambert(0x2d8a20), gx + dx, 0.22, gz + dz); t.scale.y = 0.5; }
      for (const [dx, dz] of [[-1.25, -1.0], [1.25, -1.0], [-1.25, 1.0], [1.25, 1.0]])
        hsMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 4), hsLambert(0x5a4020), gx + dx, 0.25, gz + dz);
      const gl = new THREE.PointLight(0x44ff88, 0.4, 3); gl.position.set(gx, 0.5, gz); homesteadGroup.add(gl);
      hsLabel('Garden', '#44ff88', gx, 1.1, gz);
      homesteadInteractables.push({ w: [gx, gz], range: 2.5, prompt: 'Press E — Tend Garden', type: 'building', name: 'Garden' });
    }

    // ── 3. SHRINE (-9, 0) ──
    { const sx = -9, sz = 0;
      hsMesh(new THREE.CylinderGeometry(1.4, 1.6, 0.2, 8), hsLambert(0x706860), sx, 0.1, sz);
      hsMesh(new THREE.CylinderGeometry(0.18, 0.22, 2.2, 6), hsLambert(0x807870), sx - 0.9, 1.1, sz);
      hsMesh(new THREE.CylinderGeometry(0.18, 0.22, 2.2, 6), hsLambert(0x807870), sx + 0.9, 1.1, sz);
      hsMesh(new THREE.BoxGeometry(0.8, 0.6, 0.5), hsLambert(0x909088), sx, 0.5, sz);
      const orb = hsMesh(new THREE.SphereGeometry(0.22, 8, 6), hsLambert(0xcc44ff, { emissive: 0x8800cc, emissiveIntensity: 0.8 }), sx, 1.0, sz);
      HS.orb = { mesh: orb, baseY: 1.0 };
      for (const [dx, dz] of [[-0.5, -0.35], [0.5, -0.35], [-0.5, 0.35], [0.5, 0.35]]) {
        hsMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 5), hsLambert(0xeeddaa), sx + dx, 0.7, sz + dz);
        hsMesh(new THREE.ConeGeometry(0.03, 0.08, 4), hsLambert(0xffaa33, { emissive: 0xff6600, emissiveIntensity: 0.8 }), sx + dx, 0.85, sz + dz);
      }
      const pl = new THREE.PointLight(0xcc44ff, 1.2, 5); pl.position.set(sx, 1.3, sz); homesteadGroup.add(pl);
      hsLabel('Shrine', '#cc44ff', sx, 2.5, sz);
      homesteadInteractables.push({ w: [sx, sz], range: 2.5, prompt: 'Press E — Pray for Buffs', type: 'building', name: 'Shrine' });
    }

    // ── 4. MERCHANT (-1, -0.5) ──
    { const mx = -1, mz = -0.5;
      hsMesh(new THREE.BoxGeometry(3.2, 2.2, 3.0), hsLambert(0x2a1f0f), mx, 1.1, mz);
      const roof = hsMesh(new THREE.ConeGeometry(2.4, 1.4, 4), hsLambert(0x8b6914), mx, 2.9, mz); roof.rotation.y = Math.PI / 4;
      hsMesh(new THREE.BoxGeometry(0.75, 1.3, 0.12), hsLambert(0x0f0800), mx, 0.65, mz + 1.5);
      hsMesh(new THREE.BoxGeometry(2.0, 0.08, 0.8), hsLambert(0x7a5910), mx, 1.5, mz + 1.7);
      hsMesh(new THREE.BoxGeometry(1.2, 0.6, 0.4), hsLambert(0x5a4010), mx, 0.3, mz + 1.2);
      const ml = new THREE.PointLight(0xffdd44, 0.8, 4); ml.position.set(mx, 1.8, mz); homesteadGroup.add(ml);
      hsLabel('Merchant', '#ffdd44', mx, 3.5, mz);
      homesteadInteractables.push({ w: [mx, mz], range: 2.5, prompt: 'Press E — Open Shop', type: 'building', name: 'Merchant' });
    }

    // ── 5. WATCHTOWER (6.5, 0) ──
    { const wx = 6.5, wz = 0;
      hsMesh(new THREE.CylinderGeometry(1.0, 1.3, 4.5, 8), hsLambert(0x4a4540), wx, 2.25, wz);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI * 2 / 6;
        hsMesh(new THREE.BoxGeometry(0.28, 0.5, 0.28), hsLambert(0x3a3530), wx + Math.cos(a) * 1.0, 4.7, wz + Math.sin(a) * 1.0); }
      hsMesh(new THREE.CylinderGeometry(1.2, 1.0, 0.35, 8), hsLambert(0x3a3530), wx, 4.5, wz);
      hsMesh(new THREE.BoxGeometry(0.08, 3.0, 0.04), hsLambert(0x3d2510), wx + 1.05, 1.5, wz);
      const wl = new THREE.PointLight(0x44ddff, 0.5, 4); wl.position.set(wx, 4.6, wz); homesteadGroup.add(wl);
      hsLabel('Watchtower', '#44ddff', wx, 5.4, wz);
    }

    // ── 6. STRENGTH GUILD (-8.5, 8.5) ──
    { const x = -8.5, z = 8.5;
      hsMesh(new THREE.BoxGeometry(4.0, 2.0, 3.0), hsLambert(0x1a0808), x, 1.0, z);
      hsMesh(new THREE.BoxGeometry(4.3, 0.2, 3.3), hsLambert(0x550000), x, 2.1, z);
      for (let i = -1; i <= 1; i++) hsMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 4), hsLambert(0x888888), x + i * 0.4, 0.6, z + 1.6);
      const s1 = hsMesh(new THREE.BoxGeometry(0.08, 1.0, 0.06), hsLambert(0xcc4444), x, 1.3, z + 1.52); s1.rotation.z = Math.PI / 4;
      const s2 = hsMesh(new THREE.BoxGeometry(0.08, 1.0, 0.06), hsLambert(0xcc4444), x, 1.3, z + 1.52); s2.rotation.z = -Math.PI / 4;
      const rl = new THREE.PointLight(0xff4444, 0.6, 4); rl.position.set(x, 1.5, z); homesteadGroup.add(rl);
      hsLabel('Strength Guild', '#ff4444', x, 2.9, z);
      homesteadInteractables.push({ w: [x, z], range: 2.5, prompt: 'Press E — Enter Guild', type: 'building', name: 'Strength Guild' });
    }

    // ── 7. RANGE GUILD (-0.5, 8.5) ──
    { const x = -0.5, z = 8.5;
      hsMesh(new THREE.BoxGeometry(4.0, 2.0, 3.0), hsLambert(0x080f1a), x, 1.0, z);
      hsMesh(new THREE.BoxGeometry(4.3, 0.2, 3.3), hsLambert(0x003366), x, 2.1, z);
      const t1 = hsMesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12), hsLambert(0xcc2200), x, 1.2, z + 1.55); t1.rotation.x = Math.PI / 2;
      const t2 = hsMesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 12), hsLambert(0xffffff), x, 1.2, z + 1.57); t2.rotation.x = Math.PI / 2;
      const t3 = hsMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), hsLambert(0xcc2200), x, 1.2, z + 1.59); t3.rotation.x = Math.PI / 2;
      const bow = hsMesh(new THREE.TorusGeometry(0.4, 0.04, 4, 8, Math.PI), hsLambert(0x88ccff), x + 1.25, 1.3, z + 1.52); bow.rotation.z = -Math.PI / 2;
      const bl = new THREE.PointLight(0x44aaff, 0.5, 4); bl.position.set(x, 1.5, z); homesteadGroup.add(bl);
      hsLabel('Range Guild', '#44aaff', x, 2.9, z);
      homesteadInteractables.push({ w: [x, z], range: 2.5, prompt: 'Press E — Enter Guild', type: 'building', name: 'Range Guild' });
    }

    // ── 8. MAGE GUILD (7.5, 8.5) ──
    { const x = 7.5, z = 8.5;
      hsMesh(new THREE.CylinderGeometry(1.6, 1.6, 2.8, 8), hsLambert(0x12082a), x, 1.4, z);
      hsMesh(new THREE.ConeGeometry(2.0, 1.8, 8), hsLambert(0x3a0066), x, 3.7, z);
      hsMesh(new THREE.CylinderGeometry(0.06, 0.22, 0.9, 4), hsLambert(0xaa44ff, { emissive: 0x6600cc, emissiveIntensity: 0.7 }), x, 5.05, z);
      for (let i = 0; i < 3; i++) {
        const sp = hsMesh(new THREE.SphereGeometry(0.07, 4, 4), hsLambert(0xcc88ff, { emissive: 0xcc88ff, emissiveIntensity: 0.6 }), x, 5.0, z);
        HS.sparks.push({ mesh: sp, base: [x, z], r: 0.5 + i * 0.12, yOff: 4.7 + i * 0.25, speed: 0.0012 + i * 0.0006, phase: i * 2.1 });
      }
      const pl = new THREE.PointLight(0xaa00ff, 0.8, 5); pl.position.set(x, 4.0, z); homesteadGroup.add(pl);
      hsLabel('Mage Guild', '#cc44ff', x, 6.0, z);
      homesteadInteractables.push({ w: [x, z], range: 2.5, prompt: 'Press E — Enter Guild', type: 'building', name: 'Mage Guild' });
    }

    // ── STONE PATHS — bonfire to each building ──
    const BX = -1.5, BZ = -9.5;
    for (const [tx, tz] of [[7, -9.5], [-9, 0], [-1, -0.5], [6.5, 0], [-8.5, 8.5], [-0.5, 8.5], [7.5, 8.5]]) hsPath(BX, BZ, tx, tz);

    // ── 3 ZONE PORTALS (south edge, z=13) ──
    const PORTAL_DEFS = [['ashfields', -6, 0xc87820], ['bleakwood', 0, 0x2a8a2a], ['ironbone', 6, 0x908080]];
    for (const [target, px, col] of PORTAL_DEFS) {
      const grp = new THREE.Group(); grp.position.set(px, 0, 13);
      const mat = hsLambert(col, { emissive: col, emissiveIntensity: 0.9 });
      [0.5, 1.0, 1.5].forEach(yy => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 16), mat);
        ring.position.y = yy; ring.rotation.x = Math.PI / 2; ring.castShadow = true; grp.add(ring);
      });
      const pl = new THREE.PointLight(col, 1.0, 5); pl.position.set(0, 1.0, 0); grp.add(pl);
      homesteadGroup.add(grp); HS.portals.push(grp);
      hsLabel(ZONES[target].name, '#' + col.toString(16).padStart(6, '0'), px, 2.3, 13);
    }

    // ── 8 PERIMETER TREES ──
    for (const [tx, tz] of [[-13, -12], [13, -12], [-13, 0], [13, 0], [-13, 12], [13, 12], [0, -13], [0, 13]]) {
      hsMesh(new THREE.CylinderGeometry(0.15, 0.2, 1.6, 6), hsLambert(0x3d2510), tx, 0.8, tz);
      hsMesh(new THREE.SphereGeometry(0.9, 6, 5), hsLambert(0x1a3d0f), tx, 1.9, tz);
    }
  }

  function updateHomestead() {
    const now = Date.now();
    for (const f of HS.flames) f.scale.y = 1.0 + Math.sin(now * 0.004) * 0.15;       // flicker 0.85..1.15
    if (HS.orb) HS.orb.mesh.position.y = HS.orb.baseY + Math.sin(now * 0.002) * 0.05; // float
    for (const s of HS.sparks) { const a = now * s.speed + s.phase;
      s.mesh.position.set(s.base[0] + Math.cos(a) * s.r, s.yOff, s.base[1] + Math.sin(a) * s.r); }
    for (const p of HS.portals) p.rotation.y += 0.01;
    // project labels 3D → screen
    for (const l of homesteadLabels) {
      const s = projectToScreen(l.w[0], l.w[1], l.w[2]);
      if (s.visible) { l.el.style.display = 'block'; l.el.style.left = s.x + 'px'; l.el.style.top = s.y + 'px'; }
      else l.el.style.display = 'none';
    }
    updateHomesteadPrompt();
  }

  function updateHomesteadPrompt() {
    const el = document.getElementById('homestead-prompt');
    if (player.isDead || anyPanelOpen) { el.style.display = 'none'; nearInteract = null; return; }
    const px = toWorldX(player.x), pz = toWorldZ(player.y);
    let best = null, bd = Infinity;
    for (const it of homesteadInteractables) { const d = Math.hypot(px - it.w[0], pz - it.w[1]); if (d < it.range && d < bd) { bd = d; best = it; } }
    nearInteract = best;
    if (best) { el.textContent = best.prompt; el.style.display = 'block'; } else el.style.display = 'none';
  }

  function tryHomesteadInteract() {
    if (currentZoneId !== 'homestead' || !nearInteract) return;
    if (nearInteract.type === 'rest') {
      if (player.deathSickness > 0) { player.deathSickness = 0; document.getElementById('sickness-bar').style.display = 'none'; }
      recalcMaxHp(); player.hp = player.maxHp;
      showBanner('Rested at the Bonfire\nHP fully restored');
      saveGame();
    } else {
      showBanner(`${nearInteract.name}\nComing soon`);
    }
  }
