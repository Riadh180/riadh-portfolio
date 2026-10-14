import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import type { Job } from '@/content/site'
import { scramble } from '@/lib/scramble'
import { palette } from '@/styles/tokens'
import { hash } from '../noise'

/** A palette colour as a CSS rgba() string. */
const rgba = (hex: string, alpha: number) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** Mixes two palette colours (hex), `amount` of the second. */
const mix = (a: string, b: string, amount: number) => {
  const x = Number.parseInt(a.slice(1), 16)
  const y = Number.parseInt(b.slice(1), 16)
  const channel = (shift: number) =>
    Math.round(((x >> shift) & 255) * (1 - amount) + ((y >> shift) & 255) * amount)
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`
}

const WIDTH = 1024
const HEIGHT = 640

/**
 * A job card's face, drawn on a canvas: its cover (public/work/<slug>/cover.*) or a
 * generated placeholder, darkened, with the title over it, "COMPANY" small and the metric
 * large, in Departure Mono. `draw(elapsed)` redraws the title mid-scramble; the cover is
 * drawn once and reused.
 */
export class CardFace {
  /** The title layer: transparent, drawn crisp over the frosted glass. */
  readonly texture: CanvasTexture
  /** The image under the glass (cover or placeholder), frosted by the screen shader. */
  readonly image: CanvasTexture
  private canvas = document.createElement('canvas')
  private context: CanvasRenderingContext2D
  private background = document.createElement('canvas')
  private family: string

  constructor(
    private job: Job,
    private index: number,
    /** The small line at the top; by default "NN / years". */
    private kicker?: string,
  ) {
    this.canvas.width = this.background.width = WIDTH
    this.canvas.height = this.background.height = HEIGHT
    const context = this.canvas.getContext('2d')
    if (!context) throw new Error('2D canvas unavailable')
    this.context = context
    this.family =
      getComputedStyle(document.documentElement).getPropertyValue('--font-departure').trim() ||
      'monospace'
    this.texture = new CanvasTexture(this.canvas)
    this.texture.colorSpace = SRGBColorSpace
    this.texture.minFilter = LinearMipmapLinearFilter
    this.texture.anisotropy = 8
    this.image = new CanvasTexture(this.background)
    this.image.colorSpace = SRGBColorSpace
    this.drawPlaceholder()
    void document.fonts.load(`64px ${this.family}`).then(() => this.draw(Infinity))
  }

  /** Uses the real cover once it has loaded. */
  setCover(url: string) {
    const image = new Image()
    image.onload = () => {
      const context = this.background.getContext('2d')
      if (!context) return
      // Cover-fit, then darken so the title always reads.
      const scale = Math.max(WIDTH / image.width, HEIGHT / image.height)
      const w = image.width * scale
      const h = image.height * scale
      context.drawImage(image, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h)
      this.shade(context)
      this.image.needsUpdate = true
    }
    image.src = url
  }

  /** Redraws the title layer, `elapsed` seconds into its scramble. */
  draw(elapsed: number) {
    const c = this.context
    c.clearRect(0, 0, WIDTH, HEIGHT)

    const left = 64
    c.textBaseline = 'alphabetic'
    c.font = `30px ${this.family}`
    c.fillStyle = palette.muted
    c.fillText(
      this.kicker ?? `${String(this.index + 1).padStart(2, '0')} / ${this.job.years}`,
      left,
      84,
    )

    c.font = `34px ${this.family}`
    c.fillStyle = palette.text
    c.fillText(this.job.company.toUpperCase(), left, HEIGHT - 150)

    // The metric, scrambling: ghosted, doubled letters that resolve left to right.
    c.font = `78px ${this.family}`
    let x = left
    for (const { char, ghost } of scramble(this.job.metric.toUpperCase(), elapsed)) {
      const width = c.measureText(char).width
      if (ghost > 0) {
        c.fillStyle = rgba(palette.text, 0.35 * ghost)
        c.fillText(char, x + ghost * 26, HEIGHT - 64)
        c.fillText(char, x - ghost * 14, HEIGHT - 64)
      }
      c.fillStyle = palette.text
      c.fillText(char, x, HEIGHT - 64)
      x += width
    }
    this.texture.needsUpdate = true
  }

  dispose() {
    this.texture.dispose()
    this.image.dispose()
  }

  /**
   * Until there is a cover: a moody generated screen per job. Muted palette colours,
   * dark mottled patches, a few UI-like blocks and film noise, so the cards differ and
   * read as real, textured images without pretending to be real work.
   */
  private drawPlaceholder() {
    const c = this.background.getContext('2d')
    if (!c) return
    const tones = [
      palette.violet,
      palette.teal,
      palette.pink,
      palette.blue,
      palette.emerald,
      palette.warm,
    ]
    const muted = (hex: string) => mix(hex, palette.bg, 0.55)
    const from = muted(tones[this.index % tones.length] ?? palette.violet)
    const to = muted(tones[(this.index + 2) % tones.length] ?? palette.teal)
    const gradient = c.createLinearGradient(0, 0, WIDTH, HEIGHT)
    gradient.addColorStop(0, from)
    gradient.addColorStop(1, to)
    c.fillStyle = gradient
    c.fillRect(0, 0, WIDTH, HEIGHT)

    // Mottling: overlapping soft dark and light patches.
    for (let i = 0; i < 26; i++) {
      const x = hash(i, this.index, 5) * WIDTH
      const y = hash(i, this.index, 6) * HEIGHT
      const r = 60 + hash(i, this.index, 7) * 240
      const light = hash(i, this.index, 8) > 0.6
      const blob = c.createRadialGradient(x, y, 0, x, y, r)
      blob.addColorStop(0, light ? rgba(palette.glow, 0.18) : rgba(palette.bg, 0.45))
      blob.addColorStop(1, rgba(palette.bg, 0))
      c.fillStyle = blob
      c.fillRect(0, 0, WIDTH, HEIGHT)
    }

    // A few UI-like blocks, so it reads as a screen.
    c.fillStyle = rgba(palette.text, 0.1)
    for (let i = 0; i < 7; i++) {
      const x = hash(i, this.index, 1) * WIDTH * 0.8
      const y = hash(i, this.index, 2) * HEIGHT * 0.6
      const w = 80 + hash(i, this.index, 3) * 260
      const h = 18 + hash(i, this.index, 4) * 90
      c.beginPath()
      c.roundRect(x, y, w, h, 12)
      c.fill()
    }

    // Film noise.
    const pixels = c.getImageData(0, 0, WIDTH, HEIGHT)
    let seed = 0x9e3779b9 ^ (this.index + 1)
    for (let i = 0; i < pixels.data.length; i += 4) {
      // xorshift: cheap and plenty random for grain.
      seed ^= seed << 13
      seed ^= seed >>> 17
      seed ^= seed << 5
      const n = ((seed >>> 0) / 4294967296 - 0.5) * 34
      pixels.data[i] = (pixels.data[i] ?? 0) + n
      pixels.data[i + 1] = (pixels.data[i + 1] ?? 0) + n
      pixels.data[i + 2] = (pixels.data[i + 2] ?? 0) + n
    }
    c.putImageData(pixels, 0, 0)

    this.shade(c)
    this.image.needsUpdate = true
    this.draw(Infinity)
  }

  /** Darkens the lower part, where the title sits. */
  private shade(c: CanvasRenderingContext2D) {
    const gradient = c.createLinearGradient(0, HEIGHT * 0.45, 0, HEIGHT)
    gradient.addColorStop(0, rgba(palette.bg, 0))
    gradient.addColorStop(1, rgba(palette.bg, 0.8))
    c.fillStyle = gradient
    c.fillRect(0, 0, WIDTH, HEIGHT)
  }
}
