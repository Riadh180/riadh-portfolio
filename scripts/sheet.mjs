// Labelled contact sheets for side-by-side reviews.
//
//   node scripts/sheet.mjs <out.jpg> <columns> <tileWidth> <label=image> [<label=image> …]
//
// Tiles keep 16:10; an image of another shape is centre-cropped to it. A label "-" leaves
// the tile unlabelled; an image "-" leaves an empty tile.
import sharp from 'sharp'

const [, , out, columns, tileWidth, ...items] = process.argv
if (!out || !items.length) {
  console.error('usage: sheet.mjs <out.jpg> <columns> <tileWidth> <label=image> …')
  process.exit(1)
}
const cols = Number(columns)
const w = Number(tileWidth)
const h = Math.round((w * 10) / 16)
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const tiles = []
for (const item of items) {
  const at = item.indexOf('=')
  const label = item.slice(0, at)
  const file = item.slice(at + 1)
  if (file === '-') {
    tiles.push(null)
    continue
  }
  const base = await sharp(file).resize(w, h, { fit: 'cover' }).png().toBuffer()
  const caption =
    label === '-'
      ? []
      : [
          {
            input: Buffer.from(
              `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${Math.min(w, 14 + label.length * 9)}" height="24" fill="#000" fill-opacity="0.75"/><text x="7" y="17" fill="#fff" font-size="14" font-family="Menlo, monospace">${escape(label)}</text></svg>`,
            ),
          },
        ]
  tiles.push(await sharp(base).composite(caption).png().toBuffer())
}
const rows = Math.ceil(tiles.length / cols)
const gap = 4
await sharp({
  create: { width: cols * w + (cols - 1) * gap, height: rows * h + (rows - 1) * gap, channels: 3, background: '#000' },
})
  .composite(
    tiles.flatMap((input, k) =>
      input ? [{ input, left: (k % cols) * (w + gap), top: Math.floor(k / cols) * (h + gap) }] : [],
    ),
  )
  .jpeg({ quality: 86 })
  .toFile(out)
console.log(out)
