// Extracts the reference recording's Work segment for measuring: 4 fps, centre-cropped to
// 16:10 (the same vertical field as our 1440×900 frames), scaled to 1440×900, then through
// the shared H.264 step (h264.mjs). Needs ffmpeg (FFMPEG=/path/to/ffmpeg if not on PATH).
//
//   node scripts/extract-frames.mjs <video> <outDir> <start s> <end s>
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { compress, FFMPEG } from './h264.mjs'

const [, , file, outDir, start, end] = process.argv
if (!file || !outDir || start === undefined || end === undefined) {
  console.error('usage: extract-frames.mjs <video> <outDir> <start> <end>')
  process.exit(1)
}
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
execFileSync(FFMPEG, [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-ss', start, '-t', String(Number(end) - Number(start)), '-i', file,
  '-vf', "fps=4,crop='min(iw,ih*1.6)':'min(ih,iw/1.6)',scale=1440:900:flags=lanczos",
  path.join(outDir, 'raw-%03d.png'),
])
// Named by their time in the recording.
const raw = fs.readdirSync(outDir).filter((f) => f.startsWith('raw-')).sort()
raw.forEach((f, i) => {
  const time = (Number(start) + i / 4).toFixed(2)
  fs.renameSync(path.join(outDir, f), path.join(outDir, `frame-${String(i).padStart(3, '0')}-${time}s.png`))
})
compress(outDir)
console.log(`${raw.length} frames → ${outDir}`)
