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
