import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  NearestFilter,
  RepeatWrapping,
  RGBAFormat,
} from 'three'
import type { GlassLook } from './glassLook'
import { BAND_EDGES, CHAMFER_EDGES, FACE_EDGES } from './bandGeometry'

// Surface textures for the glass bands: the film lies across the emblem's plane (uv1), the
// smudges on the band UVs (u along the path in world units, v round the profile, one
// eighth per edge), tiling seamlessly in u.

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

function texture(width: number, height: number, repeat: number) {
  const map = new DataTexture(new Uint8Array(width * height * 4), width, height, RGBAFormat)
  map.wrapS = map.wrapT = RepeatWrapping
  map.magFilter = map.minFilter = LinearFilter
  map.repeat.set(repeat, 1)
  return map
}

const edgeAt = (y: number, height: number) => Math.floor((y / height) * BAND_EDGES)
const byte = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255)

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Film thickness (0..1 over 100..400nm) for each hue, read off a gradient render. */
const FILM = { teal: 0.15, violet: 0.95, pink: 0.84 }

/**
 * Thin film across the emblem's plane (uv1: one tile over the whole shape).
 * R: where the film shows (iridescenceMap): a soft mottle over the body (`faceFilm`), and a
 *    hot zone at the top where the key light makes its hot spot (`spots`: size and strength).
 * G: film thickness (iridescenceThicknessMap): the body mottles between teal and violet
 *    (a sharp blend, so it never passes through the gold in between); the hot zone turns
 *    pink-white.
 */
export function createFilmTexture() {
  const map = texture(128, 128, 1)
  map.wrapS = map.wrapT = ClampToEdgeWrapping
  map.channel = 1
  return map
}

export function writeFilmTexture(map: DataTexture, look: GlassLook) {
  const { data, width, height } = map.image as { data: Uint8Array; width: number; height: number }
  for (let y = 0; y < height; y++) {
    const v = y / height
    for (let x = 0; x < width; x++) {
      const u = x / width
      const tone = smooth(
        0.38,
        0.62,
        noise(u * 7, v * 7, 64, 5) * 0.65 + noise(u * 16, v * 16, 64, 6) * 0.35,
      )
      // Neutral where teal turns to violet, so the blend never shows the gold in between.
      const seam = smooth(0.15, 0.7, Math.abs(tone * 2 - 1))
      const body =
        look.faceFilm * seam * (0.35 + 0.65 * smooth(0.3, 0.7, noise(u * 9, v * 9, 64, 7)))
      const hot =
        look.spots *
        smooth(0.86 - look.spots * 0.2, 0.98, v) *
        Math.exp(-(((u - 0.5) / (0.25 + look.spots * 0.25)) ** 2))
      const film = Math.max(body, hot)
      const bodyThickness = FILM.teal + (FILM.violet - FILM.teal) * tone
      const thickness = bodyThickness + (FILM.pink - bodyThickness) * Math.min(1, hot * 1.5)
      data.set([byte(film), byte(thickness), 0, 255], (y * width + x) * 4)
    }
  }
  map.needsUpdate = true
}

/**
 * Smudges and fine straight scratches on the wide faces, one tile per 0.5 world units, so
 * the face reads as a real, handled object. `mottling` sets how strongly they show.
 * G: roughness (the material roughness is 1): clean glass at `roughness`, hazier where marked.
 * A: specular strength: the marks catch light, the clean glass mirrors a little less.
 */
export function createSurfaceTexture() {
  return texture(512, 128, 2)
}

/** Where the faces are marked, 0 (clean) .. 1; computed once. */
let marks: Float32Array | undefined

function markField(width: number, height: number) {
  if (marks) return marks
  const field = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Fine, soft smudges: a fingerprint haze rather than hammered metal.
      const wx = (x / width) * 16
      const wy = (y / height) * 16
      const smudge = noise(wx, wy, 16, 2) * 0.6 + noise(wx * 2.5, wy * 2.5, 40, 3) * 0.4
      field[y * width + x] = smooth(0.5, 0.9, smudge) * 0.35
    }
  }
  // Scratches: thin straight lines at random angles, a few texels long to a third of the tile.
  for (let s = 0; s < 70; s++) {
    const x0 = hash(s, 1, 9) * width
    const y0 = hash(s, 2, 9) * height
    const angle = (hash(s, 3, 9) - 0.5) * Math.PI * 0.6
    const length = 8 + hash(s, 4, 9) * width * 0.3
    const strength = 0.5 + hash(s, 5, 9) * 0.5
    for (let i = 0; i < length; i++) {
      const x = Math.floor(x0 + Math.cos(angle) * i + width) % width
      const y = Math.floor(y0 + Math.sin(angle) * i * 0.5 + height) % height
      const k = y * width + x
      field[k] = Math.max(field[k] ?? 0, strength)
    }
  }
  marks = field
  return field
}

export function writeSurfaceTexture(map: DataTexture, look: GlassLook) {
  const { data, width, height } = map.image as { data: Uint8Array; width: number; height: number }
  const field = markField(width, height)
  for (let y = 0; y < height; y++) {
    // Marks only on the wide faces; the narrow bevels and sides stay clean and crisp.
    const face = FACE_EDGES.includes(edgeAt(y, height))
    for (let x = 0; x < width; x++) {
      const k = y * width + x
      const mark = face ? (field[k] ?? 0) * look.mottling : 0
      const roughness = look.roughness + mark * 0.4
      const specular = face ? 1 - look.mottling * 0.4 + mark * 0.8 : 1
      data.set([0, byte(roughness), 0, byte(specular)], k * 4)
    }
  }
  map.needsUpdate = true
}

/**
 * The bevels alone (emissiveMap, band UVs): a faint glow of their own, so the outline
 * reads as one continuous line at every angle of the turn, under the moving reflections.
 */
export function createRimTexture() {
  const map = texture(4, BAND_EDGES * 8, 1)
  const { data, width, height } = map.image as { data: Uint8Array; width: number; height: number }
  for (let y = 0; y < height; y++) {
    const rim = CHAMFER_EDGES.includes(edgeAt(y, height)) ? 255 : 0
    for (let x = 0; x < width; x++) data.set([rim, rim, rim, 255], (y * width + x) * 4)
  }
  map.magFilter = map.minFilter = NearestFilter
  map.needsUpdate = true
  return map
}
