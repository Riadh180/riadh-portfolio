import {
  BufferGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Quaternion,
  TorusGeometry,
  Vector2,
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
  const bevel = thickness * 0.22
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

type Wing = { length: number; width: number; sweep: number; curl: number; broken: boolean }

/**
 * A wing: a curved, tapered blade sweeping out sideways (along +x), lens-shaped in
 * section, thinning to a point; it rises or droops (`sweep`), its tip can curl over
 * (`curl`) or end blunt where it broke off.
 */
function wing({ length, width, sweep, curl, broken }: Wing) {
  const STEPS = 22
  const SIDES = 10
  const end = broken ? 0.55 + curl * 0.1 : 1
  const positions: number[] = []
  const indices: number[] = []
  const centre = (t: number) => {
    const x = t * length
    // Sweep up or down along the blade, then the curl turns the tip over.
    let y = sweep * t * t * length * 0.6
    let tipX = x
    if (curl > 0 && t > 0.65) {
      const a = ((t - 0.65) / 0.35) * Math.PI * curl
      const r = length * 0.12
      tipX = 0.65 * length + Math.sin(a) * r * 2.2
      y += (1 - Math.cos(a)) * r * Math.sign(sweep || 1)
    }
    return new Vector3(tipX, y, 0)
  }
  for (let s = 0; s <= STEPS; s++) {
    const t = (s / STEPS) * end
    const c = centre(t)
    const taper = Math.pow(1 - t, 0.85)
    const w = width * taper * (0.75 + 0.25 * Math.sin(t * Math.PI))
    const h = width * 0.16 * taper + 0.006
    for (let k = 0; k < SIDES; k++) {
      const a = (k / SIDES) * Math.PI * 2
      positions.push(c.x, c.y + Math.sin(a) * h, Math.cos(a) * w * 0.5)
    }
  }
  for (let s = 0; s < STEPS; s++) {
    for (let k = 0; k < SIDES; k++) {
      const a = s * SIDES + k
      const b = s * SIDES + ((k + 1) % SIDES)
      indices.push(a, a + SIDES, b, b, a + SIDES, b + SIDES)
    }
  }
  // Close both ends (a fan): the root sits inside the body; a broken tip shows a facet.
  const cap = (ring: number, flip: boolean) => {
    const centreIndex = positions.length / 3
    const c = centre((ring / STEPS) * end)
    positions.push(c.x, c.y, 0)
    for (let k = 0; k < SIDES; k++) {
      const a = ring * SIDES + k
      const b = ring * SIDES + ((k + 1) % SIDES)
      if (flip) indices.push(centreIndex, b, a)
      else indices.push(centreIndex, a, b)
    }
  }
  cap(0, true)
  cap(STEPS, false)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  return geometry
}

/** A drip: a thin tapered strand ending in a small bead, hanging straight down. */
function drip(length: number, radius: number) {
  const points: Vector2[] = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    const bead = Math.exp(-((t - 0.88) ** 2) / 0.006) * 1.6
    points.push(new Vector2(radius * (0.35 + 0.4 * (1 - t) + bead) * (t < 1 ? 1 : 0), -t * length))
  }
  const geometry = new LatheGeometry(points, 10)
  return geometry
}

/** Marks every vertex of a part as smooth glossy oil (1) or carved crystal (0). */
function mark(geometry: BufferGeometry, smooth: number) {
  const count = geometry.getAttribute('position').count
  geometry.setAttribute(
    'oilSmooth',
    new Float32BufferAttribute(new Float32Array(count).fill(smooth), 1),
  )
  return geometry
}

/** Keeps only positions (and the smooth flag), so the parts can be merged. */
function clean(geometry: BufferGeometry) {
  for (const name of Object.keys(geometry.attributes)) {
    if (name !== 'position' && name !== 'oilSmooth') geometry.deleteAttribute(name)
  }
  return geometry
}

/**
 * The spine (docs/spine-concept.png): 12–16 fused vertebrae up a slightly wobbling column.
 * Each body is a thick rounded-square block of its own size, tilt and turn, carved with
 * bulges and crystalline facets; between them run smooth oily collars; from each body
 * curved, tapered wings sweep out sideways (long, short, curled, broken), with a few
 * drips hanging from wing edges and rims. Bodies and glossy parts are built apart (the
 * bodies tessellated and carved, the wings smooth), then merged into one mesh with a
 * `oilSmooth` attribute the oil shader reads. `edge` is the bodies' tessellation (lite: 0.24).
 */
export function createSpineGeometry(edge = 0.13) {
  const { height, twist, tilt, bulge } = sceneConfig.spine
  const segments = 14
  const spacing = height / segments
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

  const bodies: BufferGeometry[] = []
  const glossy: BufferGeometry[] = []
  for (let i = 0; i < segments; i++) {
    const y = (i + 0.5) * spacing - height / 2
    // The column wobbles: each vertebra a little off the axis, tilted its own way.
    const wx = Math.sin(i * 0.9) * 0.12 + (pick(i, 1) - 0.5) * 0.1
    const wz = Math.cos(i * 0.7) * 0.1 + (pick(i, 2) - 0.5) * 0.1
    const rx = (pick(i, 3) - 0.5) * tilt
    const rz = (pick(i, 4) - 0.5) * tilt
    const ry = i * twist + pick(i, 5) * 0.8
    const width = 0.95 + pick(i, 6) * 0.5
    const depth = 0.85 + pick(i, 7) * 0.4
    const thickness = spacing * (0.78 + pick(i, 8) * 0.12)
    bodies.push(clean(place(body(width, depth, thickness), wx, y, wz, rx, ry, rz)))

    // The collar between this vertebra and the next: a smooth, slightly squashed ring.
    if (i < segments - 1) {
      const collar = new TorusGeometry(Math.max(width, depth) * 0.46, 0.07, 8, 40)
      collar.rotateX(Math.PI / 2)
      collar.scale(1, 1, depth / width)
      glossy.push(clean(mark(place(collar, wx, y + spacing * 0.5, wz, rx * 0.5, ry, rz * 0.5), 1)))
    }

    // Wings: one or two per vertebra, each its own kind.
    const count = pick(i, 9) < 0.8 ? 2 : 1
    for (let k = 0; k < count; k++) {
      const kind = pick(i * 7 + k, 10)
      const long = kind < 0.45
      const blade = wing({
        length: long ? 0.95 + pick(i, 11 + k) * 0.45 : 0.45 + pick(i, 12 + k) * 0.35,
        width: long ? 0.85 + pick(i, 13 + k) * 0.45 : 0.6 + pick(i, 14 + k) * 0.35,
        sweep: (pick(i, 15 + k) - 0.4) * 0.7,
        curl: kind > 0.7 ? 0.8 + pick(i, 16 + k) * 0.6 : 0,
        broken: kind > 0.45 && kind < 0.6,
      })
      // Out from the body's side, alternating sides up the column.
      const side = (k === 0 ? 0 : Math.PI) + (i % 2) * Math.PI + (pick(i, 17 + k) - 0.5) * 1.2
      const root = width * 0.38
      blade.translate(root, 0, 0)
      glossy.push(
        clean(
          mark(
            place(
              blade,
              wx,
              y + (pick(i, 18 + k) - 0.5) * spacing * 0.4,
              wz,
              (pick(i, 19 + k) - 0.5) * 0.4,
              ry + side,
              (pick(i, 20 + k) - 0.5) * 0.3,
            ),
            1,
          ),
        ),
      )

      // A drip or two hanging from the wing's underside.
      if (pick(i, 21 + k) < 0.6) {
        const along = root + 0.3 + pick(i, 22 + k) * 0.5
        const strand = drip(0.18 + pick(i, 23 + k) * 0.25, 0.028)
        strand.translate(along, -0.04, 0)
        glossy.push(clean(mark(place(strand, wx, y, wz, 0, ry + side, 0), 1)))
      }
    }
  }

  // Bodies: tessellated, welded, carved along their normals, faceted (crystal chips).
  const merged = mergeGeometries(bodies)
  bodies.forEach((part) => part.dispose())
  const dense = new TessellateModifier(edge, 6).modify(merged)
  merged.dispose()
  const carved = mergeVertices(dense)
  dense.dispose()
  carved.computeVertexNormals()
  const positions = carved.getAttribute('position')
  const normals = carved.getAttribute('normal')
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const broad = valueNoise3(x * 1.6, y * 1.6, z * 1.6, 11) - 0.5
    const ridge = 1 - Math.abs(valueNoise3(x * 5, y * 5, z * 5, 12) * 2 - 1)
    const grain = valueNoise3(x * 9, y * 9, z * 9, 13) - 0.5
    const amount = (broad * 2 + ridge ** 3 * 0.9 - 0.3 + grain * 0.7) * bulge * 1.3
    positions.setXYZ(
      i,
      x + normals.getX(i) * amount,
      y + normals.getY(i) * amount,
      z + normals.getZ(i) * amount,
    )
  }
  const faceted = carved.toNonIndexed()
  carved.dispose()
  faceted.deleteAttribute('normal')
  faceted.computeVertexNormals()
  mark(faceted, 0)

  // Glossy parts: smooth shading.
  const smoothParts = mergeGeometries(
    glossy.map((part) => (part.index ? part.toNonIndexed() : part)),
  )
  glossy.forEach((part) => part.dispose())
  const welded = mergeVertices(smoothParts, 1e-4)
  smoothParts.dispose()
  welded.computeVertexNormals()
  const glossyFlat = welded.toNonIndexed()
  welded.dispose()

  const spine = mergeGeometries([faceted, glossyFlat])
  faceted.dispose()
  glossyFlat.dispose()

  // uv1 wraps round the column (angle, height): the oily film flows over the bulges.
  const all = spine.getAttribute('position')
  const uv1 = new Float32Array(all.count * 2)
  for (let i = 0; i < all.count; i++) {
    const angle = Math.atan2(all.getZ(i), all.getX(i)) / (Math.PI * 2) + 0.5
    uv1.set([angle, all.getY(i) / height + 0.5], i * 2)
  }
  spine.setAttribute('uv1', new Float32BufferAttribute(uv1, 2))
  return spine
}
