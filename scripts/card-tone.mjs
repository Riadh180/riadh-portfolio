// A card's tone, closed at its stop vs opened (Stage 5: the open media at most ~1.4× the closed
// brightness, at the closed saturation): mean luminance and saturation inside the card's
// projected outline (the json the capture scripts save next to each frame), shrunk 6% so the
// bevel and its glint stay out.
//
//   node scripts/card-tone.mjs <stopsDir> <openDir>
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const [, , stopsDir, openDir] = process.argv
const W = 1440
const H = 900

async function tone(image, cornersFile) {
  const flat = JSON.parse(fs.readFileSync(cornersFile, 'utf8'))
  if (!flat) return null
  const points = []
  for (let k = 0; k < flat.length; k += 2) points.push([flat[k], flat[k + 1]])
  // The front face's four corners are the projected box's extreme points; use the hull.
  const cx = points.reduce((a, p) => a + p[0], 0) / points.length
  const cy = points.reduce((a, p) => a + p[1], 0) / points.length
  const shrunk = points.map(([x, y]) => [cx + (x - cx) * 0.94, cy + (y - cy) * 0.94])
  const poly = shrunk.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/><polygon points="${poly}" fill="#fff"/></svg>`
  // Convex hull of the 8 projected corners is drawn by the polygon fill of their hull order.
  const hull = (() => {
    const p = [...shrunk].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    const half = (list) => { const out = []; for (const q of list) { while (out.length >= 2 && cross(out.at(-2), out.at(-1), q) <= 0) out.pop(); out.push(q) } return out.slice(0, -1) }
    return half(p).concat(half(p.reverse()))
  })()
  const mask = await sharp(Buffer.from(svg.replace(poly, hull.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')))).greyscale().raw().toBuffer()
  const rgb = await sharp(image).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  let n = 0, lum = 0, sat = 0
  for (let i = 0; i < W * H; i++) {
    if (mask[i] < 128) continue
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    lum += 0.2126 * r + 0.7152 * g + 0.0722 * b
    sat += max ? (max - min) / max : 0
    n++
  }
  return n ? { luminance: lum / n, saturation: sat / n } : null
}

const rows = []
for (const file of fs.readdirSync(stopsDir).filter((f) => f.endsWith('.png')).sort()) {
  const slug = file.replace(/^\d+-/, '').replace(/\.png$/, '')
  const closed = await tone(path.join(stopsDir, file), path.join(stopsDir, file.replace('.png', '.json')))
  const open = fs.existsSync(path.join(openDir, `${slug}.json`))
    ? await tone(path.join(openDir, `${slug}.png`), path.join(openDir, `${slug}.json`))
    : null
  if (!closed || !open) continue
  rows.push(`| ${slug} | ${closed.luminance.toFixed(1)} | ${open.luminance.toFixed(1)} | ${(open.luminance / closed.luminance).toFixed(2)}× | ${closed.saturation.toFixed(2)} | ${open.saturation.toFixed(2)} |`)
}
console.log(['| Card | Closed luminance | Open luminance | Open / closed | Closed saturation | Open saturation |', '|---|---|---|---|---|---|', ...rows].join('\n'))
