// The "opening and closing cards" part of the frame-rate gate (production build, Retina):
// fly to Work by the nav, then open a card from the list, hold it open, close it (Esc), four
// cards in turn, counting frames in every 1 s window throughout (the fly-in, the dissolve,
// the backdrop, the close).
//
//   node scripts/fps-open.mjs <url>      (LOWGPU=1: the integrated GPU; TIER=lite)
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

const windows = []
let counting = true
const count = (async () => {
  while (counting) {
    const f0 = await page.evaluate(() => window.__frames)
    const t0 = Date.now()
    await sleep(1000)
    const f1 = await page.evaluate(() => window.__frames)
    windows.push(Math.round(((f1 - f0) / ((Date.now() - t0) / 1000)) * 10) / 10)
  }
})()
for (const slug of ['bliggit', 'kuehne-nagel', 'eon', 'licht-und-schatten']) {
  await page.evaluate((s) => document.querySelector(`button[data-work="${s}"]`)?.click(), slug)
  await sleep(3000)
  await page.keyboard.press('Escape')
  await sleep(2500)
}
counting = false
await count
console.log(JSON.stringify({ windows, min: Math.min(...windows) }))
await browser.close()
