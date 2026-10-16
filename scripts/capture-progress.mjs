// Screenshots at exact journey progress values (production build), for the review sheets.
// Progress runs 0 hero → 1 statement → 2 Work → 3 end of Work → 4 System → 5 Depth →
// 6 Contact → 7 loop; between anchors it maps linearly onto the page's scroll (as in
// SmoothScroll's measure()).
//
//   node scripts/capture-progress.mjs <url> <outDir> <from> <to> <step> [phone]
//   (LOWGPU=1: integrated GPU; DPR=2: Retina)
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [, , url, outDir, from, to, step, device] = process.argv
if (!url || !outDir || !step) {
  console.error('usage: capture-progress.mjs <url> <outDir> <from> <to> <step> [phone]')
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
// Phones start the 3D on the first interaction.
await page.mouse.move(width / 2, height / 2)
await page.mouse.wheel({ deltaY: 1 })
await sleep(2500)

const scrollFor = (progress) =>
  page.evaluate((p) => {
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

const count = Math.round((Number(to) - Number(from)) / Number(step)) + 1
for (let k = 0; k < count; k++) {
  const progress = Number(from) + k * Number(step)
  const y = await scrollFor(progress)
  await page.evaluate((target) => window.scrollTo(0, target), y)
  // The first jump on a phone can land while the 3D is still starting: set it again.
  if (k === 0) {
    await sleep(2500)
    await page.evaluate((target) => window.scrollTo(0, target), y)
  }
  await sleep(k === 0 ? 5000 : 3000)
  await page.screenshot({ path: path.join(outDir, `p${progress.toFixed(2)}.png`) })
}
console.log(`${count} frames → ${outDir}`, errors.length ? `| ${errors[0]}` : '| clean')
await browser.close()
