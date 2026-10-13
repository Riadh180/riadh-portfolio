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

const WIDTH = 1024
const HEIGHT = 640

/**
 * A job card's face, drawn on a canvas: its cover (public/work/<slug>/cover.*) or a
 * generated placeholder, darkened, with the title over it, "COMPANY" small and the metric
 * large, in Departure Mono. `draw(elapsed)` redraws the title mid-scramble; the cover is
 * drawn once and reused.
 */
export class CardFace {
  readonly texture: CanvasTexture
  private canvas = document.createElement('canvas')
  private context: CanvasRenderingContext2D
  private background = document.createElement('canvas')
  private family: string

  constructor(
    private job: Job,
    private index: number,
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
      this.draw(Infinity)
    }
    image.src = url
  }

  /** Redraws the face with the title `elapsed` seconds into its scramble. */
  draw(elapsed: number) {
    const c = this.context
    c.drawImage(this.background, 0, 0)

    const left = 64
    c.textBaseline = 'alphabetic'
    c.font = `30px ${this.family}`
    c.fillStyle = palette.muted
    c.fillText(`${String(this.index + 1).padStart(2, '0')} / ${this.job.years}`, left, 84)

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
  }

  /**
   * Until there is a cover: a quiet generated screen per job, dark bands of the palette
   * with a few UI-like blocks, so the cards differ without pretending to be real work.
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
    const from = tones[this.index % tones.length] ?? palette.violet
    const to = tones[(this.index + 2) % tones.length] ?? palette.teal
    const gradient = c.createLinearGradient(0, 0, WIDTH, HEIGHT)
    gradient.addColorStop(0, from)
    gradient.addColorStop(1, to)
    c.fillStyle = gradient
    c.fillRect(0, 0, WIDTH, HEIGHT)
    // Soft light blobs, like an out-of-focus screen.
    for (let i = 0; i < 6; i++) {
      const x = hash(i, this.index, 5) * WIDTH
      const y = hash(i, this.index, 6) * HEIGHT
      const r = 120 + hash(i, this.index, 7) * 260
      const blob = c.createRadialGradient(x, y, 0, x, y, r)
      blob.addColorStop(0, rgba(i % 2 ? palette.glow : palette.text, 0.35))
      blob.addColorStop(1, rgba(palette.text, 0))
      c.fillStyle = blob
      c.fillRect(0, 0, WIDTH, HEIGHT)
    }
    // A few UI-like blocks, so it reads as a screen, not a gradient.
    c.fillStyle = rgba(palette.text, 0.16)
    for (let i = 0; i < 7; i++) {
      const x = hash(i, this.index, 1) * WIDTH * 0.8
      const y = hash(i, this.index, 2) * HEIGHT * 0.6
      const w = 80 + hash(i, this.index, 3) * 260
      const h = 18 + hash(i, this.index, 4) * 90
      c.beginPath()
      c.roundRect(x, y, w, h, 12)
      c.fill()
    }
    this.shade(c)
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
