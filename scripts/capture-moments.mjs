// Timed screenshots at one point of the journey (production build), for the review sheets:
// the hero's idle turn, a cursor swipe through a cloud, a transition played in time.
//
//   node scripts/capture-moments.mjs <url> <outDir> <progress> <shots> [phone]
//
// <shots>: comma-separated times in ms after the page has settled at <progress>, e.g.
// "0,1900,3800,5700". Each frame is named t<ms>.png. With a SWIPE, a time written "a500"
// is taken that long after the swipe ends (screenshots block the page's input, so shots
// during a swipe would slow it down): e.g. "0,a0,a500,a1000,a1500".
// Env: LOWGPU=1 (integrated GPU), DPR=2 (Retina), SETTLE=ms before the first shot (5000),
// SWIPE="x0,y0,x1,y1,durationMs,atMs" moves the pointer (a touch drag on phones) from
// (x0, y0) to (x1, y1) in px, starting at atMs on the same clock as the shots,
// POINTER="x,y" where the pointer rests before (default: the centre).
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [, , url, outDir, progressArg, shotsArg, device] = process.argv
if (!url || !outDir || !progressArg || !shotsArg) {
  console.error('usage: capture-moments.mjs <url> <outDir> <progress> <shots> [phone]')
  process.exit(1)
}
const phone = device === 'phone'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const shots = shotsArg.split(',')
const swipe = process.env.SWIPE?.split(',').map(Number)

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--enable-gpu',
    '--use-angle=metal',
    '--ignore-gpu-blocklist',
    ...(process.env.LOWGPU ? ['--force_low_power_gpu'] : []),
  ],
})
const page = await browser.newPage()
const width = phone ? 390 : 1440
const height = phone ? 844 : 900
await page.setViewport({
  width,
  height,
  deviceScaleFactor: Number(process.env.DPR ?? (phone ? 2 : 1)),
  isMobile: phone,
  hasTouch: phone,
})
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => ['error', 'warn'].includes(m.type()) && errors.push(m.text()))
// TIER=lite starts the visit on the lite tier (measurement hook in stores/tier.ts).
if (process.env.TIER === 'lite') await page.evaluateOnNewDocument(() => (window.__tier = 'lite'))
await page.evaluateOnNewDocument(() => sessionStorage.setItem('signal-intro', '1'))
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(2500)
const [restX, restY] = process.env.POINTER?.split(',').map(Number) ?? [width / 2, height / 2]
// Phones start the 3D on the first interaction: a tap there (a scripted wheel tick on an
// emulated phone leaves the smooth scroll pulling the page back to the top).
if (phone) await page.touchscreen.tap(width / 2, height * 0.35)
else {
  await page.mouse.move(restX, restY)
  await page.mouse.wheel({ deltaY: 1 })
}
await sleep(2500)

const progress = Number(progressArg)
const y = await page.evaluate((p) => {
  const top = (id) => document.getElementById(id)?.offsetTop ?? 0
  const end = (id) =>
    top(id) + Math.max(0, (document.getElementById(id)?.offsetHeight ?? 0) - window.innerHeight)
  const anchors = [
    [0, 0],
    [top('approach'), 1],
    [end('approach'), 1],
    [top('work'), 2],
    [end('work'), 3],
    [top('system'), 4],
    [end('system'), 4],
    [top('depth'), 5],
    [end('depth'), 5],
    [top('contact'), 6],
    [end('contact'), 6],
    [end('loop'), 7],
  ]
  for (let i = 1; i < anchors.length; i++) {
    const [s0, p0] = anchors[i - 1]
    const [s1, p1] = anchors[i]
    if (p <= p1 && p1 > p0) return s0 + ((p - p0) / (p1 - p0)) * (s1 - s0)
  }
  return anchors.at(-1)[0]
}, progress)
// The first jump on a phone can be undone while the 3D starts: set it until it holds.
for (let attempt = 0; attempt < 5; attempt++) {
  await page.evaluate((target) => window.scrollTo(0, target), y)
  await sleep(2500)
  const now = await page.evaluate(() => window.scrollY)
  if (Math.abs(now - y) < height * 0.15) break
}
await sleep(Number(process.env.SETTLE ?? 5000))

const start = Date.now()
const at = (ms) => sleep(Math.max(0, start + ms - Date.now()))

async function drag() {
  const [x0, y0, x1, y1, duration] = swipe
  const begin = Date.now()
  const steps = Math.max(2, Math.round(duration / 16))
  if (phone) await page.touchscreen.touchStart(x0, y0)
  for (let k = 1; k <= steps; k++) {
    const x = x0 + ((x1 - x0) * k) / steps
    const y = y0 + ((y1 - y0) * k) / steps
    if (phone) await page.touchscreen.touchMove(x, y)
    else await page.mouse.move(x, y)
    await sleep(Math.max(0, begin + (duration * k) / steps - Date.now()))
  }
  if (phone) await page.touchscreen.touchEnd()
  return Date.now()
}

let swipeEnd = null
for (const shot of shots) {
  if (shot.startsWith('a')) {
    swipeEnd ??= await (async () => {
      await at(swipe?.[5] ?? 0)
      return drag()
    })()
    await sleep(Math.max(0, swipeEnd + Number(shot.slice(1)) - Date.now()))
  } else {
    await at(Number(shot))
  }
  await page.screenshot({ path: path.join(outDir, `t${shot.padStart(5, '0')}.png`) })
}
console.log(`${shots.length} frames → ${outDir}`, errors.length ? `| ${errors[0]}` : '| clean')
await browser.close()
