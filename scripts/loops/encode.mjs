// Turns a folder of frames into a card loop (look round, Stage 2 media spec): a seamless loop
// (the second after the loop's end crossfades into its start), 1280×800 H.264 MP4 and VP9
// WebM (each at most 2.5 MB), a 640×400 pair for the lite tier and phones (each at most
// 0.8 MB: a phone's data), no audio, and a poster (the loop's first frame), all in
// public/work/<slug>/.
//
// The frames (frame-00000.png …, at `fps`, 16:10, any size: they are scaled to 1280×800) cover
// `seconds + crossfade`. `grade` is an ffmpeg filter chain applied to every frame (colour, grain).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'
/** The largest file allowed per variant width. */
const MAX_BYTES = { 1280: 2.5e6, 640: 0.8e6 }
/** Quality per codec (lower is better), raised until the file fits. */
const QUALITY = { mp4: 24, webm: 36 }

const run = (args) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args])

/** Encodes one variant, raising the CRF until it fits the budget. */
function encode(source, file, width, codec) {
  for (let crf = QUALITY[codec]; crf < QUALITY[codec] + 16; crf += 2) {
    const scale = ['-vf', `scale=${width}:-2:flags=lanczos`]
    const video =
      codec === 'mp4'
        ? [
            '-c:v',
            'libx264',
            '-preset',
            'slow',
            '-crf',
            `${crf}`,
            '-pix_fmt',
            'yuv420p',
            '-movflags',
            '+faststart',
          ]
        : [
            '-c:v',
            'libvpx-vp9',
            '-crf',
            `${crf}`,
            '-b:v',
            '0',
            '-row-mt',
            '1',
            '-deadline',
            'good',
            '-cpu-used',
            '2',
            '-pix_fmt',
            'yuv420p',
          ]
    run(['-i', source, ...scale, ...video, '-an', file])
    const bytes = fs.statSync(file).size
    if (bytes <= MAX_BYTES[width]) return { file: path.basename(file), bytes, crf }
  }
  throw new Error(`${file} stays over ${MAX_BYTES[width]} bytes`)
}

export function encodeLoop({ frames, fps = 30, seconds, crossfade = 1, out, grade = 'null' }) {
  fs.mkdirSync(out, { recursive: true })
  const loop = Math.round(seconds * fps)
  const fade = Math.round(crossfade * fps)
  const available = fs.readdirSync(frames).filter((f) => /^frame-\d+\.png$/.test(f)).length
  if (available < loop + fade)
    throw new Error(`${frames}: ${available} frames, need ${loop + fade}`)
  // The master: lossless, graded, with the seam crossfaded (the tail that follows the loop's
  // last frame fades into its first second).
  const master = path.join(frames, 'master.mkv')
  const graph = [
    `[0:v]scale=1280:800:flags=lanczos,${grade},format=gbrp,split=3[a][b][c]`,
    `[a]trim=start_frame=0:end_frame=${fade},setpts=PTS-STARTPTS[head]`,
    `[b]trim=start_frame=${loop}:end_frame=${loop + fade},setpts=PTS-STARTPTS[tail]`,
    `[c]trim=start_frame=${fade}:end_frame=${loop},setpts=PTS-STARTPTS[body]`,
    `[tail][head]blend=all_expr='A*(1-T/${crossfade})+B*(T/${crossfade})'[seam]`,
    `[seam][body]concat=n=2:v=1:a=0[loop]`,
  ].join(';')
  run([
    '-framerate',
    `${fps}`,
    '-i',
    path.join(frames, 'frame-%05d.png'),
    '-filter_complex',
    graph,
    '-map',
    '[loop]',
    '-c:v',
    'ffv1',
    master,
  ])
  const files = [
    encode(master, path.join(out, 'loop.mp4'), 1280, 'mp4'),
    encode(master, path.join(out, 'loop.webm'), 1280, 'webm'),
    encode(master, path.join(out, 'loop-640.mp4'), 640, 'mp4'),
    encode(master, path.join(out, 'loop-640.webm'), 640, 'webm'),
  ]
  run(['-i', master, '-frames:v', '1', '-q:v', '4', path.join(out, 'poster.jpg')])
  files.push({ file: 'poster.jpg', bytes: fs.statSync(path.join(out, 'poster.jpg')).size })
  fs.rmSync(master)
  return files
}
