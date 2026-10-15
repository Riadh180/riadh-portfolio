// Screenshots of Work at each card stop (production build), for the review sheets: the
// camera turns 60° round the column from one stop to the next, so stops 1, 3, 4 and 6 show
// the column from 0°, 120°, 180° and 300°.
//
//   node scripts/capture-stops.mjs <url> <outDir> [phone]      (LOWGPU=1: integrated GPU)
//
// Flies to Work by the nav, then one wheel gesture at a time (the scroll's magnet settles on
// the next stop); after each settle, the card nearest the frame's centre names the shot.
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [, , url, outDir, device] = process.argv
if (!url || !outDir) {
  console.error('usage: capture-stops.mjs <url> <outDir> [phone]')
  process.exit(1)
}
const phone = device === 'phone'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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
await page.setViewport({ width, height, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('signal-intro', '1')
  window.__cardCorners = {}
})
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(2500)
// Phones start the 3D on the first interaction.
await page.mouse.move(width / 2, height / 2)
await page.mouse.wheel({ deltaY: 1 })
await sleep(2500)
await page.evaluate(() => {
  const link = document.createElement('a')
  link.href = '#work'
  document.body.append(link)
  link.click()
  link.remove()
})
await sleep(5000)

const centred = () =>
  page.evaluate(
    (w, h) => {
      let best = null
      let bestDistance = Infinity
      for (const [slug, flat] of Object.entries(window.__cardCorners ?? {})) {
        let x = 0
        let y = 0
        for (let k = 0; k < flat.length; k += 2) {
          x += flat[k]
          y += flat[k + 1]
        }
        const d = Math.hypot(x / (flat.length / 2) - w * 0.55, y / (flat.length / 2) - h / 2)
        if (d < bestDistance) {
          bestDistance = d
          best = slug
        }
      }
      return best
    },
    width,
    height,
  )

const seen = new Set()
for (let step = 0; step < 14 && seen.size < 6; step++) {
  const slug = await centred()
  if (slug && !seen.has(slug)) {
    seen.add(slug)
    await page.screenshot({ path: path.join(outDir, `${seen.size}-${slug}.png`) })
  }
  for (let k = 0; k < 4; k++) {
    await page.mouse.wheel({ deltaY: phone ? 120 : 100 })
    await sleep(60)
  }
  await sleep(2600)
}
console.log(`${seen.size} stops → ${outDir}`, errors.length ? `| ${errors[0]}` : '| clean')
await browser.close()
