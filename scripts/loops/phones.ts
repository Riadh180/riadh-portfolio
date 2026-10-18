import { palette } from '@/styles/tokens'

/** A palette colour as a CSS rgba() string. */
const rgba = (hex: string, alpha: number) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** Mixes two colours (hex), `amount` of the second. */
const mix = (a: string, b: string, amount: number) => {
  const x = Number.parseInt(a.slice(1), 16)
  const y = Number.parseInt(b.slice(1), 16)
  const channel = (shift: number) =>
    Math.round(((x >> shift) & 255) * (1 - amount) + ((y >> shift) & 255) * amount)
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`
}

/** The colour of an image's centre column at a height (0..1). */
function sample(image: HTMLImageElement, y: number) {
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!probe) return palette.bg
  probe.drawImage(image, 0, -y * image.height, image.width, image.height)
  const [r = 0, g = 0, b = 0] = probe.getImageData(image.width / 2, 0, 1, 1).data
  return `rgba(${r}, ${g}, ${b}, 0.45)`
}

/**
 * Bliggit's product shot, as the card showed it (two real screenshots side by side, slightly
 * angled, in dark bezels, on a wine-to-indigo gradient lit by the app's own top colour), alive:
 * the home screen pans slowly in the front phone, the phones drift a little apart and together,
 * and a soft light crosses them once. Everything repeats exactly every `period` seconds, so the
 * loop is seamless. No invented UI: only the two screenshots move.
 */
export function drawPhones(
  c: CanvasRenderingContext2D,
  [home, login]: [HTMLImageElement, HTMLImageElement],
  t: number,
  period: number,
) {
  const { width, height } = c.canvas
  const phase = ((t % period) / period) * Math.PI * 2
  const gradient = c.createLinearGradient(0, 0, width, height)
  // Deep wine → plum (the app's red, held back for the card family).
  gradient.addColorStop(0, mix(palette.bg, '#5a1426', 0.75))
  gradient.addColorStop(0.55, mix(palette.bg, '#3a1838', 0.7))
  gradient.addColorStop(1, mix(palette.bg, '#24204a', 0.7))
  c.fillStyle = gradient
  c.fillRect(0, 0, width, height)
  // A soft glow of the app's own top colour behind the phones.
  const glow = c.createRadialGradient(
    width * 0.55,
    height * 0.45,
    0,
    width * 0.55,
    height * 0.45,
    width * 0.45,
  )
  glow.addColorStop(0, sample(home, 0.05))
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  c.fillStyle = glow
  c.fillRect(0, 0, width, height)

  /** A phone: the screenshot in a rounded dark bezel; `pan` (0..1) scrolls a zoomed screen. */
  const phone = (
    image: HTMLImageElement,
    cx: number,
    cy: number,
    angle: number,
    scale: number,
    pan?: number,
  ) => {
    const h = height * scale
    const w = (image.width / image.height) * h
    c.save()
    c.translate(cx, cy)
    c.rotate(angle)
    c.shadowColor = 'rgba(0, 0, 0, 0.6)'
    c.shadowBlur = 50
    c.shadowOffsetY = 22
    c.fillStyle = '#05070a'
    c.beginPath()
    c.roundRect(-w / 2 - 11, -h / 2 - 11, w + 22, h + 22, 50)
    c.fill()
    c.shadowColor = 'transparent'
    c.beginPath()
    c.roundRect(-w / 2, -h / 2, w, h, 40)
    c.clip()
    if (pan === undefined) c.drawImage(image, -w / 2, -h / 2, w, h)
    else {
      // The home screen a little closer, panning down its length and back (close enough to
      // move, not so close that its edges are cut).
      const zoom = 1.06
      c.drawImage(image, -(w * zoom) / 2, -h / 2 - h * (zoom - 1) * pan, w * zoom, h * zoom)
    }
    c.restore()
  }
  // On the right, so the title (left) crosses no white screen area; drifting in counterpoint.
  const drift = Math.sin(phase)
  phone(
    login,
    width * 0.66 - drift * 9,
    height * 0.5 + Math.sin(phase + 1.2) * 5,
    -0.08 + drift * 0.006,
    0.92,
  )
  phone(
    home,
    width * 0.84 + drift * 9,
    height * 0.5 - Math.sin(phase + 1.2) * 5,
    0.07 - drift * 0.006,
    0.98,
    0.5 - 0.5 * Math.cos(phase),
  )

  // The light: a soft diagonal band crossing the picture once per loop (off-frame at the seam).
  const at = -0.35 + 1.8 * ((t % period) / period)
  const x = at * width
  const band = c.createLinearGradient(x - width * 0.18, 0, x + width * 0.18, height * 0.35)
  band.addColorStop(0, 'rgba(255, 240, 225, 0)')
  band.addColorStop(0.5, rgba('#fff2e6', 0.07))
  band.addColorStop(1, 'rgba(255, 240, 225, 0)')
  c.save()
  c.globalCompositeOperation = 'screen'
  c.fillStyle = band
  c.fillRect(0, 0, width, height)
  c.restore()
}
