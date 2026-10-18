// A short screen recording of the air answering swipes (production build, 1440×900, full
// tier), for docs/screens: each clip goes to its place, wakes it, settles, then records a
// beat before, the swipe, and the air settling after. Frames from the DevTools screencast
// are encoded to H.264 at 30 fps.
//
//   node scripts/record-swipe.mjs <out.mp4> <url> <progress:x0,y0,x1,y1:durationMs> …
//   (FFMPEG=path to ffmpeg; TIER=lite; SETTLE=ms recorded after each swipe, default 2400)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { goToProgress, playSwipe } from './swipe.mjs'

const [, , out, url, ...clips] = process.argv
if (!out || !url || !clips.length) {
  console.error('usage: record-swipe.mjs <out.mp4> <url> <progress:x0,y0,x1,y1:durationMs> …')
  process.exit(1)
}
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.evaluateOnNewDocument((lite) => {
  sessionStorage.setItem('signal-intro', '1')
  if (lite) window.__tier = 'lite'
}, process.env.TIER === 'lite')
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(2500)

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'record-swipe-'))
const frames = []
const cdp = await page.createCDPSession()
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  if (recording) {
    const file = path.join(dir, `${String(frames.length).padStart(5, '0')}.jpg`)
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    frames.push({ file, time: metadata.timestamp })
  }
  void cdp.send('Page.screencastFrameAck', { sessionId })
})
let recording = false

for (const clip of clips) {
  const [progress, line, duration] = clip.split(':')
  const [x0, y0, x1, y1] = line.split(',').map(Number)
  await goToProgress(page, Number(progress))
  await sleep(1500)
  // Wake what waits for the visitor's interaction, then let the air settle.
  for (let pass = 0; pass < 2; pass++) {
    await playSwipe(page, [x0, y0], [x1, y1], 1500, false, 100)
    await sleep(1500)
  }
  await sleep(3000)
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 })
  recording = true
  await playSwipe(page, [x0, y0], [x1, y1], Number(duration), false, 700)
  await sleep(Number(process.env.SETTLE ?? 2400))
  recording = false
  await cdp.send('Page.stopScreencast')
  // A clip boundary: hold the last frame a moment before the next clip.
  frames.push({ ...frames.at(-1), cut: true })
}
await browser.close()

// Variable frame times → a concat list with each frame's duration, encoded at 30 fps.
const lines = []
for (let i = 0; i < frames.length; i++) {
  const frame = frames[i]
  const next = frames[i + 1]
  const duration = frame.cut ? 0.25 : next && !next.cut ? next.time - frame.time : 1 / 30
  lines.push(`file '${frame.file}'`, `duration ${Math.max(1 / 60, duration).toFixed(4)}`)
}
lines.push(`file '${frames.at(-1).file}'`)
const list = path.join(dir, 'frames.txt')
fs.writeFileSync(list, `${lines.join('\n')}\n`)
execFileSync(FFMPEG, [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  list,
  '-r',
  '30',
  '-c:v',
  'libx264',
  '-preset',
  'slow',
  '-crf',
  '27',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  out,
])
fs.rmSync(dir, { recursive: true, force: true })
console.log(`${frames.length} frames → ${out}`)
