// Builds Work's sculpted column from a short sculpted piece (public/models/spine-raw.glb, not
// in git: a source asset) and writes the files the site loads: public/models/spine.glb (full
// tier) and spine-lite.glb (lite tier and phones).
//
//   node scripts/build-spine.mjs [raw.glb]
//
// 1. Clean: weld the vertices (the raw file splits them along its UV seams), report holes and
//    non-manifold edges, drop stray islands, centre the piece on its long (Y) axis.
// 2. The oil material's attributes (work/oilMaterial.ts): `crevice` (0 on the crests, 1 deep
//    in the hollows: a cavity measure) and `thin` (0 on the body, 1 out along a process: the
//    distance from the axis).
// 3. One step of Loop subdivision (rounder silhouettes at the close camera), then simplified
//    back to each tier's triangle budget (meshoptimizer keeps the detail where the surface
//    turns and thins it where it is flat).
// 4. The column: copies of the piece stacked down the column's extent (past both ends, which
//    dissolve into grains), each of its own height (0.8–1.2), some mirrored. Their turn round
//    the axis, width and squash flow from one copy's value to the next, and each copy overlaps
//    the next by one vertebra, so the joints fuse with no seam; then bent along the column's
//    own path (the swell, twist and S-curve of work/spineGeometry.ts deform()).
// 5. Normals with a crease angle: smooth across the sculpt, crisp where it folds sharply.
// 6. Quantized and meshopt-compressed.
import fs from 'node:fs'
import path from 'node:path'
import { Document, Logger, NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { meshopt, quantize } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'

const RAW = process.argv[2] ?? 'public/models/spine-raw.glb'
/** Each file and its triangle budget for the whole column. */
const TIERS = [
  { file: 'public/models/spine.glb', budget: 145000 },
  { file: 'public/models/spine-lite.glb', budget: 58000 },
]
/**
 * The column's extent in Work space (sceneConfig.spine top and bottom: past them the material
 * discards everything), plus a little margin.
 */
const COLUMN = { top: 10.3, bottom: -12.5 }
/**
 * The piece in the column: its height in world units (the body then about as wide as the
 * procedural column's core, the processes reaching about as far as its blades), and how many
 * vertebrae it holds (the copies overlap by one).
 */
const PIECE = { height: 6.5, vertebrae: 8 }
/** Normals: faces meeting at more than this angle keep a crisp edge. */
const CREASE = (70 * Math.PI) / 180

await MeshoptEncoder.ready
await MeshoptSimplifier.ready
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })

/** Deterministic 0..1 per copy and feature. */
const hash = (i, seed) => {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453
  return x - Math.floor(x)
}
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const quantile = (values, q) => {
  const sorted = Float64Array.from(values).sort()
  return sorted[Math.floor(q * (sorted.length - 1))]
}

/** Area-weighted face normals (the cross products, not normalized), one per corner triple. */
function faceNormals(pos, index) {
  const normals = new Float64Array(index.length)
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t] * 3, index[t + 1] * 3, index[t + 2] * 3]
    const ux = pos[b] - pos[a]
    const uy = pos[b + 1] - pos[a + 1]
    const uz = pos[b + 2] - pos[a + 2]
    const vx = pos[c] - pos[a]
    const vy = pos[c + 1] - pos[a + 1]
    const vz = pos[c + 2] - pos[a + 2]
    normals.set([uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], t)
  }
  return normals
}

/** Each vertex's neighbours (by shared edge). */
function neighbourSets(count, index) {
  const sets = Array.from({ length: count }, () => new Set())
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t], index[t + 1], index[t + 2]]
    sets[a].add(b).add(c)
    sets[b].add(a).add(c)
    sets[c].add(a).add(b)
  }
  return sets
}

// --- 1. Read, inspect and clean ------------------------------------------------------------
const raw = await io.read(RAW)
const rawPrimitive = raw.getRoot().listMeshes()[0].listPrimitives()[0]
const rawPos = rawPrimitive.getAttribute('POSITION').getArray()
const rawIdx = rawPrimitive.getIndices().getArray()

// Weld by position.
const welded = new Map()
const remap = new Uint32Array(rawPos.length / 3)
let pos = []
for (let i = 0; i < rawPos.length / 3; i++) {
  const key = [0, 1, 2].map((k) => Math.round(rawPos[i * 3 + k] * 1e5)).join()
  let at = welded.get(key)
  if (at === undefined) {
    at = pos.length / 3
    welded.set(key, at)
    pos.push(rawPos[i * 3], rawPos[i * 3 + 1], rawPos[i * 3 + 2])
  }
  remap[i] = at
}
let index = []
for (let t = 0; t < rawIdx.length; t += 3) {
  const [a, b, c] = [remap[rawIdx[t]], remap[rawIdx[t + 1]], remap[rawIdx[t + 2]]]
  if (a !== b && b !== c && a !== c) index.push(a, b, c)
}

// Holes (edges with one face) and non-manifold edges (more than two).
const edgeUse = new Map()
for (let t = 0; t < index.length; t += 3) {
  for (let k = 0; k < 3; k++) {
    const [u, v] = [index[t + k], index[t + ((k + 1) % 3)]]
    const key = u < v ? `${u},${v}` : `${v},${u}`
    edgeUse.set(key, (edgeUse.get(key) ?? 0) + 1)
  }
}
const edges = { open: 0, nonManifold: 0 }
for (const n of edgeUse.values()) {
  if (n === 1) edges.open++
  if (n > 2) edges.nonManifold++
}

// Drop stray islands (pieces under 2% of the triangles).
const parent = Array.from({ length: pos.length / 3 }, (_, i) => i)
const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
for (let t = 0; t < index.length; t += 3) {
  parent[find(index[t])] = find(index[t + 1])
  parent[find(index[t + 1])] = find(index[t + 2])
}
const islandSize = new Map()
for (let t = 0; t < index.length; t += 3) {
  const root = find(index[t])
  islandSize.set(root, (islandSize.get(root) ?? 0) + 1)
}
const kept = new Set(
  [...islandSize].filter(([, n]) => n >= (index.length / 3) * 0.02).map(([root]) => root),
)
index = index.filter((_, k) => kept.has(find(index[k - (k % 3)])))

// Centre: Y up, -0.5 → 0.5; the axis through the middle of X and Z.
const min = [Infinity, Infinity, Infinity]
const max = [-Infinity, -Infinity, -Infinity]
for (let i = 0; i < pos.length; i += 3) {
  for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], pos[i + k])
    max[k] = Math.max(max[k], pos[i + k])
  }
}
const span = max[1] - min[1]
pos = pos.map((v, i) => (v - (min[i % 3] + max[i % 3]) / 2) / span)

// --- 2. crevice and thin on the piece --------------------------------------------------------
function pieceAttributes(pos, index) {
  const count = pos.length / 3
  const normals = new Float64Array(count * 3)
  const faces = faceNormals(pos, index)
  for (let t = 0; t < index.length; t++) {
    for (let k = 0; k < 3; k++) normals[index[t] * 3 + k] += faces[t - (t % 3) + k]
  }
  for (let v = 0; v < count; v++) {
    const l = Math.hypot(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]) || 1
    for (let k = 0; k < 3; k++) normals[v * 3 + k] /= l
  }
  const near = neighbourSets(count, index)
  // Cavity: how far the ring of neighbours sits out along the normal, per edge length
  // (> 0: a hollow), smoothed over the neighbourhood.
  let cavity = new Float64Array(count)
  for (let v = 0; v < count; v++) {
    const sum = [0, 0, 0]
    let edge = 0
    for (const u of near[v]) {
      for (let k = 0; k < 3; k++) sum[k] += pos[u * 3 + k]
      edge += Math.hypot(...[0, 1, 2].map((k) => pos[u * 3 + k] - pos[v * 3 + k]))
    }
    const n = near[v].size || 1
    const out = [0, 1, 2].map((k) => (sum[k] / n - pos[v * 3 + k]) * normals[v * 3 + k])
    cavity[v] = (out[0] + out[1] + out[2]) / (edge / n || 1)
  }
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float64Array(count)
    for (let v = 0; v < count; v++) {
      let sum = cavity[v]
      for (const u of near[v]) sum += cavity[u]
      next[v] = sum / (near[v].size + 1)
    }
    cavity = next
  }
  // Distance from the axis: the body's radius, and how far the processes reach.
  const radial = Array.from({ length: count }, (_, v) => Math.hypot(pos[v * 3], pos[v * 3 + 2]))
  const body = quantile(radial, 0.45)
  const reach = quantile(radial, 0.985)
  const hollow = [quantile(cavity, 0.6), quantile(cavity, 0.93)]
  const thin = radial.map((r) => smoothstep(body * 1.05, reach, r))
  const crevice = thin.map((t, v) => smoothstep(hollow[0], hollow[1], cavity[v]) * (1 - t * 0.7))
  return { thin, crevice, stats: { body, reach, hollow } }
}
const attributes = pieceAttributes(pos, index)

// --- 3. Loop subdivision (one step), carrying the attributes --------------------------------
function subdivide({ pos, index, crevice, thin }) {
  const count = pos.length / 3
  const near = neighbourSets(count, index)
  // Each edge's opposite corners (two on a closed mesh).
  const opposite = new Map()
  const edgeKey = (u, v) => (u < v ? u * count + v : v * count + u)
  for (let t = 0; t < index.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const key = edgeKey(index[t + k], index[t + ((k + 1) % 3)])
      const list = opposite.get(key) ?? []
      list.push(index[t + ((k + 2) % 3)])
      opposite.set(key, list)
    }
  }
  const next = { pos: [], crevice: [], thin: [], index: [] }
  // Old vertices move towards their neighbours (Loop's weights).
  for (let v = 0; v < count; v++) {
    const n = near[v].size
    const beta = (5 / 8 - (3 / 8 + Math.cos((2 * Math.PI) / n) / 4) ** 2) / n
    const sum = [0, 0, 0]
    for (const u of near[v]) for (let k = 0; k < 3; k++) sum[k] += pos[u * 3 + k]
    for (let k = 0; k < 3; k++) next.pos.push(pos[v * 3 + k] * (1 - n * beta) + sum[k] * beta)
    next.crevice.push(crevice[v])
    next.thin.push(thin[v])
  }
  // A new vertex on each edge: 3/8 of its ends, 1/8 of the two opposite corners.
  const edgePoint = new Map()
  for (const [key, corners] of opposite) {
    const u = Math.floor(key / count)
    const v = key % count
    const weight = corners.length === 2 ? [3 / 8, 1 / 8] : [1 / 2, 0]
    edgePoint.set(key, next.pos.length / 3)
    for (let k = 0; k < 3; k++) {
      const sides = corners.reduce((s, c) => s + pos[c * 3 + k], 0)
      next.pos.push((pos[u * 3 + k] + pos[v * 3 + k]) * weight[0] + sides * weight[1])
    }
    next.crevice.push((crevice[u] + crevice[v]) / 2)
    next.thin.push((thin[u] + thin[v]) / 2)
  }
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t], index[t + 1], index[t + 2]]
    const ab = edgePoint.get(edgeKey(a, b))
    const bc = edgePoint.get(edgeKey(b, c))
    const ca = edgePoint.get(edgeKey(c, a))
    next.index.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca)
  }
  return next
}
const smooth = subdivide({ pos, index, ...attributes })

/** The piece simplified to a triangle count (vertices moved to keep the shape). */
function simplified(piece, triangles) {
  const positions = Float32Array.from(piece.pos)
  const extra = Float32Array.from(piece.crevice.flatMap((c, v) => [c, piece.thin[v]]))
  const indices = Uint32Array.from(piece.index)
  const [count] = MeshoptSimplifier.simplifyWithUpdate(
    indices,
    positions,
    3,
    extra,
    2,
    [0.5, 0.5],
    null,
    Math.min(indices.length, triangles * 3),
    0.05,
  )
  // Keep only the vertices still in use.
  const used = new Map()
  const out = { pos: [], crevice: [], thin: [], index: [] }
  for (const v of indices.subarray(0, count)) {
    let at = used.get(v)
    if (at === undefined) {
      at = used.size
      used.set(v, at)
      out.pos.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2])
      out.crevice.push(Math.min(1, Math.max(0, extra[v * 2])))
      out.thin.push(Math.min(1, Math.max(0, extra[v * 2 + 1])))
    }
    out.index.push(at)
  }
  return out
}

// --- 4. The column ---------------------------------------------------------------------------
/** Each copy: its centre, height and mirroring, and the values that flow along the column. */
const copies = []
{
  let top = COLUMN.top
  for (let i = 0; top > COLUMN.bottom; i++) {
    // 0.8–1.2, close to the copy above's (their vertebrae meet at the joint).
    const height = PIECE.height * (1 + 0.2 * Math.sin(i * 1.1 + 0.5))
    copies.push({
      centre: top - height / 2,
      height,
      mirror: i % 3 === 1,
      turn: i * Math.PI + (hash(i, 3) - 0.5) * 1.6,
      width: 0.88 + hash(i, 5) * 0.24,
      squash: 1 + (hash(i, 2) - 0.5) * 0.16,
    })
    // The next copy's first vertebra lies over this one's last.
    top -= height - height / PIECE.vertebrae
  }
}

/** A flowing value at height y: eased from one copy's centre to the next. */
function flow(y, key) {
  const below = copies.findIndex((copy) => copy.centre <= y)
  if (below <= 0) return copies[below === 0 ? 0 : copies.length - 1][key]
  const upper = copies[below - 1]
  const lower = copies[below]
  return upper[key] + (lower[key] - upper[key]) * smoothstep(upper.centre, lower.centre, y)
}

/** work/spineGeometry.ts deform(): the column's swell, twist and S-curve (keep in step). */
function bend(x, y, z) {
  const width = 1 + 0.2 * Math.sin(y * 0.52 + 0.7) + 0.1 * Math.sin(y * 1.27 + 2.1)
  const turn = y * 0.08 + 0.3 * Math.sin(y * 0.29)
  const cos = Math.cos(turn)
  const sin = Math.sin(turn)
  const wx = x * width
  const wz = z * width
  return [
    wx * cos - wz * sin + 0.42 * Math.sin(y * 0.21 + 0.4),
    y,
    wx * sin + wz * cos + 0.24 * Math.sin(y * 0.16 + 1.3),
  ]
}

function column(piece) {
  const out = { pos: [], crevice: [], thin: [], index: [] }
  const count = piece.pos.length / 3
  for (const copy of copies) {
    const base = out.pos.length / 3
    for (let v = 0; v < count; v++) {
      const y = copy.centre + piece.pos[v * 3 + 1] * copy.height
      // Turn, width and squash flow along the column: the same for both copies at a joint.
      const turn = flow(y, 'turn')
      const width = flow(y, 'width') * PIECE.height
      const squash = flow(y, 'squash')
      const x = piece.pos[v * 3] * (copy.mirror ? -1 : 1) * width * squash
      const z = (piece.pos[v * 3 + 2] * width) / squash
      const cos = Math.cos(turn)
      const sin = Math.sin(turn)
      out.pos.push(...bend(x * cos - z * sin, y, x * sin + z * cos))
      out.crevice.push(piece.crevice[v])
      out.thin.push(piece.thin[v])
    }
    for (let t = 0; t < piece.index.length; t += 3) {
      const [a, b, c] = [piece.index[t], piece.index[t + 1], piece.index[t + 2]]
      // A mirrored copy turns inside out: flip its winding back.
      out.index.push(base + a, base + (copy.mirror ? c : b), base + (copy.mirror ? b : c))
    }
  }
  return out
}

// --- 5. Normals with a crease angle ----------------------------------------------------------
/**
 * Each corner's normal averages the faces round its vertex that lie within the crease angle
 * of its own face; corners that end up with the same normal share a vertex again.
 */
function creased({ pos, index, crevice, thin }) {
  const faces = faceNormals(pos, index)
  const unit = new Float64Array(faces.length)
  for (let t = 0; t < faces.length; t += 3) {
    const l = Math.hypot(faces[t], faces[t + 1], faces[t + 2]) || 1
    unit.set([faces[t] / l, faces[t + 1] / l, faces[t + 2] / l], t)
  }
  const around = Array.from({ length: pos.length / 3 }, () => [])
  for (let t = 0; t < index.length; t++) around[index[t]].push(t - (t % 3))
  const out = { position: [], normal: [], crevice: [], thin: [], index: [] }
  const shared = new Map()
  const limit = Math.cos(CREASE)
  for (let t = 0; t < index.length; t++) {
    const v = index[t]
    const own = t - (t % 3)
    const sum = [0, 0, 0]
    for (const f of around[v]) {
      const dot = unit[own] * unit[f] + unit[own + 1] * unit[f + 1] + unit[own + 2] * unit[f + 2]
      if (dot >= limit) for (let k = 0; k < 3; k++) sum[k] += faces[f + k]
    }
    const l = Math.hypot(...sum) || 1
    const normal = sum.map((s) => s / l)
    const key = `${v}:${normal.map((n) => Math.round(n * 512)).join()}`
    let at = shared.get(key)
    if (at === undefined) {
      at = out.position.length / 3
      shared.set(key, at)
      out.position.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2])
      out.normal.push(...normal)
      out.crevice.push(crevice[v])
      out.thin.push(thin[v])
    }
    out.index.push(at)
  }
  return out
}

// --- 6. Write --------------------------------------------------------------------------------
async function write(file, mesh) {
  const doc = new Document()
  doc.setLogger(new Logger(Logger.Verbosity.WARN))
  const buffer = doc.createBuffer()
  const accessor = (array, type) =>
    doc.createAccessor().setArray(array).setType(type).setBuffer(buffer)
  const primitive = doc
    .createPrimitive()
    .setAttribute('POSITION', accessor(new Float32Array(mesh.position), 'VEC3'))
    .setAttribute('NORMAL', accessor(new Float32Array(mesh.normal), 'VEC3'))
    .setAttribute('_CREVICE', accessor(new Float32Array(mesh.crevice), 'SCALAR'))
    .setAttribute('_THIN', accessor(new Float32Array(mesh.thin), 'SCALAR'))
    .setIndices(accessor(new Uint32Array(mesh.index), 'SCALAR'))
  const node = doc.createNode('column').setMesh(doc.createMesh('column').addPrimitive(primitive))
  doc.createScene().addChild(node)
  await doc.transform(quantize(), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
  await io.write(file, doc)
  return {
    triangles: mesh.index.length / 3,
    vertices: mesh.position.length / 3,
    bytes: fs.statSync(file).size,
  }
}

const report = {
  raw: { triangles: rawIdx.length / 3, vertices: rawPos.length / 3, welded: pos.length / 3 },
  edges,
  islands: { found: islandSize.size, kept: kept.size },
  bounds: { min, max },
  attributes: attributes.stats,
  subdivided: smooth.index.length / 3,
  copies: copies.map((copy) => [+copy.centre.toFixed(2), +copy.height.toFixed(2), copy.mirror]),
}
for (const tier of TIERS) {
  fs.mkdirSync(path.dirname(tier.file), { recursive: true })
  const piece = simplified(smooth, Math.floor(tier.budget / copies.length))
  report[tier.file] = await write(tier.file, creased(column(piece)))
}
console.log(JSON.stringify(report, null, 1))
