import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Curve,
  Shape,
  Vector2,
  Vector3,
} from 'three'

/**
 * Edges of the band profile, in order: the front face (split by a fine V-groove near the
 * inner edge), round the chamfered rectangle, and the back face (grooved the same way).
 */
export const BAND_EDGES = 14
/** Which profile edges are the angled chamfers (the crisp, light-catching cuts). */
export const CHAMFER_EDGES = [4, 6, 11, 13]
/** The flat front and back faces (either side of each groove). */
export const FACE_EDGES = [0, 3, 7, 10]
/** The two walls of each face's groove: the second, thin inner edge that catches light. */
export const GROOVE_EDGES = [1, 2, 8, 9]

type Band = {
  /** Width of the flat face. */
  width: number
  /** Front-to-back depth. */
  depth: number
  /** Size of the 45° cut on each corner. */
  chamfer: number
  /**
   * Cut on the -across side (the inside of a counter-clockwise path), if different. A
   * finer inner bevel keeps the key light to one hot spot: the inner bevel of the bottom
   * edge faces up exactly like the outer bevel of the top edge.
   */
  innerChamfer?: number
  /**
   * The fine V-groove cut into both faces, parallel to the inner edge: its centre's
   * distance from the inner chamfer, its half-width and its depth.
   */
  groove: { offset: number; width: number; depth: number }
  /** Samples along the path. */
  segments: number
}

/**
 * Sweeps a flat, chamfered glass band along a closed path. Its wide face always looks
 * down +Z (at the camera), so it reads as cut glass: a flat face between crisp, angled
 * edges. Normals are flat across the profile and smooth along the path.
 *
 * UVs: u runs along the path (about one unit per world unit of length, rounded to an even
 * number so tiling textures close seamlessly), v runs round the profile, an equal share per
 * edge (front face first), so textures and shaders can tell the faces, grooves and chamfers
 * apart. uv1 maps the
 * shape's own plane (see below).
 */
export function createBandGeometry(curve: Curve<Vector3>, band: Band) {
  const a = band.width / 2
  const b = band.depth / 2
  const c = Math.min(band.chamfer, a, b)
  const ci = Math.min(band.innerChamfer ?? band.chamfer, a, b)
  // The groove: centred `offset` in from the inner chamfer, walls at about 45°.
  const g = -a + ci + band.groove.offset
  const w = band.groove.width
  const d = band.groove.depth
  // Counter-clockwise in (across, depth): the front face (+depth) comes first.
  const profile = [
    [a - c, b],
    [g + w, b],
    [g, b - d],
    [g - w, b],
    [-a + ci, b],
    [-a, b - ci],
    [-a, -b + ci],
    [-a + ci, -b],
    [g - w, -b],
    [g, -b + d],
    [g + w, -b],
    [a - c, -b],
    [a, -b + c],
    [a, b - c],
  ].map(([x, y]) => new Vector2(x, y))
  // Each edge p→q with its outward normal in the profile plane.
  const edges = profile.map((p, e) => {
    const q = profile[(e + 1) % BAND_EDGES] ?? p
    const normal = new Vector2(q.y - p.y, p.x - q.x).normalize()
    return { p, q, normal }
  })

  const length = Math.max(1, Math.round(curve.getLength() / 2)) * 2
  const n = band.segments
  // Typed arrays filled in place (this runs while the hero mounts): (n + 1) rings of two
  // vertices per profile edge.
  const ring = BAND_EDGES * 2
  const count = (n + 1) * ring
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)
  const indices =
    count < 65536 ? new Uint16Array(n * BAND_EDGES * 6) : new Uint32Array(n * BAND_EDGES * 6)
  const point = new Vector3()
  const tangent = new Vector3()
  const across = new Vector3()
  const up = new Vector3()
  const forward = new Vector3(0, 0, 1)

  let vertex = 0
  for (let i = 0; i <= n; i++) {
    const t = (i % n) / n
    curve.getPointAt(t, point)
    curve.getTangentAt(t, tangent)
    across.crossVectors(tangent, forward).normalize()
    up.crossVectors(across, tangent).normalize()

    for (let e = 0; e < BAND_EDGES; e++) {
      const { p, q, normal } = edges[e]!
      const nx = across.x * normal.x + up.x * normal.y
      const ny = across.y * normal.x + up.y * normal.y
      const nz = across.z * normal.x + up.z * normal.y
      for (let k = 0; k < 2; k++) {
        const v = k === 0 ? p : q
        positions[vertex * 3] = point.x + across.x * v.x + up.x * v.y
        positions[vertex * 3 + 1] = point.y + across.y * v.x + up.y * v.y
        positions[vertex * 3 + 2] = point.z + across.z * v.x + up.z * v.y
        normals[vertex * 3] = nx
        normals[vertex * 3 + 1] = ny
        normals[vertex * 3 + 2] = nz
        uvs[vertex * 2] = t * length
        uvs[vertex * 2 + 1] = (e + k) / BAND_EDGES
        vertex++
      }
    }
  }

  let index = 0
  for (let i = 0; i < n; i++) {
    for (let e = 0; e < BAND_EDGES; e++) {
      const p0 = i * ring + e * 2
      const q0 = p0 + 1
      const p1 = p0 + ring
      const q1 = q0 + ring
      indices[index++] = p0
      indices[index++] = p1
      indices[index++] = q0
      indices[index++] = q0
      indices[index++] = p1
      indices[index++] = q1
    }
  }

  // uv1: the shape's own plane, squared to its extent (0..1, centre 0.5), so a texture
  // can place colour across the whole emblem (a hot spot at the top, mottling over it).
  let extent = 0
  for (let i = 0; i < positions.length; i += 3) {
    extent = Math.max(extent, Math.abs(positions[i] ?? 0), Math.abs(positions[i + 1] ?? 0))
  }
  const planar = new Float32Array(count * 2)
  for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
    planar[j] = ((positions[i] ?? 0) / extent) * 0.5 + 0.5
    planar[j + 1] = ((positions[i + 1] ?? 0) / extent) * 0.5 + 0.5
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('uv1', new BufferAttribute(planar, 2))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  geometry.setIndex(new BufferAttribute(indices, 1))
  return geometry
}

/** A rounded rectangle (an interface panel) as a 2D shape, centred on the origin. */
export function roundedRectShape(width: number, height: number, radius: number) {
  const w = width / 2
  const h = height / 2
  return new Shape()
    .moveTo(-w + radius, -h)
    .lineTo(w - radius, -h)
    .quadraticCurveTo(w, -h, w, -h + radius)
    .lineTo(w, h - radius)
    .quadraticCurveTo(w, h, w - radius, h)
    .lineTo(-w + radius, h)
    .quadraticCurveTo(-w, h, -w, h - radius)
    .lineTo(-w, -h + radius)
    .quadraticCurveTo(-w, -h, -w + radius, -h)
}

/** A rounded rectangle as a smooth closed path. */
export function roundedRectCurve(width: number, height: number, radius: number) {
  // Evenly spaced points (the closing point duplicates the first).
  const points = roundedRectShape(width, height, radius)
    .getSpacedPoints(160)
    .slice(0, -1)
    .map((p) => new Vector3(p.x, p.y, 0))
  return new CatmullRomCurve3(points, true, 'centripetal')
}

/** The app-icon outline: a rounded square. */
export function roundedSquareCurve(size = 2, radius = 0.62) {
  return roundedRectCurve(size, size, radius)
}
