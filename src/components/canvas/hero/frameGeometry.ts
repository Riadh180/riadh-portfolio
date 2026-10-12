import { CatmullRomCurve3, Shape, TubeGeometry, Vector3 } from 'three'

/**
 * The calm outside: a hollow rounded-square frame, a thin glass tube swept along the
 * app-icon outline. No filled face, so the glass reads through its bright edges and the
 * center stays open space for the core.
 */
export function createFrameGeometry({ size = 2, radius = 0.62, tube = 0.11 } = {}) {
  const h = size / 2
  const outline = new Shape()
    .moveTo(-h + radius, -h)
    .lineTo(h - radius, -h)
    .quadraticCurveTo(h, -h, h, -h + radius)
    .lineTo(h, h - radius)
    .quadraticCurveTo(h, h, h - radius, h)
    .lineTo(-h + radius, h)
    .quadraticCurveTo(-h, h, -h, h - radius)
    .lineTo(-h, -h + radius)
    .quadraticCurveTo(-h, -h, -h + radius, -h)

  // Evenly spaced points (the closing point duplicates the first), as a smooth closed curve.
  const points = outline
    .getSpacedPoints(160)
    .slice(0, -1)
    .map((p) => new Vector3(p.x, p.y, 0))
  const curve = new CatmullRomCurve3(points, true, 'centripetal')

  // Dense along the path so the rim highlight stays a smooth, continuous line.
  return new TubeGeometry(curve, 1000, tube, 40, true)
}
