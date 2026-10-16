// Image metrics for matching the look of Work's column and air to the reference recording.
//
//   node scripts/compare-frames.mjs <refFrames> <refMasks> <ourFrames> <ourMasks> [--json out.json] [--overlay sheet.jpg] [--inside]
//
// --inside: the opposite, the cards only (their tone against the reference's cards); EMPTY
// AREA and SPARKLE are left out of the table then.
//
// Every frame is read at 1440×900. 8% is cropped from every edge (the UI bars), and the
// cards are masked out (mask PNGs named like the frames, white = card), so only the column
// and the air are measured. Per-frame values are averaged per side.
//
// Metrics (luminance Y = Rec. 709):
// - mean luminance, contrast (luminance std dev), 5th / 95th percentile (0–255)
// - mean saturation (HSV) of pixels with V > 0.08 (black has no meaningful saturation)
// - 12-bin hue histogram (30° bins from red) of pixels with saturation > 0.15, as shares;
//   compared by total variation distance (0 = identical, 1 = disjoint)
// - EMPTY AREA: % of 16×16 tiles (≥ 75% measured) whose luminance std dev < 0.015 and
//   mean < 0.12 (0–1): flat, dark, nothing happening
// - SPARKLE: points that are the maximum of their 5×5 window, above the frame's 98th
//   percentile and ≥ 0.25 above the mean of their 9×9 window; per megapixel measured
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const W = 1440
const H = 900
const CROP = 0.08
const X0 = Math.round(W * CROP)
const Y0 = Math.round(H * CROP)
const X1 = W - X0
const Y1 = H - Y0
const TILE = 16

function percentile(histogram, total, p) {
  let seen = 0
  for (let v = 0; v < 256; v++) {
    seen += histogram[v]
    if (seen >= total * p) return v
  }
  return 255
}

/** Measure inside the cards instead of around them (--inside). */
let inside = false

async function readMask(file) {
  const keep = new Uint8Array(W * H)
  const card = fs.existsSync(file)
    ? await sharp(file).resize(W, H, { fit: 'fill', kernel: 'nearest' }).greyscale().raw().toBuffer()
    : null
  for (let y = Y0; y < Y1; y++) {
    for (let x = X0; x < X1; x++) keep[y * W + x] = (card !== null && card[y * W + x] > 127) === inside ? 1 : 0
  }
  return keep
}

export async function measure(file, maskFile) {
  const keep = await readMask(maskFile)
  const rgb = await sharp(file).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  const lum = new Float32Array(W * H)
  const histogram = new Uint32Array(256)
  const hues = new Float64Array(12)
  let n = 0
  let sum = 0
  let sumSq = 0
  let satSum = 0
  let satCount = 0
  let hueCount = 0
  for (let i = 0; i < W * H; i++) {
    const r = rgb[i * 3]
    const g = rgb[i * 3 + 1]
    const b = rgb[i * 3 + 2]
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    lum[i] = y
    if (!keep[i]) continue
    n++
    histogram[Math.min(255, Math.round(y))]++
    sum += y
    sumSq += y * y
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const s = max === 0 ? 0 : (max - min) / max
    if (max / 255 > 0.08) {
      satSum += s
      satCount++
    }
    if (s > 0.15) {
      const d = max - min
      let h
      if (max === r) h = ((g - b) / d + 6) % 6
      else if (max === g) h = (b - r) / d + 2
      else h = (r - g) / d + 4
      hues[Math.min(11, Math.floor(h * 2))]++
      hueCount++
    }
  }
  if (!n) return null
  const mean = sum / n
  const p98 = percentile(histogram, n, 0.98)

  let empty = 0
  let tiles = 0
  for (let ty = Y0; ty + TILE <= Y1; ty += TILE) {
    for (let tx = X0; tx + TILE <= X1; tx += TILE) {
      let s1 = 0
      let s2 = 0
      let k = 0
      for (let y = ty; y < ty + TILE; y++) {
        for (let x = tx; x < tx + TILE; x++) {
          if (!keep[y * W + x]) continue
          const v = lum[y * W + x] / 255
          s1 += v
          s2 += v * v
          k++
        }
      }
      if (k < TILE * TILE * 0.75) continue
      tiles++
      const m = s1 / k
      if (Math.sqrt(Math.max(0, s2 / k - m * m)) < 0.015 && m < 0.12) empty++
    }
  }

  let sparkle = 0
  for (let y = Math.max(4, Y0); y < Math.min(H - 4, Y1); y++) {
    for (let x = Math.max(4, X0); x < Math.min(W - 4, X1); x++) {
      const i = y * W + x
      const v = lum[i]
      if (!keep[i] || v <= p98) continue
      let isMax = true
      for (let dy = -2; dy <= 2 && isMax; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if ((dx || dy) && lum[i + dy * W + dx] > v) {
            isMax = false
            break
          }
        }
      }
      if (!isMax) continue
      let around = 0
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) around += lum[i + dy * W + dx]
      }
      if (v - around / 81 >= 0.25 * 255) sparkle++
    }
  }

  return {
    luminance: mean,
    contrast: Math.sqrt(Math.max(0, sumSq / n - mean * mean)),
    p5: percentile(histogram, n, 0.05),
    p95: percentile(histogram, n, 0.95),
    saturation: satCount ? satSum / satCount : 0,
    hue: Array.from(hues, (c) => (hueCount ? c / hueCount : 0)),
    empty: tiles ? (empty / tiles) * 100 : 0,
    sparkle: sparkle / (n / 1e6),
    measured: n / ((X1 - X0) * (Y1 - Y0)),
  }
}

export async function measureDir(dir, masks) {
  const files = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort()
  if (!files.length) throw new Error(`no frames in ${dir}`)
  const frames = []
  for (const f of files) {
    const m = await measure(path.join(dir, f), path.join(masks, f))
    // A frame that is almost all card says nothing about the air.
    if (m && m.measured > (inside ? 0.05 : 0.15)) frames.push({ file: f, ...m })
  }
  const avg = (key) => frames.reduce((a, m) => a + m[key], 0) / frames.length
  return {
    frames: frames.length,
    luminance: avg('luminance'),
    contrast: avg('contrast'),
    p5: avg('p5'),
    p95: avg('p95'),
    saturation: avg('saturation'),
    hue: Array.from({ length: 12 }, (_, k) => frames.reduce((a, m) => a + m.hue[k], 0) / frames.length),
    empty: avg('empty'),
    sparkle: avg('sparkle'),
    measured: avg('measured'),
    perFrame: frames,
  }
}

/** Frames with the crop and the card masks shown (for checking the masks by eye). */
async function overlaySheet(dir, masks, out, every = 8) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort().filter((_, i) => i % every === 0)
  const w = 360
  const h = 225
  const tiles = []
  for (const f of files) {
    const keep = await readMask(path.join(masks, f))
    const tint = Buffer.alloc(W * H * 4)
    for (let i = 0; i < W * H; i++) if (!keep[i]) tint.set([255, 30, 60, 150], i * 4)
    const full = await sharp(path.join(dir, f))
      .resize(W, H, { fit: 'fill' })
      .composite([{ input: tint, raw: { width: W, height: H, channels: 4 } }])
      .png()
      .toBuffer()
    tiles.push(await sharp(full).resize(w, h).png().toBuffer())
  }
  const cols = 6
  await sharp({ create: { width: cols * w, height: Math.ceil(tiles.length / cols) * h, channels: 3, background: '#000' } })
    .composite(tiles.map((input, k) => ({ input, left: (k % cols) * w, top: Math.floor(k / cols) * h })))
    .jpeg({ quality: 82 })
    .toFile(out)
}

export function table(ref, ours, cards = false) {
  const all = [
    ['Mean luminance (0–255)', 'luminance', 1],
    ['Contrast (luma std dev)', 'contrast', 1],
    ['5th percentile', 'p5', 1],
    ['95th percentile', 'p95', 1],
    ['Mean saturation', 'saturation', 3],
    ['EMPTY AREA (% tiles)', 'empty', 1],
    ['SPARKLE (points / MP)', 'sparkle', 0],
  ]
  const rows = cards ? all.slice(0, 5) : all
  const lines = [
    `| Metric | Reference (${ref.frames} frames) | Ours (${ours.frames} frames) | Difference |`,
    '|---|---|---|---|',
  ]
  for (const [label, key, digits] of rows) {
    const delta = ref[key] ? ((ours[key] - ref[key]) / ref[key]) * 100 : 0
    lines.push(
      `| ${label} | ${ref[key].toFixed(digits)} | ${ours[key].toFixed(digits)} | ${delta >= 0 ? '+' : ''}${delta.toFixed(0)}% ${Math.abs(delta) <= 15 ? '✓' : '✗'} |`,
    )
  }
  const tv = ref.hue.reduce((a, r, k) => a + Math.abs(r - ours.hue[k]), 0) / 2
  lines.push(`| Hue histogram distance (TV, 0–1) | — | — | ${tv.toFixed(2)} ${tv <= 0.15 ? '✓' : '✗'} |`)
  const pct = (h) => h.map((v) => Math.round(v * 100)).join(' · ')
  lines.push(
    '',
    'Hue shares (%, 12 bins of 30° from red):',
    '',
    `- Reference: ${pct(ref.hue)}`,
    `- Ours: ${pct(ours.hue)}`,
    '',
    `Measured share of the cropped frame (${cards ? 'cards only' : 'cards masked'}): reference ${(ref.measured * 100).toFixed(0)}%, ours ${(ours.measured * 100).toFixed(0)}%.`,
  )
  return { text: lines.join('\n'), tv }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const take = (flag) => {
    const at = args.indexOf(flag)
    return at >= 0 ? args.splice(at, 2)[1] : null
  }
  const jsonOut = take('--json')
  const overlay = take('--overlay')
  const at = args.indexOf('--inside')
  if (at >= 0) {
    args.splice(at, 1)
    inside = true
  }
  const [refDir, refMasks, oursDir, oursMasks] = args
  if (!oursMasks) {
    console.error('usage: compare-frames.mjs <refFrames> <refMasks> <ourFrames> <ourMasks> [--json out] [--overlay sheet.jpg]')
    process.exit(1)
  }
  const ref = await measureDir(refDir, refMasks)
  const ours = await measureDir(oursDir, oursMasks)
  const { text, tv } = table(ref, ours, inside)
  console.log(text)
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ ref, ours, tv }, null, 2))
  if (overlay) {
    await overlaySheet(refDir, refMasks, overlay.replace(/\.jpg$/, '-ref.jpg'))
    await overlaySheet(oursDir, oursMasks, overlay.replace(/\.jpg$/, '-ours.jpg'), 6)
  }
}
