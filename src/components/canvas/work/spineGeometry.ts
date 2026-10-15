import { BufferGeometry, Float32BufferAttribute } from 'three'
import { sceneConfig } from '@/styles/scene'
import { valueNoise3 } from '../noise'

/** Marks every vertex as smooth glossy oil (1) or carved crystal (0). */
function mark(geometry: BufferGeometry, smooth: number) {
  const count = geometry.getAttribute('position').count
  geometry.setAttribute(
    'oilSmooth',
    new Float32BufferAttribute(new Float32Array(count).fill(smooth), 1),
  )
  return geometry
}

/** Laplacian smoothing on an indexed mesh: each vertex moves towards its neighbours' mean. */
function relax(geometry: BufferGeometry, passes: number, amount: number) {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  if (!index) return
  const count = position.count
  const neighbours: Set<number>[] = Array.from({ length: count }, () => new Set())
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t)
    const b = index.getX(t + 1)
    const c = index.getX(t + 2)
    neighbours[a]?.add(b).add(c)
    neighbours[b]?.add(a).add(c)
    neighbours[c]?.add(a).add(b)
  }
  const next = new Float32Array(count * 3)
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < count; i++) {
      const set = neighbours[i]
      let x = 0
      let y = 0
      let z = 0
      for (const n of set ?? []) {
        x += position.getX(n)
        y += position.getY(n)
        z += position.getZ(n)
      }
      const k = Math.max(1, set?.size ?? 1)
      next[i * 3] = position.getX(i) + (x / k - position.getX(i)) * amount
      next[i * 3 + 1] = position.getY(i) + (y / k - position.getY(i)) * amount
      next[i * 3 + 2] = position.getZ(i) + (z / k - position.getZ(i)) * amount
    }
    for (let i = 0; i < count; i++)
      position.setXYZ(i, next[i * 3]!, next[i * 3 + 1]!, next[i * 3 + 2]!)
  }
}

/**
 * The spine: one sculpted, glossy organism, built as a single continuous surface (a tube
 * whose cross-section is sculpted), so nothing intersects and nothing seams. Its width
 * swells and pinches up the column (~0.6×–1.4×), its lobes twist slowly round it, ridged
 * folds and broad noise carve it, and it follows a gentle S-curve off the axis, with rounded
 * ends. Relaxed, then smooth vertex normals: no facets; fine detail lives in the shader's
 * normal field. `edge` sets the mesh density (lite: coarser).
 */
export function createSpineGeometry(edge = 0.13) {
  const { height, twist, bulge } = sceneConfig.spine
  const rings = Math.round(height / (edge * 0.55))
  const sides = Math.round((Math.PI * 2) / (edge * 0.75))
  const turn = twist * 6
  const positions = new Float32Array((rings * sides + 2) * 3)
  const set = (i: number, x: number, y: number, z: number) => positions.set([x, y, z], i * 3)

  for (let j = 0; j < rings; j++) {
    const v = (j + 0.5) / rings
    const y = (v - 0.5) * height
    // A gentle S-curve off the axis.
    const cx = Math.sin((v - 0.5) * Math.PI * 1.6) * 0.32
    const cz = Math.cos((v - 0.5) * Math.PI * 1.1) * 0.18 - 0.09
    // Swells and pinches (~0.6×–1.4×), with a rounded cap at each end.
    const swell =
      1 + 0.3 * Math.sin(v * Math.PI * 2 * 2.3 + 0.6) + 0.1 * Math.sin(v * Math.PI * 2 * 5.1 + 1.7)
    const end = Math.min(v, 1 - v) * height
    const cap = end < 0.5 ? Math.sqrt(1 - (1 - end / 0.5) ** 2) : 1
    const spin = v * turn
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2
      const local = a - spin
      // Lobes: two and three-fold bulges whose phases drift with height.
      const lobes =
        0.2 * Math.max(0, Math.cos(2 * local + Math.sin(v * 7) * 0.8)) ** 3 +
        0.14 * Math.max(0, Math.cos(3 * local - v * 9 + 1.2)) ** 4
      const ux = Math.cos(a)
      const uz = Math.sin(a)
      const broad = valueNoise3(ux * 1.2, y * 0.7, uz * 1.2, 11) - 0.5
      const medium = valueNoise3(ux * 2.6, y * 1.8, uz * 2.6, 12) - 0.5
      // Sculpted folds: ridged noise along the height.
      const ridge = 1 - Math.abs(valueNoise3(ux * 3.4, y * 2.6, uz * 3.4, 13) * 2 - 1)
      const carve = (broad * 2.6 + medium * 1.2 + ridge ** 3 * 0.9) * bulge * 2.2
      const r = (0.64 * swell * (1 + lobes * 1.3) + carve) * cap
      // Elliptical section, wider across than deep.
      set(j * sides + k, cx + ux * r * 1.12, y, cz + uz * r * 0.88)
    }
  }
  // The poles close each end.
  const bottom = rings * sides
  const top = bottom + 1
  set(
    bottom,
    Math.sin(-0.5 * Math.PI * 1.6) * 0.32,
    -height / 2,
    Math.cos(-0.5 * Math.PI * 1.1) * 0.18 - 0.09,
  )
  set(
    top,
    Math.sin(0.5 * Math.PI * 1.6) * 0.32,
    height / 2,
    Math.cos(0.5 * Math.PI * 1.1) * 0.18 - 0.09,
  )

  const index: number[] = []
  for (let j = 0; j < rings - 1; j++) {
    for (let k = 0; k < sides; k++) {
      const a = j * sides + k
      const b = j * sides + ((k + 1) % sides)
      const c = a + sides
      const d = b + sides
      index.push(a, c, b, b, c, d)
    }
  }
  for (let k = 0; k < sides; k++) {
    index.push(bottom, k, (k + 1) % sides)
    const last = (rings - 1) * sides
    index.push(top, last + ((k + 1) % sides), last + k)
  }

  const spine = new BufferGeometry()
  spine.setAttribute('position', new Float32BufferAttribute(positions, 3))
  spine.setIndex(index)
  relax(spine, 2, 0.35)
  spine.computeVertexNormals()
  mark(spine, 0)

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
