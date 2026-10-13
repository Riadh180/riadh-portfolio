import {
  BufferGeometry,
  CatmullRomCurve3,
  Curve,
  Float32BufferAttribute,
  Shape,
  Vector2,
  Vector3,
} from 'three'

/** Edges of the band profile, in order: front face, then round the chamfered rectangle. */
export const BAND_EDGES = 8
/** Which profile edges are the angled chamfers (the crisp, light-catching cuts). */
export const CHAMFER_EDGES = [1, 3, 5, 7]
/** The wide front and back faces. */
export const FACE_EDGES = [0, 4]

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
  /** Samples along the path. */
  segments: number
}

/**
 * Sweeps a flat, chamfered glass band along a closed path. Its wide face always looks
 * down +Z (at the camera), so it reads as cut glass: a flat face between crisp, angled
 * edges. Normals are flat across the profile and smooth along the path.
 *
 * UVs: u runs along the path (about one unit per world unit of length, rounded to an even
 * number so tiling textures close seamlessly), v runs round the profile, one eighth per
 * edge (front face first), so textures can tell the face from the chamfers. uv1 maps the
 * shape's own plane (see below).
 */
export function createBandGeometry(curve: Curve<Vector3>, band: Band) {
  const a = band.width / 2
  const b = band.depth / 2
  const c = Math.min(band.chamfer, a, b)
  const ci = Math.min(band.innerChamfer ?? band.chamfer, a, b)
  // Counter-clockwise in (across, depth): the front face (+depth) comes first.
  const profile = [
    [a - c, b],
    [-a + ci, b],
    [-a, b - ci],
    [-a, -b + ci],
    [-a + ci, -b],
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
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const point = new Vector3()
  const tangent = new Vector3()
  const across = new Vector3()
  const up = new Vector3()
  const forward = new Vector3(0, 0, 1)

  for (let i = 0; i <= n; i++) {
    const t = (i % n) / n
    curve.getPointAt(t, point)
    curve.getTangentAt(t, tangent)
    across.crossVectors(tangent, forward).normalize()
    up.crossVectors(across, tangent).normalize()

    for (const [e, { p, q, normal }] of edges.entries()) {
      for (const [k, v] of [p, q].entries()) {
        positions.push(
          point.x + across.x * v.x + up.x * v.y,
          point.y + across.y * v.x + up.y * v.y,
          point.z + across.z * v.x + up.z * v.y,
        )
        normals.push(
          across.x * normal.x + up.x * normal.y,
          across.y * normal.x + up.y * normal.y,
          across.z * normal.x + up.z * normal.y,
        )
        uvs.push(t * length, (e + k) / BAND_EDGES)
      }
    }
  }

  const ring = BAND_EDGES * 2
  for (let i = 0; i < n; i++) {
    for (let e = 0; e < BAND_EDGES; e++) {
      const p0 = i * ring + e * 2
      const q0 = p0 + 1
      const p1 = p0 + ring
      const q1 = q0 + ring
      indices.push(p0, p1, q0, q0, p1, q1)
    }
  }

  // uv1: the shape's own plane, squared to its extent (0..1, centre 0.5), so a texture
  // can place colour across the whole emblem (a hot spot at the top, mottling over it).
  let extent = 0
  for (let i = 0; i < positions.length; i += 3) {
    extent = Math.max(extent, Math.abs(positions[i] ?? 0), Math.abs(positions[i + 1] ?? 0))
  }
  const planar: number[] = []
  for (let i = 0; i < positions.length; i += 3) {
    planar.push(
      ((positions[i] ?? 0) / extent) * 0.5 + 0.5,
      ((positions[i + 1] ?? 0) / extent) * 0.5 + 0.5,
    )
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv1', new Float32BufferAttribute(planar, 2))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
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
