import { CanvasTexture, LinearMipmapLinearFilter } from 'three'

/** Glyph size on the canvas, in pixels: big enough to stay crisp across the screen. */
const FONT_PX = 220
const LINE_HEIGHT = 1.08
/** Empty margin left and right (fraction of the text width) for glitch offsets to land in. */
export const TAGLINE_PAD = 0.12

/**
 * Draws the tagline in Departure Mono, white on black, one line per row of equal height.
 * The shader reads the red channel as coverage (kept linear: it is data, not colour). Waits for the webfont so the canvas never
 * draws the fallback face.
 */
export async function createTaglineTexture(text: readonly string[]) {
  // Set in capitals, like the rest of the display type.
  const lines = text.map((line) => line.toUpperCase())
  const family =
    getComputedStyle(document.documentElement).getPropertyValue('--font-departure').trim() ||
    'monospace'
  const font = `${FONT_PX}px ${family}`
  await document.fonts.load(font)

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas unavailable')
  context.font = font
  const textWidth = Math.max(...lines.map((line) => context.measureText(line).width))
  const pad = Math.ceil(textWidth * TAGLINE_PAD)
  const row = Math.ceil(FONT_PX * LINE_HEIGHT)
  canvas.width = Math.ceil(textWidth) + pad * 2
  canvas.height = row * lines.length

  // Resizing resets the context state.
  context.font = font
  context.fillStyle = '#000'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#fff'
  context.textBaseline = 'middle'
  lines.forEach((line, i) => context.fillText(line, pad, row * (i + 0.5)))

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = 8
  return { texture, aspect: canvas.width / canvas.height }
}
