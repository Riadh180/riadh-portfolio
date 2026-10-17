// The cursor sheet: one row per swipe (scripts/capture-swipe.mjs frames), a 16:10 crop round
// the swipe's path: before, during (the path drawn faintly), +0.3 / 0.8 / 1.5 / 2.5 s after,
// and "moved": +0.3 s in red over the frame before in cyan (a moved bead shows as a red /
// cyan pair, a still one grey).
//
//   node scripts/swipe-sheet.mjs <out.jpg> <label=framesDir:x0,y0,x1,y1[:cropWidth]> …
//
// cropWidth: a closer crop (px wide, 16:10, round the path's middle), for sparse dust.
import sharp from 'sharp'

const [, , out, ...rows] = process.argv
if (!out || !rows.length) {
  console.error('usage: swipe-sheet.mjs <out.jpg> <label=framesDir:x0,y0,x1,y1> …')
  process.exit(1)
}
const COLUMNS = [
  ['before', 'before'],
  ['during', 'during'],
  ['+0.3 s', 't0300'],
  ['+0.8 s', 't0800'],
  ['+1.5 s', 't1500'],
  ['+2.5 s', 't2500'],
  ['moved', 'moved'],
]
const TILE = { width: 400, height: 250 }
const GAP = 4
const PAD = 110
const label = (text) =>
  Buffer.from(
    `<svg width="${TILE.width}" height="26"><rect width="${TILE.width}" height="26" fill="#000" fill-opacity="0.6"/><text x="8" y="18" font-size="14" fill="#fff" font-family="monospace">${text}</text></svg>`,
  )

/** +0.3 s in the red channel over the frame before in green and blue. */
async function moved(dir, box) {
  const grey = (file) => sharp(`${dir}/${file}.png`).extract(box).greyscale().raw().toBuffer()
  const [after, before] = await Promise.all([grey('t0300'), grey('before')])
  const rgb = Buffer.alloc(box.width * box.height * 3)
  for (let i = 0; i < box.width * box.height; i++) {
    rgb[i * 3] = after[i]
    rgb[i * 3 + 1] = before[i]
    rgb[i * 3 + 2] = before[i]
  }
  return sharp(rgb, { raw: { width: box.width, height: box.height, channels: 3 } })
    .linear(1.6, 0)
    .png()
    .toBuffer()
}

const strips = []
for (const row of rows) {
  const [name, rest] = row.split(/=(.*)/s)
  const [dir, line, zoom] = rest.split(/:(?=[\d,.]+(?::\d+)?$)|:(?=\d+$)/)
  const [x0, y0, x1, y1] = line.split(',').map(Number)
  const meta = await sharp(`${dir}/before.png`).metadata()
  // A 16:10 box round the path, padded, kept inside the frame.
  const width = Math.round(
    Math.min(
      meta.width,
      zoom
        ? Number(zoom)
        : Math.max(Math.abs(x1 - x0) + PAD * 2, ((Math.abs(y1 - y0) + PAD * 2) * 16) / 10),
    ),
  )
  const height = Math.min(meta.height, Math.round((width * 10) / 16))
  const clamp = (v, size, max) => Math.round(Math.min(max - size, Math.max(0, v - size / 2)))
  const left = clamp((x0 + x1) / 2, width, meta.width)
  const top = clamp((y0 + y1) / 2, height, meta.height)
  const tiles = []
  for (const [title, file] of COLUMNS) {
    const path =
      file === 'during'
        ? [
            {
              input: Buffer.from(
                `<svg width="${width}" height="${height}"><line x1="${x0 - left}" y1="${y0 - top}" x2="${x1 - left}" y2="${y1 - top}" stroke="#fff" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="4 6"/></svg>`,
              ),
              left: 0,
              top: 0,
            },
          ]
        : []
    const crop =
      file === 'moved'
        ? await moved(dir, { left, top, width, height })
        : await sharp(`${dir}/${file}.png`)
            .extract({ left, top, width, height })
            .composite(path)
            .png()
            .toBuffer()
    tiles.push(
      await sharp(crop)
        .resize(TILE.width, TILE.height)
        .composite([{ input: label(`${name} · ${title}`), left: 0, top: 0 }])
        .png()
        .toBuffer(),
    )
  }
  strips.push(tiles)
}
await sharp({
  create: {
    width: COLUMNS.length * (TILE.width + GAP) - GAP,
    height: strips.length * (TILE.height + GAP) - GAP,
    channels: 3,
    background: '#000',
  },
})
  .composite(
    strips.flatMap((tiles, r) =>
      tiles.map((input, c) => ({
        input,
        left: c * (TILE.width + GAP),
        top: r * (TILE.height + GAP),
      })),
    ),
  )
  .jpeg({ quality: 86 })
  .toFile(out)
console.log(out)
