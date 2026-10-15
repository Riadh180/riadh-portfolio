// One table of the Work metrics across stages (JSON files written by compare-frames.mjs),
// each against the reference, for docs/screens/metrics-work.md.
//
//   node scripts/metrics-report.mjs <label=file.json> [<label=file.json> …]
import fs from 'node:fs'

const stages = process.argv.slice(2).map((item) => {
  const at = item.indexOf('=')
  return { label: item.slice(0, at), data: JSON.parse(fs.readFileSync(item.slice(at + 1), 'utf8')) }
})
const ref = stages[0].data.ref
const rows = [
  ['Mean luminance (0–255)', 'luminance', 1],
  ['Contrast (luma std dev)', 'contrast', 1],
  ['5th percentile', 'p5', 1],
  ['95th percentile', 'p95', 1],
  ['Mean saturation', 'saturation', 3],
  ['EMPTY AREA (% tiles)', 'empty', 1],
  ['SPARKLE (points / MP)', 'sparkle', 0],
]
const cell = (value, target, digits) => {
  const delta = ((value - target) / target) * 100
  return `${value.toFixed(digits)} (${delta >= 0 ? '+' : ''}${delta.toFixed(0)}% ${Math.abs(delta) <= 15 ? '✓' : '✗'})`
}
const lines = [
  `| Metric | Reference | ${stages.map((s) => s.label).join(' | ')} |`,
  `|---|---|${stages.map(() => '---').join('|')}|`,
]
for (const [label, key, digits] of rows) {
  lines.push(`| ${label} | ${ref[key].toFixed(digits)} | ${stages.map((s) => cell(s.data.ours[key], ref[key], digits)).join(' | ')} |`)
}
lines.push(
  `| Hue distance (TV, 0–1, ≤ 0.15 ✓) | 0 | ${stages.map((s) => `${s.data.tv.toFixed(2)} ${s.data.tv <= 0.15 ? '✓' : '✗'}`).join(' | ')} |`,
)
const pct = (h) => h.map((v) => Math.round(v * 100)).join(' · ')
lines.push('', 'Hue shares (%, 12 bins of 30° from red: red, orange, yellow, … cyan 180°, blue 210°, blue-violet 240°, violet 270°, magenta 300°):', '', `- Reference: ${pct(ref.hue)}`)
for (const s of stages) lines.push(`- ${s.label}: ${pct(s.data.ours.hue)}`)
console.log(lines.join('\n'))
