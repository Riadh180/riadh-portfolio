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
  // Hex, so mixes can be mixed again (and fed to rgba()).
  const hex = (shift: number) => channel(shift).toString(16).padStart(2, '0')
  return `#${hex(16)}${hex(8)}${hex(0)}`
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
  private hasCover = false

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
    // The mock screen's labels use the font too: redraw it once loaded (unless a cover came).
    void document.fonts.load(`64px ${this.family}`).then(() => {
      if (this.hasCover) this.draw(Infinity)
      else this.drawPlaceholder()
    })
  }

  /** Uses the real cover once it has loaded. */
  setCover(url: string) {
    const image = new Image()
    image.onload = () => {
      this.hasCover = true
      const context = this.background.getContext('2d')
      if (!context) return
      if (url.endsWith('.svg')) {
        // A diagram: shown whole on the dark screen, never cropped.
        context.fillStyle = palette.bg
        context.fillRect(0, 0, WIDTH, HEIGHT)
        const fit = Math.min(WIDTH / image.width, (HEIGHT * 0.86) / image.height)
        const w = image.width * fit
        context.drawImage(image, (WIDTH - w) / 2, HEIGHT * 0.02, w, image.height * fit)
      } else if (image.width < image.height) {
        // A phone screenshot: shown whole, right of centre, over a blurred, darkened
        // enlargement of itself (so the card stays full and its colours carry).
        const fill = Math.max(WIDTH / image.width, HEIGHT / image.height)
        context.filter = 'blur(28px) brightness(0.55) saturate(1.2)'
        context.drawImage(
          image,
          (WIDTH - image.width * fill) / 2,
          (HEIGHT - image.height * fill) / 2,
          image.width * fill,
          image.height * fill,
        )
        context.filter = 'none'
        const fit = (HEIGHT * 0.92) / image.height
        const w = image.width * fit
        context.drawImage(image, WIDTH * 0.68 - w / 2, HEIGHT * 0.04, w, image.height * fit)
      } else {
        // Cover-fit.
        const scale = Math.max(WIDTH / image.width, HEIGHT / image.height)
        const w = image.width * scale
        const h = image.height * scale
        context.drawImage(image, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h)
      }
      // Darken the title's corner so it always reads.
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
   * Until there is a cover: a generated mock app screen per job (status bar, header, a
   * vivid media tile, cards, a button, a small chart, list rows). Detailed and colourful,
   * like a real screenshot, so the frost has something to break up, without pretending to
   * be real work: no real names or numbers, only generic UI labels.
   */
  private drawPlaceholder() {
    const c = this.background.getContext('2d')
    if (!c) return
    const i = this.index
    const tones = [
      palette.violet,
      palette.teal,
      palette.pink,
      palette.blue,
      palette.emerald,
      palette.warm,
    ]
    // Muted: the mock is a quiet stand-in, never louder than real media.
    const tone = (k: number) =>
      mix(tones[(i + k) % tones.length] ?? palette.violet, palette.bg, 0.45)
    const r = (k: number) => hash(k, i, 11)

    // Screen background: dark elevated charcoal with a wash of the job's tone.
    const back = c.createLinearGradient(0, 0, WIDTH, HEIGHT)
    back.addColorStop(0, mix(palette.bgElevated, tone(0), 0.28))
    back.addColorStop(1, mix(palette.bg, tone(3), 0.18))
    c.fillStyle = back
    c.fillRect(0, 0, WIDTH, HEIGHT)

    const block = (
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number,
      fill: string | CanvasGradient,
    ) => {
      c.fillStyle = fill
      c.beginPath()
      c.roundRect(x, y, w, h, radius)
      c.fill()
    }
    const label = (text: string, x: number, y: number, size: number, color: string) => {
      c.font = `${size}px ${this.family}`
      c.fillStyle = color
      c.fillText(text, x, y)
    }

    // Status bar and header.
    label('9:41', 40, 42, 22, rgba(palette.text, 0.8))
    block(WIDTH - 120, 26, 70, 18, 9, rgba(palette.text, 0.5))
    const titles = ['Overview', 'Dashboard', 'Activity', 'Shipments', 'Campaigns', 'Studio']
    label(titles[i % titles.length] ?? 'Overview', 40, 110, 44, palette.text)
    block(WIDTH - 104, 74, 56, 56, 28, mix(tone(1), palette.text, 0.2))

    // The media tile: a vivid gradient with soft shapes, the brightest part of the screen.
    const tileX = 40
    const tileY = 146
    const tileW = WIDTH * 0.56
    const tileH = 250
    const media = c.createLinearGradient(tileX, tileY, tileX + tileW, tileY + tileH)
    media.addColorStop(0, tone(0))
    media.addColorStop(0.55, tone(2))
    media.addColorStop(1, tone(4))
    block(tileX, tileY, tileW, tileH, 26, media)
    c.save()
    c.beginPath()
    c.roundRect(tileX, tileY, tileW, tileH, 26)
    c.clip()
    for (let k = 0; k < 5; k++) {
      const x = tileX + r(k) * tileW
      const y = tileY + r(k + 60) * tileH
      const radius = 14 + r(k + 80) * 70
      const blob = c.createRadialGradient(x, y, 0, x, y, radius)
      blob.addColorStop(0, rgba(k % 2 ? palette.glow : palette.bg, k % 2 ? 0.25 : 0.4))
      blob.addColorStop(1, rgba(palette.bg, 0))
      c.fillStyle = blob
      c.fillRect(tileX, tileY, tileW, tileH)
    }
    c.restore()
    label('Featured', tileX + 28, tileY + tileH - 34, 30, palette.text)

    // A column of cards beside it: icon, two text lines.
    const colX = tileX + tileW + 28
    const colW = WIDTH - colX - 40
    for (let k = 0; k < 3; k++) {
      const y = tileY + k * 86
      block(colX, y, colW, 72, 16, rgba(palette.text, 0.1))
      block(colX + 14, y + 14, 44, 44, 12, tone(k + 1))
      block(colX + 72, y + 18, colW * (0.4 + r(k + 30) * 0.4), 12, 6, rgba(palette.text, 0.65))
      block(colX + 72, y + 42, colW * (0.3 + r(k + 40) * 0.3), 10, 5, rgba(palette.text, 0.3))
    }

    // A button and a small bar chart.
    block(40, tileY + tileH + 28, 220, 58, 29, palette.emerald)
    label('Continue', 76, tileY + tileH + 66, 26, palette.bg)
    for (let k = 0; k < 9; k++) {
      const h = 30 + r(k + 50) * 90
      block(
        300 + k * 30,
        tileY + tileH + 86 - h,
        18,
        h,
        5,
        rgba(k % 3 ? palette.glow : tone(2), 0.75),
      )
    }

    // List rows towards the bottom (under the title's shade).
    for (let k = 0; k < 3; k++) {
      const y = HEIGHT - 150 + k * 46
      block(620, y, 300, 12, 6, rgba(palette.text, 0.4))
      block(620, y + 20, 200, 9, 5, rgba(palette.text, 0.2))
    }

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
