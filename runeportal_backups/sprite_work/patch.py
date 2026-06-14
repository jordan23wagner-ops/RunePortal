# -*- coding: utf-8 -*-
import json, io, sys

HTML = r"C:\Users\Jordon\OneDrive\Desktop\RunePortal\runeportal_phase4.html"
B64  = r"C:\Users\Jordon\OneDrive\Desktop\runeportal_backups\sprite_work\sprites_b64.json"

sprites = json.load(open(B64, encoding="utf-8"))
for k in ["playerBase","sword","bow","staff","hollowHunter","wraithStalker","ironConstruct"]:
    assert k in sprites, "missing sprite: " + k

with io.open(HTML, "r", encoding="utf-8") as f:
    content = f.read()

patches = []  # (label, old, new)

def rep(label, old, new):
    n = content.count(old)
    if n != 1:
        raise SystemExit(f"[ABORT] anchor '{label}' matched {n} times (expected 1). No file written.")
    patches.append((label, old, new))

# ───────────────────────── Patch A — changelog entry (newest-first, after header) ──
rep("changelog", "=== CHANGELOG ===\n", """=== CHANGELOG ===
[2026-06-12] — SPRITE ART PASS (PixelLab pixel art, base64 data URIs embedded for the
  single-file constraint): 7 sprites preloaded by loadSprites() (Image.decode →
  PIXI.Texture.from) BEFORE initPixi(), into TEXTURES{}. PLAYER body layer
  (buildPlayerContainer) is now a PIXI.Sprite (TEXTURES.playerBase, feet anchor 0.5/1,
  bob on move); the Graphics stick-figure is kept as a fallback and its per-frame draws
  in drawPlayerFigure() are guarded by `body instanceof PIXI.Graphics`. WEAPON: 3 static
  sprites (sword/bow/staff) swapped by equipped weaponStyle, rarity-tinted (non-common),
  riding the right hand; the old Graphics weapon is hidden (fallback if textures missing).
  ENEMIES: Hollow Hunter / Wraith Stalker / Iron Construct render as sprites (rarity
  light-cast tint via RARITY_LIGHT, feet at +H/2, wraith phasing alpha + hit/heal flash
  applied to the sprite, construct stomp follows the container); Graphics silhouettes kept
  as fallback. Armor overlays (helmet/chest/legs/boots), all humanoid enemies, and bosses
  UNCHANGED (still PIXI.Graphics). Every sprite path falls back to Graphics on load failure.
  NO player schema change, NO localStorage change, NO new requestAnimationFrame.
""")

# ───────────────────────── Patch B — SPRITES + TEXTURES constants ──
SPRITE_KEYS = ["playerBase","sword","bow","staff","hollowHunter","wraithStalker","ironConstruct"]
lines = []
for k in SPRITE_KEYS:
    lines.append(f"  {k+':':15}'{sprites[k]}',")
sprites_block = "\n".join(lines)

const_block = """// ═══════════════════════════════════════════════════════════
//  CONSTANTS & CONFIG
// ═══════════════════════════════════════════════════════════
// ── SPRITE ART (2026-06-12) ──────────────────────────────────────────────────
// 7 pixel art sprites generated via PixelLab (create_map_object). Base64 embedded to
// honor the single-file constraint. TEXTURES{} is populated at init by loadSprites();
// any key left undefined → that layer falls back to PIXI.Graphics (no error).
const SPRITES = {
%s
};
const TEXTURES = {}; // populated by loadSprites() before initPixi()
""" % sprites_block

rep("sprites_const",
    "// ═══════════════════════════════════════════════════════════\n//  CONSTANTS & CONFIG\n// ═══════════════════════════════════════════════════════════\n",
    const_block)

# ───────────────────────── Patch C1 — loadSprites() before initPixi ──
rep("loadSprites_def", "async function initPixi() {", """async function loadSprites() {
  // Robust base64 → texture: decode an <img> then wrap it (data-URI safe across PIXI v8).
  // Any failure leaves TEXTURES[key] undefined so the Graphics fallback path activates.
  for (const [key, dataUri] of Object.entries(SPRITES)) {
    try {
      const img = new Image();
      img.src = dataUri;
      await img.decode();
      TEXTURES[key] = PIXI.Texture.from(img);
    } catch (e) {
      console.warn(`[RunePortal] Sprite load failed: ${key}`, e);
    }
  }
}

async function initPixi() {""")

# ───────────────────────── Patch C2 — call loadSprites before initPixi ──
rep("loadSprites_call", "  await initPixi();\n  buildZoneGrid(currentZoneId);",
    "  await loadSprites();   // textures ready before buildPlayerContainer/makeEnemyView\n  await initPixi();\n  buildZoneGrid(currentZoneId);")

# ───────────────────────── Patch D — player body sprite ──
rep("player_body",
"""  // bodySprite — stick figure, always visible, behind all gear.
  // Geometry is redrawn each frame by drawPlayerFigure() (walk/attack/idle anims);
  // tint persists across Graphics.clear() so the sickness tint logic is untouched.
  const body = add(new PIXI.Graphics());""",
"""  // bodySprite — pixel art sprite if its texture loaded (feet-anchored, behind all
  // gear), else the Graphics stick figure (redrawn each frame by drawPlayerFigure();
  // tint persists across clear() so the sickness tint logic is untouched).
  const body = add(TEXTURES.playerBase ? (() => {
    const s = new PIXI.Sprite(TEXTURES.playerBase);
    s.anchor.set(0.5, 1);                          // feet at the container origin
    const aspect = s.texture.width / s.texture.height;
    s.height = 54; s.width = 54 * aspect;          // ~stick-figure bounds (head ≈ -52)
    return s;
  })() : new PIXI.Graphics());""")

# ───────────────────────── Patch E — weapon sprites in buildPlayerContainer ──
rep("weapon_sprites_build",
"""  playerParts = { body, legs, chest, helmet, boots, weapon };
  for (const slot of ['legs','chest','helmet','boots','weapon']) playerParts[slot].visible = false;""",
"""  playerParts = { body, legs, chest, helmet, boots, weapon };
  for (const slot of ['legs','chest','helmet','boots','weapon']) playerParts[slot].visible = false;

  // Weapon sprites — 3 static pixel-art sprites (one shown at a time by weaponStyle).
  // Fallback: if any texture is missing, keep the Graphics `weapon` layer instead.
  if (TEXTURES.sword && TEXTURES.bow && TEXTURES.staff) {
    const mkWeapon = tex => {
      const s = new PIXI.Sprite(tex);
      s.anchor.set(0.5, 1);                         // grip at the hand, blade up
      const aspect = s.texture.width / s.texture.height;
      s.height = 30; s.width = 30 * aspect;
      s.visible = false;
      playerContainer.addChild(s);
      return s;
    };
    playerParts.weaponSprites = { melee: mkWeapon(TEXTURES.sword), ranged: mkWeapon(TEXTURES.bow), magic: mkWeapon(TEXTURES.staff) };
    weapon.visible = false;                          // permanently hide the Graphics weapon when sprites are active
  }""")

# ───────────────────────── Patch F — computePlayerPose returns `moving` ──
rep("pose_moving",
"""  return {
    headY: torsoTopY - 12 + headBob, // rest -40
    torsoTopY, shoulderY, handL, handR, footLX, footRX, breath,
  };""",
"""  return {
    headY: torsoTopY - 12 + headBob, // rest -40
    torsoTopY, shoulderY, handL, handR, footLX, footRX, breath, moving,
  };""")

# ───────────────────────── Patch G — guard body draws + sprite bob ──
rep("body_draw_guard",
"""  body.clear();
  body.circle(0, p.headY, 8).fill(0xe8d5b0);                       // head
  body.moveTo(0, p.headY + 8).lineTo(0, p.torsoTopY)               // neck
      .moveTo(0, p.torsoTopY).lineTo(0, -10)                       // torso
      .moveTo(0, p.shoulderY).lineTo(p.handL[0], p.handL[1])       // left arm
      .moveTo(0, p.shoulderY).lineTo(p.handR[0], p.handR[1])       // right arm
      .moveTo(0, -10).lineTo(p.footLX, 0)                          // left leg
      .moveTo(0, -10).lineTo(p.footRX, 0)                          // right leg
      .stroke({ width: 2.5, color: 0xe8d5b0, cap: 'round' });""",
"""  if (body instanceof PIXI.Graphics) {
    body.clear();
    body.circle(0, p.headY, 8).fill(0xe8d5b0);                     // head
    body.moveTo(0, p.headY + 8).lineTo(0, p.torsoTopY)             // neck
        .moveTo(0, p.torsoTopY).lineTo(0, -10)                     // torso
        .moveTo(0, p.shoulderY).lineTo(p.handL[0], p.handL[1])     // left arm
        .moveTo(0, p.shoulderY).lineTo(p.handR[0], p.handR[1])     // right arm
        .moveTo(0, -10).lineTo(p.footLX, 0)                        // left leg
        .moveTo(0, -10).lineTo(p.footRX, 0)                        // right leg
        .stroke({ width: 2.5, color: 0xe8d5b0, cap: 'round' });
  } else {
    // Sprite body — bob along the vertical axis while moving (Graphics fallback ignores y)
    body.y = p.moving ? Math.sin(Date.now() * 0.008) * 2 : 0;
  }""")

# ───────────────────────── Patch H — weapon sprites follow the hand ──
rep("weapon_follow",
"""  // Weapon follows the right hand (drawn at rest hand (10,-16))
  weapon.x = p.handR[0] - 10;
  weapon.y = p.handR[1] + 16;""",
"""  // Weapon follows the right hand (drawn at rest hand (10,-16))
  weapon.x = p.handR[0] - 10;
  weapon.y = p.handR[1] + 16;

  // Weapon sprites (if active) ride the right hand too — grip at the hand
  if (playerParts.weaponSprites) {
    for (const s of Object.values(playerParts.weaponSprites)) {
      s.x = p.handR[0]; s.y = p.handR[1] + 6;
    }
  }""")

# ───────────────────────── Patch I — updatePlayerView weapon sprite vis/tint ──
rep("gear_loop",
"""  // Gear layers: visible when slot filled, tinted by rarity (common = slot base color)
  for (const slot of ['legs','chest','helmet','boots','weapon']) {
    const item = player.equipped[slot];
    playerParts[slot].visible = !!item;
    if (item) {
      playerParts[slot].tint = (item.rarity && item.rarity !== 'common')
        ? (RARITY_COLORS[item.rarity] || SLOT_BASE_COLORS[slot])
        : SLOT_BASE_COLORS[slot];
    }
  }""",
"""  // Armor overlays: visible when slot filled, tinted by rarity (common = slot base color)
  for (const slot of ['legs','chest','helmet','boots']) {
    const item = player.equipped[slot];
    playerParts[slot].visible = !!item;
    if (item) {
      playerParts[slot].tint = (item.rarity && item.rarity !== 'common')
        ? (RARITY_COLORS[item.rarity] || SLOT_BASE_COLORS[slot])
        : SLOT_BASE_COLORS[slot];
    }
  }

  // Weapon: sprite path (sword/bow/staff by style, rarity-tinted) or Graphics fallback
  const wItem = player.equipped.weapon;
  if (playerParts.weaponSprites) {
    const wStyle = wItem ? (wItem.weaponStyle || 'melee') : null;
    for (const [style, s] of Object.entries(playerParts.weaponSprites)) {
      s.visible = !!wItem && style === wStyle;
      if (s.visible) {
        s.tint = (wItem.rarity && wItem.rarity !== 'common')
          ? (RARITY_COLORS[wItem.rarity] || 0xffffff) : 0xffffff;
      }
    }
  } else {
    playerParts.weapon.visible = !!wItem;
    if (wItem) {
      playerParts.weapon.tint = (wItem.rarity && wItem.rarity !== 'common')
        ? (RARITY_COLORS[wItem.rarity] || SLOT_BASE_COLORS.weapon)
        : SLOT_BASE_COLORS.weapon;
    }
  }""")

# ───────────────────────── Patch J — enemy sprite in makeEnemyView ──
rep("enemy_body",
"""  const body = new PIXI.Graphics();
  let flashOverlay = null;
  if (e.isBoss) {
    drawEnemyShape(body, '__boss', H, 0xffffff); // white-drawn — boss tints color it
  } else {
    drawEnemyShape(body, e.name, H);
    flashOverlay = new PIXI.Graphics();          // white copy shown during hit flash
    drawEnemyShape(flashOverlay, e.name, H, 0xffffff);
    flashOverlay.visible = false;
  }
  c.addChild(body);
  if (flashOverlay) c.addChild(flashOverlay);""",
"""  // ── Pixel art sprites for 3 special enemy types (non-boss). Fallback: Graphics. ──
  const SPRITE_ENEMY_MAP = { 'Hollow Hunter': 'hollowHunter', 'Wraith Stalker': 'wraithStalker', 'Iron Construct': 'ironConstruct' };
  const spriteKey = !e.isBoss ? SPRITE_ENEMY_MAP[e.name] : null;
  let enemySprite = null;
  if (spriteKey && TEXTURES[spriteKey]) {
    enemySprite = new PIXI.Sprite(TEXTURES[spriteKey]);
    enemySprite.anchor.set(0.5, 1);              // feet at +H/2 (matches the silhouette baseline)
    const aspect = enemySprite.texture.width / enemySprite.texture.height;
    enemySprite.height = H; enemySprite.width = H * aspect;
    enemySprite.y = H / 2;                        // stand on the figure baseline
    enemySprite.tint = RARITY_LIGHT[e.rarity] || 0xffffff;
    c.addChild(enemySprite);
  }

  const body = new PIXI.Graphics();
  let flashOverlay = null;
  if (e.isBoss) {
    drawEnemyShape(body, '__boss', H, 0xffffff); // white-drawn — boss tints color it
  } else if (!enemySprite) {
    drawEnemyShape(body, e.name, H);
    flashOverlay = new PIXI.Graphics();          // white copy shown during hit flash
    drawEnemyShape(flashOverlay, e.name, H, 0xffffff);
    flashOverlay.visible = false;
  }
  body.visible = !enemySprite;                   // hide the Graphics body when a sprite is present
  c.addChild(body);
  if (flashOverlay) c.addChild(flashOverlay);""")

# ───────────────────────── Patch K — makeEnemyView return adds sprite ──
rep("enemy_return",
"  return { c, body, flashOverlay, glow, zoneAura, hpBar, size, lastHp: e.hp, healFlash: 0 };",
"  return { c, body, flashOverlay, glow, zoneAura, hpBar, size, lastHp: e.hp, healFlash: 0, sprite: enemySprite };")

# ───────────────────────── Patch L — updateEnemyViews phasing alpha on sprite ──
rep("enemy_phase",
"""    v.body.alpha = phaseAlpha;
    v.glow.alpha = 0.3 * phaseAlpha;
    if (v.zoneAura) v.zoneAura.alpha = 0.22 * phaseAlpha;
    if (v.flashOverlay) v.flashOverlay.alpha = phaseAlpha;""",
"""    v.body.alpha = phaseAlpha;
    v.glow.alpha = 0.3 * phaseAlpha;
    if (v.zoneAura) v.zoneAura.alpha = 0.22 * phaseAlpha;
    if (v.flashOverlay) v.flashOverlay.alpha = phaseAlpha;
    if (v.sprite) v.sprite.alpha = phaseAlpha;""")

# ───────────────────────── Patch M — updateEnemyViews sprite hit/heal/rarity tint ──
rep("enemy_flash",
"""    } else {
      v.body.tint = v.healFlash > 0 ? 0x44ee66 : (RARITY_LIGHT[e.rarity] || 0xffffff);
      if (v.flashOverlay) v.flashOverlay.visible = e.flashTimer > 0;
    }""",
"""    } else {
      v.body.tint = v.healFlash > 0 ? 0x44ee66 : (RARITY_LIGHT[e.rarity] || 0xffffff);
      if (v.flashOverlay) v.flashOverlay.visible = e.flashTimer > 0;
      if (v.sprite) v.sprite.tint = e.flashTimer > 0 ? 0xffffff
        : (v.healFlash > 0 ? 0x44ee66 : (RARITY_LIGHT[e.rarity] || 0xffffff));
    }""")

# Apply all
for label, old, new in patches:
    content = content.replace(old, new, 1)

with io.open(HTML, "w", encoding="utf-8") as f:
    f.write(content)

print(f"OK — applied {len(patches)} patches:")
for label, _, _ in patches:
    print("  -", label)
