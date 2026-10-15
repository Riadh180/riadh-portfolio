// The compression step both recordings share before they are measured: a folder of 4 fps
// frames is encoded to H.264 and decoded back into the same folder, so the reference and our
// frames carry the same codec artefacts (softened grain, blocky darks, smeared sparkle).
//
// Bitrate: the reference recording is 20.6 Mb/s at 3334×1708 and 24 fps, ~0.85 Mbit per
// frame; scaled to 1440×900 that is ~0.2 Mbit per frame, 0.8 Mb/s at 4 fps.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'
const BITRATE = '800k'

export function compress(dir) {
  const frames = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort()
  if (!frames.length) throw new Error(`no frames in ${dir}`)
  const list = path.join(dir, 'frames.txt')
  fs.writeFileSync(list, frames.map((f) => `file '${f}'\nduration 0.25`).join('\n') + '\n')
  const video = path.join(dir, 'encoded.mp4')
  const run = (args) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args])
  run(['-f', 'concat', '-safe', '0', '-i', list, '-r', '4', '-c:v', 'libx264', '-preset', 'medium',
    '-b:v', BITRATE, '-maxrate', BITRATE, '-bufsize', '1600k', '-pix_fmt', 'yuv420p', video])
  const decoded = path.join(dir, 'decoded')
  fs.rmSync(decoded, { recursive: true, force: true })
  fs.mkdirSync(decoded)
  run(['-i', video, '-vsync', '0', path.join(decoded, '%04d.png')])
  const out = fs.readdirSync(decoded).sort()
  // Back over the originals, in order (same names, so masks and labels still line up).
  frames.forEach((f, i) => {
    const source = out[Math.min(i, out.length - 1)]
    fs.renameSync(path.join(decoded, source), path.join(dir, f))
  })
  fs.rmSync(decoded, { recursive: true, force: true })
  fs.rmSync(list)
  return video
}
