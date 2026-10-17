// Frames of the air answering one swipe (production build), for the cursor sheet: before the
// swipe, halfway through it, at its end, and 0.3 / 0.8 / 1.5 / 2.5 s after it ended.
//
//   node scripts/capture-swipe.mjs <url> <outDir> <progress> <x0,y0,x1,y1> <durationMs> [phone]
//   (TIER=lite, LOWGPU=1, SETTLE=ms at the place before the swipe: 5000)
//
// Two slow passes along the same path first wake what waits for the visitor's interaction
// (on phones the column only shows after a second touch), so every frame shows the same
// scene; the air settles before the swipe (SETTLE).
//
// The swipe is played inside the page (scripts/swipe.mjs: a pointer move, a touch drag on
// phones), so its speed is exact; frames are named before, during, end, t0300 … t2500.
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { goToProgress, playSwipe } from './swipe.mjs'

const [, , url, outDir, progressArg, line, durationArg, device] = process.argv
if (!url || !outDir || !line || !durationArg) {
  console.error(
    'usage: capture-swipe.mjs <url> <outDir> <progress> <x0,y0,x1,y1> <durationMs> [phone]',
  )
  process.exit(1)
}
const phone = device === 'phone'
const [x0, y0, x1, y1] = line.split(',').map(Number)
const duration = Number(durationArg)
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const args = ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu']
if (process.env.LOWGPU) args.push('--force_low_power_gpu')
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args })
const page = await browser.newPage()
await page.setViewport({
  width: phone ? 390 : 1440,
  height: phone ? 844 : 900,
  deviceScaleFactor: 1,
  isMobile: phone,
  hasTouch: phone,
})
await page.evaluateOnNewDocument((lite) => {
  sessionStorage.setItem('signal-intro', '1')
  if (lite) window.__tier = 'lite'
}, process.env.TIER === 'lite')
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(2500)
await goToProgress(page, Number(progressArg))
for (let pass = 0; pass < 2; pass++) {
  await playSwipe(page, [x0, y0], [x1, y1], 1500, phone, 100)
  await sleep(1500)
}
await sleep(Number(process.env.SETTLE ?? 5000))

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
const REST = 1200
const shots = [
  ['before', -300],
  ['during', duration / 2],
  ['end', duration],
  ...[300, 800, 1500, 2500].map((t) => [`t${String(t).padStart(4, '0')}`, duration + t]),
]
const start = Date.now() + REST
const swipe = playSwipe(page, [x0, y0], [x1, y1], duration, phone, REST)
for (const [name, at] of shots) {
  await sleep(Math.max(0, start + at - Date.now()))
  await page.screenshot({ path: path.join(outDir, `${name}.png`) })
}
await swipe
console.log(`${shots.length} frames → ${outDir}`)
await browser.close()
