import { DataTexture, LinearFilter, RepeatWrapping, RGBAFormat } from 'three'
import { BAND_EDGES, CHAMFER_EDGES, FACE_EDGES } from './bandGeometry'

// Surface textures for the glass bands, laid out on the band UVs (u along the path in
// world units, v round the profile, one eighth per edge). Both tile seamlessly in u.

/** Deterministic hash → 0..1. */
function hash(x: number, y: number, seed: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return h - Math.floor(h)
}

/** Smooth value noise, periodic in x over `period` cells. */
function noise(x: number, y: number, period: number, seed: number) {
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

function texture(data: Uint8Array, width: number, height: number, repeat: number) {
  const map = new DataTexture(data, width, height, RGBAFormat)
  map.wrapS = map.wrapT = RepeatWrapping
  map.magFilter = map.minFilter = LinearFilter
  map.repeat.set(repeat, 1)
  map.needsUpdate = true
  return map
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Thin film, one tile per 2 world units along the path.
 * R: where the film shows (iridescenceMap): a few spots along the chamfered edges, a
 *    trace on the faces, so the glass stays neutral silver-grey elsewhere.
 * G: film thickness (iridescenceThicknessMap): slow waves, so each spot shows a different
 *    pink / green / blue as it slides along the edge.
 */
export function createFilmTexture(width = 256, height = 64) {
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    const edge = Math.floor((y / height) * BAND_EDGES)
    const chamfer = CHAMFER_EDGES.includes(edge)
    for (let x = 0; x < width; x++) {
      const u = x / width
      const spots = smooth(0.45, 0.75, noise(u * 6, edge * 3.1, 6, 1))
      const film = chamfer ? 0.08 + spots * 0.92 : 0.04
      const thickness = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 3 + edge)
      data.set([film * 255, thickness * 255, 0, 255], (y * width + x) * 4)
    }
  }
  return texture(data, width, height, 0.5)
}

/**
 * Smudges and fine straight scratches, one tile per 0.5 world units, so the face reads as
 * a real, handled object.
 * G: roughness (multiplied by the material roughness): mostly clear, hazier where marked.
 * A: specular strength: the marks catch light, the clean glass mirrors less.
 */
export function createSmudgeTexture(width = 512, height = 128) {
  const tile = 0.5
  /** World length round the profile, so smudges and scratches are not stretched. */
  const around = 0.5
  const field = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Marks only on the wide faces; the narrow bevels and sides stay clean and crisp.
      if (!FACE_EDGES.includes(Math.floor((y / height) * BAND_EDGES))) {
        field[y * width + x] = 0.15
        continue
      }
      const wx = (x / width) * 6
      const wy = (y / height) * 6 * (around / tile)
      const smudge = noise(wx, wy, 6, 2) * 0.75 + noise(wx * 2, wy * 2, 12, 3) * 0.25
      field[y * width + x] = 0.15 + smooth(0.45, 0.85, smudge) * 0.2
    }
  }

  // Scratches: thin straight lines at random angles, a few texels long to a third of the tile.
  for (let s = 0; s < 70; s++) {
    const x0 = hash(s, 1, 9) * width
    const y0 = hash(s, 2, 9) * height
    const angle = (hash(s, 3, 9) - 0.5) * Math.PI * 0.6
    const length = 8 + hash(s, 4, 9) * width * 0.3
    const strength = 0.3 + hash(s, 5, 9) * 0.3
    for (let i = 0; i < length; i++) {
      const x = Math.floor(x0 + Math.cos(angle) * i + width) % width
      const y = Math.floor(y0 + Math.sin(angle) * i * 0.5 + height) % height
      if (!FACE_EDGES.includes(Math.floor((y / height) * BAND_EDGES))) continue
      const k = y * width + x
      field[k] = Math.max(field[k] ?? 0, strength)
    }
  }

  const data = new Uint8Array(width * height * 4)
  field.forEach((value, k) => data.set([0, value * 255, 0, (0.45 + value * 0.8) * 255], k * 4))
  return texture(data, width, height, 1 / tile)
}
