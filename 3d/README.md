# RIFTFALL 3D — rebuild notes

Procedural low-poly 3D with Three.js, **embedded, not CDN-linked**, so the game
stays a single self-contained file that works identically in a claude.ai artifact
and on Vercel.

## Verified so far

- `three.embed.js` — Three.js **r160 UMD**, 669,656 bytes, sets `window.THREE`.
  The stock `three.min.js` opens with a deprecation `console.warn`, and that call
  is the **first operand of a comma expression** wrapping the whole UMD IIFE.
  Deleting it leaves a nameless function statement and the file throws
  `Function statements require a function name`. It is therefore *replaced* with
  `void 0,` rather than removed. Loads silently; `SkinnedMesh` and `Bone` present.
- `prototype.html` — 61 procedurally-built skinned humanoids, real
  `THREE.Skeleton` bones, cast shadows, fog, instanced rocks and trees.
  **65 draw calls, 11,974 triangles.**

### The skinning trap

Body-part geometry must be authored in the skeleton's **bind space**. Building
boxes at the origin and relying on `skinIndex` alone scatters every limb across
the field. The order that works:

1. build and parent the bones
2. add the root to a holder and `updateMatrixWorld(true)`
3. `new THREE.Skeleton(list)` — it derives `boneInverses` from those matrices
4. build each part and `geometry.applyMatrix4(bone.matrixWorld)`
5. merge, then `mesh.bind(skeleton)`

### Performance

The 6.9fps measured in CI is **swiftshader software rasterisation** and is not
representative of any real device. The meaningful figures are the draw-call and
triangle counts, which are tiny. A real GPU number needs a real device.

## What the pivot preserves

The world is already a flat plane in `(x,y)`, which becomes `(x,z)`. Untouched:
AI, camps, aggro, leashing, roamers, travel sprint, loot tables, the rarity
curve, all balance tuning, and the entire DOM UI (bag, forge, rifts, camp).

Only the render layer is replaced: the sprite engine, part baking, materials and
the draw functions.

## Status

**Milestone 1 landed** — `zonelooter3d.html` (844 KB with Three.js embedded).
Boots, plays, and survives a full smoke test: all 5 zones with every enemy type
spawned and fought, weapon skills, dash, potion, death/respawn, save/load
round-trip and all six panels. **No JS errors. 12 draw calls, ~11k triangles.**

Four procedural rigs cover every enemy for now:

| 3D rig | covers |
|---|---|
| `human` | knight, golem |
| `quad`  | beast |
| `blob`  | blob, spike, worm |
| `float` | ghost, eye, flyer |

Worm, arachnid and golem are riding the closest rig until they get purpose-built
forms — that is milestone 3.

### Known rough edges

- Ground is dark and low contrast; the tile texture needs a lighting-aware pass.
- No projectiles, melee arcs, hit sparks or death collapse yet (milestone 4) —
  combat resolves correctly but reads flat.
- Damage numbers project through the camera but are not depth-sorted.
- Tree canopies were sitting at `r*2.7` with radius `r*1.5`, which swallowed the
  trunk entirely and made every tree read as a green boulder. Now `r*4.1` with a
  smaller canopy plus a second offset cluster.

## Milestones

1. ~~Scene foundation~~ — **done** — renderer on the arena canvas, ground plane reusing the
   existing procedural tile as a `CanvasTexture`, sun + hemisphere, shadows, fog,
   3/4 follow camera. A separate 2D overlay canvas for the minimap, which can no
   longer share the arena canvas once it is WebGL.
2. Humanoid + quadruped rigs driven by the existing `pose()` joint angles.
3. Remaining archetypes — blob, worm, eye, wraith, flyer, golem, arachnid need
   rethinking as 3D forms rather than direct translation.
4. Effects: projectiles, arcs, hit sparks, death collapse.
5. Lighting pass and post-processing (bloom, grade).
