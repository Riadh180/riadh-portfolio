// EMPTY AREA per frame (compare-frames.mjs' rule, no card masks): the share of 16×16 tiles
// that are flat and dark. Stage 7's limit: no frame above 60%.
//
//   node scripts/empty-area.mjs <framesDir> [limit]
//
// compare-frames reads every frame at 1440×900; a portrait (phone) frame is turned a quarter
// first, so its tiles stay close to square instead of being squeezed four to one.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { measure } from './compare-frames.mjs'

const [, , dir, limitArg] = process.argv
const limit = Number(limitArg ?? 60)
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.png'))
  .sort()
const turned = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'))
const rows = []
for (const file of files) {
  let source = path.join(dir, file)
  const { width, height } = await sharp(source).metadata()
  if (height > width) {
    const copy = path.join(turned, file)
    await sharp(source).rotate(90).toFile(copy)
    source = copy
  }
  const m = await measure(source, path.join(dir, '__none__.png'))
  if (m) rows.push([file.replace(/\.png$/, ''), m.empty, m.luminance])
}
fs.rmSync(turned, { recursive: true, force: true })
const over = rows.filter(([, empty]) => empty > limit)
console.log(
  rows
    .map(([f, e, l]) => `${f} ${e.toFixed(0)}%${e > limit ? ' ✗' : ''} (lum ${l.toFixed(0)})`)
    .join('\n'),
)
console.log(`over ${limit}%: ${over.length} of ${rows.length}`)
