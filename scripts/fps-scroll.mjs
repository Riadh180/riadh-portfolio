// The fast-scroll part of the frame-rate gate on its own, with each 1 s window's place on the
// path, so a dip can be found (production build, Retina). Two loops of fast wheel scrolling.
//
//   node scripts/fps-scroll.mjs <url>      (LOWGPU=1: the integrated GPU; TIER=lite)
import puppeteer from 'puppeteer-core'

const [, , url = 'http://localhost:3100/'] = process.argv
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
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
if (process.env.TIER === 'lite') await page.evaluateOnNewDocument(() => (window.__tier = 'lite'))
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('signal-intro', '1')
  window.__frames = 0
  window.__worst = 0
  let last = performance.now()
  const tick = (now) => {
    window.__frames++
    window.__worst = Math.max(window.__worst, now - last)
    last = now
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(3000)
await page.mouse.move(720, 450)
await page.mouse.wheel({ deltaY: 1 })
await sleep(3000)
// As the gate: from the top, wheel hard to the end twice (the loop returns to the top).
const anchors = await page.evaluate(() => {
  const top = (id) => document.getElementById(id)?.offsetTop ?? 0
  const end = (id) =>
    top(id) + Math.max(0, (document.getElementById(id)?.offsetHeight ?? 0) - innerHeight)
  return [
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
})
const progressAt = (y) => {
  for (let i = 1; i < anchors.length; i++) {
    const [s0, p0] = anchors[i - 1]
    const [s1, p1] = anchors[i]
    if (y <= s1) return s1 > s0 ? p0 + ((y - s0) / (s1 - s0)) * (p1 - p0) : p1
  }
  return 7
}
const total = await page.evaluate(() => document.documentElement.scrollHeight)
const windows = []
let done = false
const scroller = (async () => {
  for (let loop = 0; loop < 2; loop++) {
    let y = 0
    while (y < total) {
      await page.mouse.wheel({ deltaY: 240 })
      y += 240
      await sleep(40)
    }
    await sleep(1500)
  }
  done = true
})()
while (!done) {
  const [f0, y0] = await page.evaluate(() => {
    window.__worst = 0
    return [window.__frames, scrollY]
  })
  const t0 = Date.now()
  await sleep(1000)
  const [f1, y1, worst] = await page.evaluate(() => [window.__frames, scrollY, window.__worst])
  const fps = (f1 - f0) / ((Date.now() - t0) / 1000)
  windows.push({
    fps: Math.round(fps * 10) / 10,
    from: progressAt(y0).toFixed(2),
    to: progressAt(y1).toFixed(2),
    worst: Math.round(worst),
  })
}
await scroller
console.log(
  windows
    .map(
      (w) => `${w.fps}${w.fps < 55 ? ' ✗' : ''} (${w.from}→${w.to}, longest frame ${w.worst} ms)`,
    )
    .join('\n'),
)
console.log(`min ${Math.min(...windows.map((w) => w.fps))}`)
await browser.close()
