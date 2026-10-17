# 3D models

`spine.glb` (full tier) and `spine-lite.glb` (lite tier and phones) are Work's sculpted
column. They are built, not drawn: put the sculpted piece in this folder as `spine-raw.glb`
(a short stretch of spine, Y up; git-ignored, it is a source asset) and run

    node scripts/build-spine.mjs

The script cleans the piece, lays varied copies of it down the column's path and writes both
files. The scene loads them once the visitor leaves the hero and gives them the spine's own
material; without them, the procedural stand-in is used.
