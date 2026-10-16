// Frame-rate gate (production build, Retina): every place, down the Work cards, the hero
// idling for 60s, and a fast scroll through two loops of the world.
//
//   node scripts/fps.mjs <url> [phone]      (LOWGPU=1: the integrated GPU, i.e. the lite tier)
//
// Frames are counted with requestAnimationFrame inside the page; each window's FPS is
// frames / seconds. Prints one JSON object.
import puppeteer from 'puppeteer-core'

const [, , url, device] = process.argv
if (!url) {
  console.error('usage: fps.mjs <url> [phone]')
  process.exit(1)
}
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

const frames = () => page.evaluate(() => window.__frames)
async function measure(ms) {
  const f0 = await frames()
  const t0 = Date.now()
  await sleep(ms)
  return ((await frames()) - f0) / ((Date.now() - t0) / 1000)
}
const go = async (hash) => {
  await page.evaluate((h) => {
    const a = document.createElement('a')
    a.href = h
    document.body.append(a)
    a.click()
    a.remove()
  }, hash)
}
const round = (v) => Math.round(v * 10) / 10
const result = {}

// Idle hero, 60s in 5s windows.
result.idleHero = []
for (let k = 0; k < 12; k++) result.idleHero.push(round(await measure(5000)))

// Every place (arrive, settle 2s, measure 4s).
result.places = {}
for (const place of ['approach', 'work', 'system', 'depth', 'contact', 'signal']) {
  await go(`#${place}`)
  await sleep(4000)
  result.places[place] = round(await measure(4000))
}

// Down the Work cards: one gesture per stop.
await go('#work')
await sleep(4500)
result.workCards = []
for (let step = 0; step < 7; step++) {
  result.workCards.push(round(await measure(2400)))
  for (let k = 0; k < 4; k++) {
    await page.mouse.wheel({ deltaY: 100 })
    await sleep(60)
  }
}

// Fast scroll through two loops (to the top, then wheel hard; 1s windows).
await go('#signal')
await sleep(4000)
const windows = []
const total = await page.evaluate(() => document.documentElement.scrollHeight)
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
})()
let done = false
void scroller.then(() => (done = true))
while (!done) windows.push(await measure(1000))
windows.sort((a, b) => a - b)
result.fastScroll = {
  windows: windows.length,
  median: round(windows[Math.floor(windows.length / 2)]),
  p10: round(windows[Math.floor(windows.length * 0.1)]),
  min: round(windows[0]),
}
result.errors = errors.slice(0, 3)
console.log(JSON.stringify(result))
await browser.close()
