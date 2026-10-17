import {
  type BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  type InterleavedBufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { sceneConfig } from '@/styles/scene'
import { roundedRectShape } from '../hero/bandGeometry'
import { hash, valueNoise3 } from '../noise'

/** Deterministic 0..1 per segment / feature. */
const pick = (i: number, seed: number) => hash(i, seed, 3)

/** A vertebra body: a thick rounded-square block, centred, lying flat. */
function body(width: number, depth: number, thickness: number) {
  const bevel = thickness * 0.14
  const geometry = new ExtrudeGeometry(
    roundedRectShape(width, depth, Math.min(width, depth) * 0.3),
    {
      depth: Math.max(0.01, thickness - bevel * 2),
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 0.8,
      bevelSegments: 4,
      curveSegments: 10,
    },
  )
  geometry.center()
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

/** A lump: a small, squashed rock fused to a body's side (no blades, no spikes). */
function lump(radius: number, squash: number) {
  const geometry = new IcosahedronGeometry(radius, 1)
  geometry.scale(1.25, squash, 1)
  return geometry
}

/**
 * A process: a wing-like blade reaching out from a vertebra, curving sideways and dropping a
 * little towards its tip; flat, leaf-shaped and tapering to a point. `roll` turns the
 * blade's broad side about its own axis (0 = flat in the horizontal, π/2 = an upright fin):
 * mostly upright, so the camera, looking across the column, sees their broad sides. Built
 * along +x from the origin; `thin` runs 0 at the root to 1 at the tip (the material makes
 * the blade glassy and its very tip dimmer).
 */
function process(length: number, radius: number, drop: number, curl: number, roll: number) {
  const curve = new CatmullRomCurve3(
    Array.from({ length: 6 }, (_, k) => {
      const t = k / 5
      return new Vector3(
        t * length,
        -drop * t * t * length + Math.sin(t * Math.PI) * length * 0.06,
        curl * Math.sin(t * Math.PI * 0.8) * length * 0.3,
      )
    }),
  )
  const rings = 18
  const around = 8
  const positions: number[] = []
  const thin: number[] = []
  const indices: number[] = []
  const point = new Vector3()
  const tangent = new Vector3()
  const side = new Vector3()
  const up = new Vector3()
  const worldUp = new Vector3(0, 1, 0)
  for (let r = 0; r <= rings; r++) {
    const t = r / rings
    curve.getPointAt(t, point)
    curve.getTangentAt(t, tangent)
    side.crossVectors(tangent, worldUp).normalize()
    up.crossVectors(side, tangent).normalize()
    // A leaf-shaped wing: broad near the root, swelling a little, then tapering to a point.
    const taper =
      radius * (0.06 + 0.94 * Math.sin(Math.min(1, 0.35 + t) * Math.PI) ** 0.8 * (1 - t) ** 0.6)
    for (let a = 0; a < around; a++) {
      const v = (a / around) * Math.PI * 2
      const broad = Math.cos(v) * taper * 2.2
      const flat = Math.sin(v) * taper * 0.55
      const w = broad * Math.cos(roll) - flat * Math.sin(roll)
      const h = broad * Math.sin(roll) + flat * Math.cos(roll)
      positions.push(
        point.x + side.x * w + up.x * h,
        point.y + side.y * w + up.y * h,
        point.z + side.z * w + up.z * h,
      )
      thin.push(t)
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let a = 0; a < around; a++) {
      const p0 = r * around + a
      const p1 = r * around + ((a + 1) % around)
      indices.push(p0, p0 + around, p1, p1, p0 + around, p1 + around)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('thin', new Float32BufferAttribute(thin, 1))
  geometry.setIndex(indices)
  return geometry
}

/** Keeps only positions, so the parts can be merged. */
function clean(geometry: BufferGeometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry
  for (const name of Object.keys(flat.attributes)) {
    if (name !== 'position') flat.deleteAttribute(name)
  }
  return flat
}

/** One vertebra of the column: where it starts (top), its length, lobe shape and pose. */
type Segment = {
  top: number
  length: number
  /** Lobe width (1 = the column's), the height of its widest point (0..1 down the lobe),
   * and its tilt / turn about its own centre. */
  size: number
  belly: number
  tiltX: number
  tiltZ: number
  turn: number
}

/**
 * The column's vertebrae, top to bottom: each 1.2–1.8 long (0.8–1.2 card heights), an
 * asymmetric lobe of its own size (0.6–1.4×), uneven tilt and turn; some are cut in on one
 * side.
 */
function createSegments(top: number, bottom: number) {
  const segments: Segment[] = []
  let y = top
  for (let k = 0; y > bottom; k++) {
    const length = 1.2 + hash(k, 41, 3) * 0.6
    segments.push({
      top: y,
      length,
      size: 0.6 + hash(k, 42, 3) * 0.8,
      belly: 0.38 + hash(k, 43, 3) * 0.24,
      tiltX: (hash(k, 44, 3) - 0.5) * 0.4,
      tiltZ: (hash(k, 45, 3) - 0.5) * 0.4,
      turn: (hash(k, 46, 3) - 0.5) * 0.9,
    })
    y -= length
  }
  return segments
}

/**
 * The segment profile at height y: which vertebra, how far down it (0..1), and the lobe
 * (1 at its belly, 0 at the necks between vertebrae). Necks are 50–56% of the lobe's width.
 */
function segmentAt(segments: Segment[], y: number) {
  const index = segments.findIndex((s) => y > s.top - s.length)
  const segment = segments[index === -1 ? segments.length - 1 : index]!
  const t = Math.min(1, Math.max(0, (segment.top - y) / segment.length))
  // Asymmetric: rises to the belly, then falls; rounded (sine-shaped) on both sides.
  const u =
    t < segment.belly
      ? (t / segment.belly) * 0.5
      : 0.5 + ((t - segment.belly) / (1 - segment.belly)) * 0.5
  // Chunky at the centre only: the lobe falls away quickly towards the necks.
  const lobe = Math.sin(u * Math.PI) ** 1.1
  return { segment, t, lobe }
}

/**
 * The vertebrae, applied to the carved mass: each lobe is scaled to its own size and the
 * necks pinched to about half of it; each vertebra leans and turns a little about its centre.
 * Returns the lobe value per vertex (0 at the necks) for the material's darkening.
 */
function vertebrae(positions: BufferAttribute | InterleavedBufferAttribute, segments: Segment[]) {
  const lobes = new Float32Array(positions.count)
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const { segment, lobe } = segmentAt(segments, y)
    const neck = 0.5 + hash(Math.round(segment.top * 10), 47, 3) * 0.06
    const width = segment.size * (neck + (1 - neck) * lobe)
    const centre = segment.top - segment.length * segment.belly
    // Turn about the axis, then lean about the vertebra's centre.
    const cos = Math.cos(segment.turn)
    const sin = Math.sin(segment.turn)
    let rx = (x * cos - z * sin) * width
    let rz = (x * sin + z * cos) * width
    // Some lobes are cut in on one side: that side pressed flat towards the axis.
    if (hash(Math.round(segment.top * 10), 48, 3) < 0.35) {
      const cut = 0.55 * width * (0.6 + 0.4 * lobe)
      if (rx > cut) rx = cut + (rx - cut) * 0.25
      rz *= rx > cut * 0.8 ? 0.92 : 1
    }
    const dy = y - centre
    positions.setXYZ(
      i,
      rx + dy * segment.tiltZ,
      y - rx * segment.tiltZ - rz * segment.tiltX,
      rz + dy * segment.tiltX,
    )
    lobes[i] = lobe
  }
  return lobes
}

/**
 * The column's own shape, applied to the whole mass after carving: the width swells and
 * pinches along the height (0.7–1.3×), it twists slowly, and it follows a gentle S-curve,
 * so it never reads as an even cylinder.
 */
function deform(positions: BufferAttribute | InterleavedBufferAttribute) {
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const width = 1 + 0.2 * Math.sin(y * 0.52 + 0.7) + 0.1 * Math.sin(y * 1.27 + 2.1)
    const turn = y * 0.08 + 0.3 * Math.sin(y * 0.29)
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    const wx = x * width
    const wz = z * width
    positions.setXYZ(
      i,
      wx * cos - wz * sin + 0.42 * Math.sin(y * 0.21 + 0.4),
      y,
      wx * sin + wz * cos + 0.24 * Math.sin(y * 0.16 + 1.3),
    )
  }
}

/**
 * The spine: a slim chain of glossy vertebrae with blades reaching out from them, longer
 * than the frame ever shows (it runs from above the first card to well below the last).
 * Rounded-square plates of their own size, tilt and turn (a few with a small lump) overlap
 * into one slim mass, are tessellated and carved into broad smooth swells, then shaped into
 * vertebrae (lobes joined by narrow necks, see vertebrae()) and the column's silhouette
 * (deform); 2–4 processes per vertebra reach out of it. A `crevice` attribute (0 on the
 * crests, 1 deep in the carving) keeps the hollows near-black; `thin` (0 on the core, 1
 * along each blade, root to tip) makes the processes glassy. `edge` is the tessellation (lite: coarser).
 */
export function createSpineGeometry(edge = 0.1) {
  const { top, bottom, twist, tilt, bulge } = sceneConfig.spine
  // Thin layered plates, 2–3 per vertebra, each overlapping the next.
  const spacing = 0.5
  const segments = Math.round((top - bottom) / spacing)
  const euler = new Euler()
  const rotation = new Quaternion()
  const position = new Vector3()
  const scale = new Vector3(1, 1, 1)
  const matrix = new Matrix4()
  const place = (
    geometry: BufferGeometry,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
  ) => {
    euler.set(rx, ry, rz)
    rotation.setFromEuler(euler)
    position.set(x, y, z)
    matrix.compose(position, rotation, scale)
    return geometry.applyMatrix4(matrix)
  }

  const parts: BufferGeometry[] = []
  for (let i = 0; i < segments; i++) {
    const y = top - (i + 0.5) * spacing
    // The column wobbles: each vertebra a little off the axis, tilted its own way.
    const wx = Math.sin(i * 0.9) * 0.12 + (pick(i, 1) - 0.5) * 0.1
    const wz = Math.cos(i * 0.7) * 0.1 + (pick(i, 2) - 0.5) * 0.1
    const rx = (pick(i, 3) - 0.5) * tilt
    const rz = (pick(i, 4) - 0.5) * tilt
    const ry = i * twist * 0.6 + pick(i, 5) * 1.4
    // Flat plates with fairly sharp bevels: a slim core (two thirds of the old width); the
    // processes carry the outline outwards.
    const width = (0.95 + pick(i, 6) * 0.5) * 0.67
    const depth = (0.8 + pick(i, 7) * 0.45) * 0.67
    // A little thicker than the spacing: neighbours overlap and fuse into one mass.
    const thickness = spacing * (1.15 + pick(i, 8) * 0.25)
    parts.push(clean(place(body(width, depth, thickness), wx, y, wz, rx, ry, rz)))

    // A flattened lump on some bodies, fused to the side (the blades are the processes).
    const count = pick(i, 9) < 0.3 ? 1 : 0
    for (let k = 0; k < count; k++) {
      const radius = (0.16 + pick(i, 11 + k) * 0.14) * 0.7
      const side = ry + (k === 0 ? 0 : Math.PI) + (i % 2) * Math.PI + (pick(i, 17 + k) - 0.5) * 1.2
      const reach = width * 0.42
      parts.push(
        clean(
          place(
            lump(radius * 1.4, 0.4 + pick(i, 12 + k) * 0.2),
            wx + Math.cos(side) * reach,
            y + (pick(i, 18 + k) - 0.5) * spacing * 0.5,
            wz - Math.sin(side) * reach,
            (pick(i, 19 + k) - 0.5) * 0.6,
            side,
            (pick(i, 20 + k) - 0.5) * 0.6,
          ),
        ),
      )
    }
  }

  const merged = mergeGeometries(parts)
  parts.forEach((part) => part.dispose())
  const dense = new TessellateModifier(edge, 6).modify(merged)
  merged.dispose()
  const carved = mergeVertices(dense)
  dense.dispose()
  carved.computeVertexNormals()
  const positions = carved.getAttribute('position')
  const normals = carved.getAttribute('normal')
  const crevice = new Float32Array(positions.count)
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    // Broad, smooth swells only: big curved surfaces that each catch one or two
    // highlights (no fine crust).
    const broad = valueNoise3(x * 1.1, y * 0.9, z * 1.1, 11) - 0.5
    const ridge = 1 - Math.abs(valueNoise3(x * 3.8, y * 3.8, z * 3.8, 12) * 2 - 1)
    const amount = (broad * 3.2 + ridge ** 3 * 0.9 - 0.3) * bulge * 1.5
    crevice[i] = Math.min(1, Math.max(0, -amount / (bulge * 2.2) + 0.25))
    positions.setXYZ(
      i,
      x + normals.getX(i) * amount,
      y + normals.getY(i) * amount,
      z + normals.getZ(i) * amount,
    )
  }
  // The vertebrae: lobes and necks; the necks count as crevices (near-black).
  const chain = createSegments(top, bottom)
  const lobes = vertebrae(positions, chain)
  for (let i = 0; i < crevice.length; i++) {
    crevice[i] = Math.max(crevice[i]!, Math.min(1, (1 - lobes[i]!) * 1.15))
  }
  carved.setAttribute('crevice', new Float32BufferAttribute(crevice, 1))
  deform(positions)
  // Smooth shaded: broad curved surfaces; the mesh's own triangles never show.
  carved.computeVertexNormals()

  // Processes: on most vertebrae 2–4 blades reaching out and a little down from round the
  // belly, layered at different heights and turns, 0.6–1.2× the core's width beyond its
  // surface, so the outline is spiky and open, with dark space between them. Rooted inside
  // the lobe and shaped by the same vertebra and column deformation, so they stay attached.
  const spurs: BufferGeometry[] = []
  carved.setAttribute('thin', new Float32BufferAttribute(positions.count, 1))
  chain.forEach((segment, k) => {
    if (hash(k, 51, 3) > 0.85) return
    const count = 2 + Math.floor(hash(k, 52, 3) * 2.99)
    const start = hash(k, 58, 3) * Math.PI * 2
    for (let s = 0; s < count; s++) {
      const seed = k * 5 + s
      // Core width (before the lobe's scale) ~0.8: rooted just inside the surface, blades
      // reach 0.5–1.0 past it.
      const length = 0.15 + 0.8 * (0.6 + hash(seed, 53, 3) * 0.6)
      const part = process(
        length,
        0.09 + hash(seed, 54, 3) * 0.06,
        0.1 + hash(seed, 55, 3) * 0.25,
        (hash(seed, 56, 3) - 0.5) * 0.8,
        Math.PI * (0.3 + hash(seed, 60, 3) * 0.25) * (hash(seed, 61, 3) < 0.5 ? 1 : -1),
      )
      const angle = start + (s / count) * Math.PI * 2 + (hash(seed, 57, 3) - 0.5) * 0.9
      const height =
        segment.top - segment.length * (segment.belly + (hash(seed, 59, 3) - 0.5) * 0.35)
      part.translate(0.26, 0, 0)
      part.rotateY(angle)
      part.translate(0, height, 0)
      const spurPositions = part.getAttribute('position')
      vertebrae(spurPositions, chain)
      deform(spurPositions)
      part.computeVertexNormals()
      part.setAttribute('crevice', new Float32BufferAttribute(spurPositions.count, 1))
      spurs.push(part)
    }
  })
  if (!spurs.length) return carved
  const spine = mergeGeometries([carved, ...spurs])
  carved.dispose()
  spurs.forEach((part) => part.dispose())
  return spine
}
