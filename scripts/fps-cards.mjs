// The "down the Work cards" part of the frame-rate gate on its own (production build, Retina):
// fly to Work by the nav, then one wheel gesture per stop, a 2.4 s window at each.
//
//   node scripts/fps-cards.mjs <url>      (LOWGPU=1: the integrated GPU; TIER=lite)
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
  const tick = () => {
    window.__frames++
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(3000)
await page.mouse.move(720, 450)
await page.mouse.wheel({ deltaY: 1 })
await sleep(3000)
await page.evaluate(() => {
  const a = document.createElement('a')
  a.href = '#work'
  document.body.append(a)
  a.click()
  a.remove()
})
await sleep(4500)
const frames = () => page.evaluate(() => window.__frames)
const windows = []
for (let step = 0; step < 7; step++) {
  const f0 = await frames()
  const t0 = Date.now()
  await sleep(2400)
  windows.push(Math.round((((await frames()) - f0) / ((Date.now() - t0) / 1000)) * 10) / 10)
  for (let k = 0; k < 4; k++) {
    await page.mouse.wheel({ deltaY: 100 })
    await sleep(60)
  }
}
console.log(JSON.stringify({ windows, min: Math.min(...windows) }))
await browser.close()
