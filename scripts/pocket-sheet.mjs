// The pockets sheet: for each pocket, the reference | then the builds given, each at 1× and a
// zoom of the crop's middle (nearest-neighbour; ZOOM=4 for 4×, default 3×), labelled.
//
//   node scripts/pocket-sheet.mjs <out.jpg> <crops.json> <label=framesDir> …
//
// crops.json: [{ ref, refCrop, frame, crop }], crops in px of the 1440×900 frames.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const [, , out, cropsFile, ...builds] = process.argv
const crops = JSON.parse(fs.readFileSync(cropsFile, 'utf8'))
const W = 360
const H = 225
const label = (text) =>
  Buffer.from(
    `<svg width="${W}" height="${H}"><rect x="0" y="0" width="${Math.min(W, 12 + text.length * 8.4)}" height="22" fill="#000" fill-opacity="0.75"/><text x="6" y="16" fill="#fff" font-size="13" font-family="Menlo, monospace">${text}</text></svg>`,
  )
const Z = Number(process.env.ZOOM ?? 3)
const zoom = (c) => {
  const width = Math.round(W / Z)
  const height = Math.round(H / Z)
  return { left: c.left + Math.round((W - width) / 2), top: c.top + Math.round((H - height) / 2), width, height }
}
async function tile(file, crop, text, nearest) {
  const buf = await sharp(file)
    .extract(crop)
    .resize(W, H, { fit: 'cover', kernel: nearest ? 'nearest' : 'lanczos3' })
    .png()
    .toBuffer()
  return sharp(buf)
    .composite([{ input: label(text) }])
    .png()
    .toBuffer()
}
const rows = []
for (const [k, pocket] of crops.entries()) {
  const row = [
    await tile(pocket.ref, pocket.refCrop, `ref ${k + 1}`),
    await tile(pocket.ref, zoom(pocket.refCrop), `ref ${k + 1} ${Z}x`, true),
  ]
  for (const build of builds) {
    const [name, dir] = build.split('=')
    const file = path.join(dir, pocket.frame)
    row.push(await tile(file, pocket.crop, `${name} ${k + 1}`))
    row.push(await tile(file, zoom(pocket.crop), `${name} ${k + 1} ${Z}x`, true))
  }
  rows.push(row)
}
const gap = 4
const cols = Math.max(...rows.map((r) => r.length))
const layers = []
for (const [y, row] of rows.entries()) {
  for (const [x, input] of row.entries())
    layers.push({ input, left: x * (W + gap), top: y * (H + gap) })
}
await sharp({
  create: {
    width: cols * (W + gap) - gap,
    height: rows.length * (H + gap) - gap,
    channels: 3,
    background: '#000',
  },
})
  .composite(layers)
  .jpeg({ quality: 86 })
  .toFile(out)
console.log(out)
