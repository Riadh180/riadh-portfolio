// Turns hand-drawn card quads (docs/reference/work-masks-hand/quads.json) into per-frame
// mask PNGs for compare-frames.mjs (white = card). Quads are drawn on one keyframe per
// second and grown by ~20px to cover the camera's drift within that second.
//
//   node scripts/hand-masks.mjs <quads.json> <framesDir> <masksDir>
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const [quadsFile, framesDir, masksDir] = process.argv.slice(2)
const { keys } = JSON.parse(fs.readFileSync(quadsFile, 'utf8'))
const frames = fs.readdirSync(framesDir).filter((f) => f.endsWith('.png')).sort()
fs.rmSync(masksDir, { recursive: true, force: true })
fs.mkdirSync(masksDir, { recursive: true })
const UX = 1440 / 16
const UY = 900 / 10
for (const [i, f] of frames.entries()) {
  const quads = keys[Math.min(keys.length - 1, Math.round(i / 4))]
  const shapes = quads
    .map((q) => {
      const points = []
      for (let k = 0; k < q.length; k += 2) points.push(`${q[k] * UX},${q[k + 1] * UY}`)
      return `<polygon points="${points.join(' ')}" fill="#fff" stroke="#fff" stroke-width="40" stroke-linejoin="round"/>`
    })
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900"><rect width="1440" height="900" fill="#000"/>${shapes}</svg>`
  await sharp(Buffer.from(svg)).greyscale().png().toFile(path.join(masksDir, f))
}
console.log(`${frames.length} masks → ${masksDir}`)
