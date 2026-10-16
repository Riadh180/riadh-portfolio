// How many job cards each Work frame shows (Stage 4's gallery target: 3–4 cards in ≥ 80% of
// frames), from the projected corners record-work.mjs saves (masks dir, cards.json).
//
//   node scripts/count-cards.mjs <cards.json> [minShare]
//
// A card counts when the part of it inside the 1440×900 frame covers at least `minShare`
// (default 1.5%) of the frame. Also reports the largest card's share of the frame width.
import fs from 'node:fs'

const [, , file, minArg] = process.argv
const minShare = Number(minArg ?? 0.015)
const W = 1440
const H = 900
const frames = JSON.parse(fs.readFileSync(file, 'utf8'))

/** Convex hull (monotone chain). */
function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list) => {
    const out = []
    for (const q of list) {
      while (out.length >= 2 && cross(out.at(-2), out.at(-1), q) <= 0) out.pop()
      out.push(q)
    }
    return out.slice(0, -1)
  }
  return half(p).concat(half(p.reverse()))
}
/** Clip a convex polygon to the frame (Sutherland–Hodgman). */
function clip(poly) {
  const edges = [
    (q) => q[0] >= 0, (q) => q[0] <= W, (q) => q[1] >= 0, (q) => q[1] <= H,
  ]
  const cut = [
    (a, b) => { const t = (0 - a[0]) / (b[0] - a[0]); return [0, a[1] + t * (b[1] - a[1])] },
    (a, b) => { const t = (W - a[0]) / (b[0] - a[0]); return [W, a[1] + t * (b[1] - a[1])] },
    (a, b) => { const t = (0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), 0] },
    (a, b) => { const t = (H - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), H] },
  ]
  let out = poly
  for (let e = 0; e < 4; e++) {
    const input = out
    out = []
    for (let i = 0; i < input.length; i++) {
      const a = input[i]
      const b = input[(i + 1) % input.length]
      const ina = edges[e](a)
      const inb = edges[e](b)
      if (ina && inb) out.push(b)
      else if (ina && !inb) out.push(cut[e](a, b))
      else if (!ina && inb) out.push(cut[e](a, b), b)
    }
    if (!out.length) break
  }
  return out
}
const area = (poly) =>
  Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p[0] * q[1] - q[0] * p[1] }, 0)) / 2

const counts = []
const widest = []
for (const { corners } of frames) {
  let visible = 0
  let wide = 0
  for (const flat of Object.values(corners)) {
    const points = []
    for (let k = 0; k < flat.length; k += 2) points.push([flat[k], flat[k + 1]])
    const inside = clip(hull(points))
    if (inside.length < 3) continue
    if (area(inside) / (W * H) >= minShare) visible++
    const xs = inside.map((p) => p[0])
    wide = Math.max(wide, (Math.max(...xs) - Math.min(...xs)) / W)
  }
  counts.push(visible)
  widest.push(wide)
}
const share = (test) => Math.round((counts.filter(test).length / counts.length) * 100)
const histogram = {}
for (const c of counts) histogram[c] = (histogram[c] ?? 0) + 1
console.log(
  JSON.stringify({
    frames: counts.length,
    histogram,
    'three or four (%)': share((c) => c >= 3 && c <= 4),
    'three or more (%)': share((c) => c >= 3),
    'widest card, median share of the width': Math.round(widest.sort((a, b) => a - b)[Math.floor(widest.length / 2)] * 100) / 100,
  }),
)
