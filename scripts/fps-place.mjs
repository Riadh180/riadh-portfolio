// A quick frame-rate probe at one place (production build, Retina): the windows in between
// the full gate runs (scripts/fps.mjs).
//
//   node scripts/fps-place.mjs <url> <#place | progress> <seconds> [phone]
//
// Arrives by the nav (a hash, e.g. #work) or by scrolling to a journey progress (e.g. 2.4),
// settles, then counts frames in 2s windows. Env: LOWGPU=1 (the integrated GPU),
// MOVE=1 keeps the pointer moving in slow figure-eights the whole time.
import puppeteer from 'puppeteer-core'

const [, , url, where = '#signal', seconds = '10', device] = process.argv
const phone = device === 'phone'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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
await page.setViewport({ width, height, deviceScaleFactor: phone ? 3 : 2, isMobile: phone, hasTouch: phone })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
// TIER=lite starts the visit on the lite tier (measurement hook in stores/tier.ts).
if (process.env.TIER === 'lite') await page.evaluateOnNewDocument(() => (window.__tier = 'lite'))
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('signal-intro', '1')
  window.__frames = 0
  const tick = () => {
    window.__frames++
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(3000)
await page.mouse.move(width / 2, height / 2)
await page.mouse.wheel({ deltaY: 1 })
await sleep(3000)
if (where.startsWith('#')) {
  await page.evaluate((h) => {
    const a = document.createElement('a')
    a.href = h
    document.body.append(a)
    a.click()
    a.remove()
  }, where)
} else {
  await page.evaluate((p) => {
    const top = (id) => document.getElementById(id)?.offsetTop ?? 0
    const end = (id) =>
      top(id) + Math.max(0, (document.getElementById(id)?.offsetHeight ?? 0) - window.innerHeight)
    const anchors = [
      [0, 0], [top('approach'), 1], [end('approach'), 1], [top('work'), 2], [end('work'), 3],
      [top('system'), 4], [end('system'), 4], [top('depth'), 5], [end('depth'), 5],
      [top('contact'), 6], [end('contact'), 6], [end('loop'), 7],
    ]
    for (let i = 1; i < anchors.length; i++) {
      const [s0, p0] = anchors[i - 1]
      const [s1, p1] = anchors[i]
      if (p <= p1 && p1 > p0) return window.scrollTo(0, s0 + ((p - p0) / (p1 - p0)) * (s1 - s0))
    }
  }, Number(where))
}
await sleep(4500)

let moving = !!process.env.MOVE
const mover = (async () => {
  let t = 0
  while (moving) {
    t += 0.05
    await page.mouse.move(width * (0.5 + 0.32 * Math.sin(t)), height * (0.5 + 0.25 * Math.sin(t * 2)))
    await sleep(16)
  }
})()

const frames = () => page.evaluate(() => window.__frames)
const windows = []
for (let k = 0; k < Math.round(Number(seconds) / 2); k++) {
  const f0 = await frames()
  const t0 = Date.now()
  await sleep(2000)
  windows.push(Math.round((((await frames()) - f0) / ((Date.now() - t0) / 1000)) * 10) / 10)
}
moving = false
await mover
console.log(JSON.stringify({ where, windows, min: Math.min(...windows), errors: errors.slice(0, 2) }))
await browser.close()
