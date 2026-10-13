// Small CPU noise helpers for building textures and geometry.

/** Deterministic hash → 0..1. */
export function hash(x: number, y: number, seed: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return h - Math.floor(h)
}

/** Smooth value noise, periodic in x over `period` cells. */
export function valueNoise(x: number, y: number, period: number, seed: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const x0 = ((xi % period) + period) % period
  const x1 = (x0 + 1) % period
  const a = hash(x0, yi, seed)
  const b = hash(x1, yi, seed)
  const c = hash(x0, yi + 1, seed)
  const d = hash(x1, yi + 1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

/** Smooth 3D value noise, 0..1. */
export function valueNoise3(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const fx = x - xi
  const fy = y - yi
  const fz = z - zi
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const sz = fz * fz * (3 - 2 * fz)
  const h = (dx: number, dy: number, dz: number) => {
    const n = Math.sin((xi + dx) * 127.1 + (yi + dy) * 311.7 + (zi + dz) * 74.7 + seed * 13.3)
    return n * 43758.5453 - Math.floor(n * 43758.5453)
  }
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  return lerp(
    lerp(lerp(h(0, 0, 0), h(1, 0, 0), sx), lerp(h(0, 1, 0), h(1, 1, 0), sx), sy),
    lerp(lerp(h(0, 0, 1), h(1, 0, 1), sx), lerp(h(0, 1, 1), h(1, 1, 1), sx), sy),
    sz,
  )
}
