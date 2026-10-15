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

/** Card title style: 'light' (General Sans Light, chosen) or 'pixel' (Departure Mono). */
const TITLE_STYLE: 'light' | 'pixel' =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('type') === 'pixel'
    ? 'pixel'
    : 'light'

/** Loads an image (resolves once decoded). */
function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
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
  /** The card titles' display face (General Sans Light). */
  private display: string
  private hasCover = false
  /** Luminance of the media under the title (cached; reset when the media changes). */
  private scrimBand: number | null = null

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
    this.display =
      getComputedStyle(document.documentElement).getPropertyValue('--font-general').trim() ||
      'monospace'
    this.texture = new CanvasTexture(this.canvas)
    this.texture.colorSpace = SRGBColorSpace
    this.texture.minFilter = LinearMipmapLinearFilter
    this.texture.anisotropy = 8
    this.image = new CanvasTexture(this.background)
    this.image.colorSpace = SRGBColorSpace
    this.drawPlaceholder()
    // The mock screen's labels use the font too: redraw it once loaded (unless a cover came).
    void Promise.all([
      document.fonts.load(`64px ${this.family}`),
      document.fonts.load(`300 64px ${this.display}`),
    ]).then(() => {
      if (this.hasCover) this.draw(Infinity)
      else this.drawPlaceholder()
    })
  }

  /** Lighter frost for this card's media (see Job.clearCover). */
  get clear() {
    return !!this.job.clearCover
  }

  /**
   * Uses the real cover once it has loaded; with a `second` portrait screenshot, the two
   * are composed as a product shot (two phones side by side).
   */
  setCover(url: string, second?: string) {
    if (second) {
      void Promise.all([url, second].map(loadImage)).then((images) => this.drawPhones(images))
      return
    }
    const image = new Image()
    image.onload = () => {
      this.hasCover = true
      const context = this.background.getContext('2d')
      if (!context) return
      if (url.endsWith('.svg')) {
        // A diagram: shown whole on the dark screen, never cropped.
        context.fillStyle = palette.bg
        context.fillRect(0, 0, WIDTH, HEIGHT)
        const [sx, sy, sw, sh] = this.job.coverCrop ?? [0, 0, image.width, image.height]
        const fit = Math.min((WIDTH * 0.94) / sw, (HEIGHT * 0.62) / sh)
        const w = sw * fit
        const h = sh * fit
        context.drawImage(image, sx, sy, sw, sh, (WIDTH - w) / 2, HEIGHT * 0.06, w, h)
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
        // As a phone: the screenshot in a rounded dark bezel filling most of the pane's
        // height, centred, so the real app reads through the frost.
        const fit = (HEIGHT * 0.9) / image.height
        const w = image.width * fit
        const h = image.height * fit
        const x = (WIDTH - w) / 2 + WIDTH * 0.12
        const y = (HEIGHT - h) / 2
        context.fillStyle = palette.bg
        context.beginPath()
        context.roundRect(x - 10, y - 10, w + 20, h + 20, 44)
        context.fill()
        context.save()
        context.beginPath()
        context.roundRect(x, y, w, h, 36)
        context.clip()
        context.drawImage(image, x, y, w, h)
        context.restore()
      } else {
        // Cover-fit (a crop of it when the job names one).
        const [sx, sy, sw, sh] = this.job.coverCrop ?? [0, 0, image.width, image.height]
        const scale = Math.max(WIDTH / sw, HEIGHT / sh)
        const w = sw * scale
        const h = sh * scale
        context.drawImage(image, sx, sy, sw, sh, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h)
      }
      // Darken the title's corner so it always reads.
      this.shade(context)
      this.image.needsUpdate = true
      this.scrimBand = null
      this.draw(Infinity)
    }
    image.src = url
  }

  /**
   * Two phone screenshots as a product shot: large, side by side, slightly angled, in dark
   * bezels with a soft shadow, on a rich gradient from the app's own colours (sampled from
   * the first screenshot's top and bottom).
   */
  private drawPhones(images: HTMLImageElement[]) {
    const c = this.background.getContext('2d')
    const [first, second] = images
    if (!c || !first || !second) return
    this.hasCover = true
    const sample = (image: HTMLImageElement, y: number) => {
      const probe = document.createElement('canvas').getContext('2d')
      if (!probe) return palette.bg
      probe.drawImage(image, 0, -y * image.height, image.width, image.height)
      const [r = 0, g = 0, b = 0] = probe.getImageData(image.width / 2, 0, 1, 1).data
      return `rgb(${r}, ${g}, ${b})`
    }
    const gradient = c.createLinearGradient(0, 0, WIDTH, HEIGHT)
    // Deep wine → plum (the app's red, held back for the card family).
    gradient.addColorStop(0, mix(palette.bg, '#5a1426', 0.75))
    gradient.addColorStop(0.55, mix(palette.bg, '#3a1838', 0.7))
    gradient.addColorStop(1, mix(palette.bg, '#24204a', 0.7))
    c.fillStyle = gradient
    c.fillRect(0, 0, WIDTH, HEIGHT)
    // A soft glow of the app's own top colour behind the phones.
    const glow = c.createRadialGradient(
      WIDTH * 0.55,
      HEIGHT * 0.45,
      0,
      WIDTH * 0.55,
      HEIGHT * 0.45,
      WIDTH * 0.45,
    )
    glow.addColorStop(0, sample(first, 0.05).replace('rgb', 'rgba').replace(')', ', 0.45)'))
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    c.fillStyle = glow
    c.fillRect(0, 0, WIDTH, HEIGHT)
    const phone = (image: HTMLImageElement, cx: number, angle: number, scale: number) => {
      const h = HEIGHT * scale
      const w = (image.width / image.height) * h
      c.save()
      c.translate(cx, HEIGHT * 0.5)
      c.rotate(angle)
      c.shadowColor = 'rgba(0, 0, 0, 0.6)'
      c.shadowBlur = 40
      c.shadowOffsetY = 18
      c.fillStyle = '#05070a'
      c.beginPath()
      c.roundRect(-w / 2 - 9, -h / 2 - 9, w + 18, h + 18, 40)
      c.fill()
      c.shadowColor = 'transparent'
      c.beginPath()
      c.roundRect(-w / 2, -h / 2, w, h, 32)
      c.clip()
      c.drawImage(image, -w / 2, -h / 2, w, h)
      c.restore()
    }
    // On the right, so the title (left) crosses no white screen area.
    phone(second, WIDTH * 0.66, -0.08, 0.92)
    phone(first, WIDTH * 0.84, 0.07, 0.98)
    this.image.needsUpdate = true
    this.scrimBand = null
    this.draw(Infinity)
  }

  /** Mean relative luminance (0..1) of the media in a box centred on (x, y). */
  private luminance(x: number, y: number, w: number, h: number) {
    const c = this.background.getContext('2d')
    if (!c) return 0.3
    const left = Math.max(0, Math.round(x - w / 2))
    const top = Math.max(0, Math.round(y - h / 2))
    const width = Math.max(1, Math.min(WIDTH - left, Math.round(w)))
    const height = Math.max(1, Math.min(HEIGHT - top, Math.round(h)))
    const data = c.getImageData(left, top, width, height).data
    let sum = 0
    let n = 0
    for (let i = 0; i < data.length; i += 4 * 16) {
      sum +=
        (0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0)) / 255
      n++
    }
    return n ? sum / n : 0.3
  }

  /** Redraws the title layer, `elapsed` seconds into its scramble. */
  draw(elapsed: number) {
    const c = this.context
    c.clearRect(0, 0, WIDTH, HEIGHT)

    const left = 64
    c.textBaseline = 'alphabetic'
    c.font = `26px ${this.family}`
    c.fillStyle = palette.muted
    c.fillText(
      this.kicker ?? `${String(this.index + 1).padStart(2, '0')} / ${this.job.years}`,
      left,
      78,
    )

    // Editorial: the company small and spaced above, the title large, light and centred
    // over the media, white with a soft glow.
    const display = TITLE_STYLE === 'pixel' ? this.family : this.display
    const weight = TITLE_STYLE === 'pixel' ? '' : '300 '
    const title = (this.job.cardTitle ?? this.job.metric).toUpperCase()
    const centre = (this.job.titleX ?? 0.5) * WIDTH
    // Room: to the nearer card edge, both sides.
    const room = Math.min(centre, WIDTH - centre) * 2 * 0.9
    let size = 92
    c.font = `${weight}${size}px ${display}`
    while (c.measureText(title).width > room && size > 34) {
      size -= 4
      c.font = `${weight}${size}px ${display}`
    }
    const baseline = HEIGHT * 0.56
    // A soft, feathered scrim under the title, as strong as the media there needs for
    // ≥ 4.5:1 contrast (measured from the media's luminance in the title band).
    const band = this.luminance(
      centre,
      baseline - size * 0.5,
      c.measureText(title).width,
      size * 1.6,
    )
    const scrim = Math.min(0.78, Math.max(0.2, (band - 0.08) * 1.9))
    const glow = c.createRadialGradient(
      centre,
      baseline - size * 0.45,
      0,
      centre,
      baseline - size * 0.45,
      Math.max(room * 0.55, size * 2.2),
    )
    glow.addColorStop(0, rgba(palette.bg, scrim))
    glow.addColorStop(0.6, rgba(palette.bg, scrim * 0.55))
    glow.addColorStop(1, rgba(palette.bg, 0))
    c.save()
    c.scale(1, 0.55)
    c.translate(0, (baseline - size * 0.45) * (1 / 0.55 - 1))
    c.fillStyle = glow
    c.fillRect(0, 0, WIDTH, HEIGHT / 0.55)
    c.restore()
    c.textAlign = 'center'
    c.font = `${weight}26px ${display}`
    c.fillStyle = rgba(palette.text, 0.8)
    if ('letterSpacing' in c) (c as { letterSpacing: string }).letterSpacing = '6px'
    c.fillText(
      (this.job.cardSubtitle ?? this.job.company).toUpperCase(),
      WIDTH / 2,
      baseline - size - 14,
    )
    if ('letterSpacing' in c) (c as { letterSpacing: string }).letterSpacing = '0px'

    c.font = `${weight}${size}px ${display}`
    const chars = scramble(title, elapsed)
    const total = c.measureText(title).width
    let x = centre - total / 2
    c.textAlign = 'left'
    for (const { char, ghost } of chars) {
      const width = c.measureText(char).width
      if (ghost > 0) {
        // Chromatic doubled letters (the reference's "SUSSTAINABLE"), settling.
        c.fillStyle = rgba(palette.pink, 0.55 * ghost)
        c.fillText(char, x + ghost * 22, baseline)
        c.fillStyle = rgba(palette.teal, 0.55 * ghost)
        c.fillText(char, x - ghost * 14, baseline)
      }
      c.shadowColor = rgba(palette.glow, 0.55)
      c.shadowBlur = 24
      c.fillStyle = palette.text
      c.fillText(char, x, baseline)
      c.shadowBlur = 0
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
