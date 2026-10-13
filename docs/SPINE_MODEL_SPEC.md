# The Spine: 3D model spec

The Work section's central sculpture: a tall, heavy column that the camera spirals down
along while the job cards orbit it. This spec works for three routes:

- **A. AI 3D generator** (Meshy, Tripo): paste the prompt in §7, then clean up per §5.
- **B. Adapting a CC0 sculpt**: pick a base per §6, then reshape per §2–§4.
- **C. A freelance 3D artist**: everything below is the brief.

The site applies its **own material** (dark, glossy, oily iridescent streaks) in code.
The model only needs **shape and surface detail**: geometry plus a baked normal map.
No colour, no lighting, no materials to author.

---

## 1. The idea

*Complex inside, effortless on screen.* The spine is the "inside": the raw, layered mass
of engineering that the clean interfaces (the glass cards around it) come out of.

It reads as **one continuous, sculpted column**: like a scanned stone-and-crystal
sculpture, or a spine of fused vertebrae. But its building blocks are **interface
forms**: rounded app-icon slabs, key-like blocks and thin fins, fused together.

Reference mood: dark, heavy, organic, with crisp chipped edges. The Active Theory Work
column is the quality bar, **but never copy it**: our forms are app-icon slabs and keys,
not their shapes.

## 2. Forms

Build it from these pieces, stacked tightly up a vertical axis so they **fuse** (no gaps
you can see through):

| Piece | Share | Shape |
|---|---|---|
| **App-icon slabs** | ~60% | Rounded squares/rectangles (corner radius ≈ 25–30% of the short side), 1.0–1.5 units wide, 0.3–0.45 units thick, lying roughly flat like vertebrae |
| **Key blocks** | ~20% | Compact rounded cubes, ~0.6 units, like keyboard keys or app buttons |
| **Fins** | ~15% | Thin blades (0.06–0.1 thick), 1.5–2.4 long, sticking out sideways past the body |
| **Shards / chips** | ~5% | Small sharp crystalline chunks embedded in the surface |

Arrangement:

- Each piece is **turned** round the vertical axis by 30–45° from the one below, so the
  column twists as it rises.
- Each is **tilted** up to ±12° and **nudged** off the axis by up to 0.15 units.
- The pieces **overlap and merge**. The result must read as one mass, not a stack.
- The forms stay **recognisable** underneath the sculpting: you should still see rounded
  app-icon corners and key shapes.

## 3. Surface (where the quality lives)

Not smooth plastic. Sculpt or scan-like detail:

- **Sharp sculpting**: carved folds, ridges, chipped and crumbly edges, a few deep cuts.
- **Fine grain**: high-frequency surface noise, like rough stone or a 3D scan, especially
  on the broad faces.
- **Varied**: polished smooth areas next to rough, broken ones; that variation is what
  makes the oily sheen look real.
- **No floating parts** inside the mass, no internal faces, watertight where possible.

Bake this fine detail into the **normal map** (§4) rather than the triangle count.

## 4. Proportions and technical budget

| | Target |
|---|---|
| **Proportions** | Height ≈ 7–9 × width. Width ≈ 1.5–2 units at the widest (fins excluded). The site rescales to its own height, so only proportions matter |
| **Orientation** | Y up, column centred on the origin (X/Z), base at the bottom |
| **Triangles** | **100k–200k** total (hard limit 250k). Detail goes in the normal map |
| **Normal map** | **Tangent-space, OpenGL (+Y)**, 2048×2048 (4096 acceptable), baked from a high-poly sculpt onto the low-poly model |
| **UVs** | One UV set, non-overlapping, used by the normal map |
| **Meshes** | Ideally 1 mesh. Several are fine (the site merges them) |
| **Materials** | Any. The site discards them and keeps only the normal map |
| **Other textures** | None needed (no colour, roughness, AO). They are ignored |
| **Animation / rig** | None. The site turns it |

## 5. Export

1. **glTF 2.0 binary (`.glb`)**, one file, named `spine.glb`.
2. Mesh compressed with **Draco** (or Meshopt). Both are supported.
3. Normal map embedded in the `.glb`, ideally as **KTX2** (Basis, UASTC for normal maps);
   PNG is also accepted.
4. Target file size: **under 4 MB**.

With the free glTF Transform CLI, from a plain `.glb`:

```bash
npx @gltf-transform/cli optimize spine-raw.glb spine.glb \
  --compress draco --texture-compress ktx2 --texture-size 2048
```

Check it in https://gltf.report or https://gltf-viewer.donmccurdy.com before delivery:
upright, one column, normal map visible, no holes.

## 6. Adapting a CC0 sculpt (route B)

Good starting points are rock, crystal, vertebra or abstract-sculpture scans under
**CC0** (Poly Haven, Sketchfab filtered by CC0, Smithsonian 3D Open Access with CC0).
Check the licence on the model's own page and keep a note of the source.

Then:

1. Combine or stack several scans into the column shape in §2.
2. Boolean-union our own app-icon slabs and key blocks into it, so our forms read under
   the scanned surface.
3. Decimate to the triangle budget and bake the normal map from the original scan.
4. Export per §5.

## 7. Ready-to-paste generator prompt (route A)

> A tall vertical sculpture column, about eight times taller than wide, made of thick
> rounded-square slabs like app icons and rounded key-shaped blocks stacked tightly and
> fused into one continuous mass, each layer twisted 30–45 degrees from the one below,
> with a few thin blade-like fins sticking out sideways. Raw scanned-stone and crystal
> surface: sharp carved folds, chipped crumbly edges, fine grainy detail, polished areas
> next to rough broken areas. Single solid object, no base, no pedestal, no text, no
> background, neutral grey material, centred, upright.

Negative prompt (where supported): *smooth plastic, inflated, cartoon, toy, separate
floating pieces, chain, rings, base, text, colour*.

Generate several, pick the one whose silhouette reads as **one column with app-icon
forms inside**, then export or convert per §5. Generators often overshoot the triangle
count: decimate to the budget and re-bake the normal map from the original.

## 8. Dropping it into the project

1. Put the file at **`public/models/spine.glb`**.
2. Reload. The site detects it (`/models.json`), loads it in place of the procedural
   stand-in, merges its meshes, centres it, scales it to the column height, keeps the
   normal map and applies the spine's own oil material. No code changes.
3. Check it in the lab: **http://localhost:3000/lab/work** (dev server). Sliders tune
   sheen, gloss, turn speed and the light without touching the model.

To go back to the stand-in, remove the file.

Code: `src/components/canvas/work/spineModel.ts` (loader), `Spine.tsx` (swap),
`oilMaterial.ts` (material).
