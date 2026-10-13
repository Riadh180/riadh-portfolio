/** Uniformly samples `count` points on a rounded rectangle (a card) facing the camera. */
export function sampleRoundedRect(
  count: number,
  { width = 4, height = 2.5, radius = 0.3, depth = 0.04, z = 0 } = {},
) {
  const points = new Float32Array(count * 3)
  const halfW = width / 2 - radius
  const halfH = height / 2 - radius

  for (let i = 0; i < count;) {
    const x = (Math.random() - 0.5) * width
    const y = (Math.random() - 0.5) * height
    const dx = Math.max(Math.abs(x) - halfW, 0)
    const dy = Math.max(Math.abs(y) - halfH, 0)
    if (dx * dx + dy * dy > radius * radius) continue

    points[i * 3] = x
    points[i * 3 + 1] = y
    points[i * 3 + 2] = z + (Math.random() - 0.5) * depth
    i++
  }
  return points
}

type Segment = [x1: number, y1: number, x2: number, y2: number]

/** The edges of a rounded rectangle as short straight segments (corners as arcs). */
function roundedRectEdges(cx: number, cy: number, w: number, h: number, r: number): Segment[] {
  const outline: [number, number][] = []
  const corners: [number, number, number][] = [
    [cx + w / 2 - r, cy + h / 2 - r, 0],
    [cx - w / 2 + r, cy + h / 2 - r, Math.PI / 2],
    [cx - w / 2 + r, cy - h / 2 + r, Math.PI],
    [cx + w / 2 - r, cy - h / 2 + r, (3 * Math.PI) / 2],
  ]
  for (const [x, y, start] of corners) {
    for (let k = 0; k <= 4; k++) {
      const a = start + (k / 4) * (Math.PI / 2)
      outline.push([x + Math.cos(a) * r, y + Math.sin(a) * r])
    }
  }
  return outline.map(([x, y], i) => {
    const [nx, ny] = outline[(i + 1) % outline.length] ?? [x, y]
    return [x, y, nx, ny]
  })
}

/**
 * A phone screen's wireframe as points along its lines: the device outline, status bar,
 * a header, three content cards with text lines, and a tab bar. Clean UI out of the dust:
 * "complexity becomes a polished product". Centred on `center`, facing the camera (+z).
 */
export function samplePhoneWireframe(
  count: number,
  center: { x: number; y: number; z: number },
  scale = 1,
) {
  const W = 2 * scale
  const H = 4.1 * scale
  const s = scale
  const segments: Segment[] = [
    ...roundedRectEdges(0, 0, W, H, 0.32 * s),
    // Status bar and the header.
    [-0.75 * s, 1.78 * s, -0.45 * s, 1.78 * s],
    [0.45 * s, 1.78 * s, 0.75 * s, 1.78 * s],
    ...roundedRectEdges(0, 1.3 * s, 1.6 * s, 0.4 * s, 0.1 * s),
    // Three content cards, each with two text lines.
    ...[0.55, -0.2, -0.95].flatMap((y): Segment[] => [
      ...roundedRectEdges(0, y * s, 1.6 * s, 0.6 * s, 0.1 * s),
      [-0.65 * s, (y + 0.1) * s, 0.35 * s, (y + 0.1) * s],
      [-0.65 * s, (y - 0.1) * s, 0.05 * s, (y - 0.1) * s],
    ]),
    // Tab bar: a rule and four small tabs.
    [-0.85 * s, -1.6 * s, 0.85 * s, -1.6 * s],
    ...[-0.6, -0.2, 0.2, 0.6].flatMap((x) =>
      roundedRectEdges(x * s, -1.78 * s, 0.14 * s, 0.14 * s, 0.05 * s),
    ),
  ]

  // Points spread along the lines in proportion to their length.
  const lengths = segments.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  const points = new Float32Array(count * 3)
  let i = 0
  segments.forEach(([x1, y1, x2, y2], k) => {
    const n = Math.round((count * (lengths[k] ?? 0)) / total)
    for (let j = 0; j < n && i < count; j++, i++) {
      const t = Math.random()
      points.set(
        [
          center.x + x1 + (x2 - x1) * t,
          center.y + y1 + (y2 - y1) * t,
          center.z + (Math.random() - 0.5) * 0.03,
        ],
        i * 3,
      )
    }
  })
  return points.subarray(0, i * 3)
}
