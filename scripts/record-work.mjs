// Records our Work place the way the reference was recorded: a visitor scrolling down past
// all six cards. Production build, 1440×900, DPR 1, full tier (the discrete GPU).
//
//   node scripts/record-work.mjs <url> <framesDir> <masksDir>     (LOWGPU=1: integrated GPU)
//
// Flies to Work by the nav, then scrolls at a fixed scripted speed (4 wheel notches of
// 100px every 2s, the same every run) until the section ends. A frame every 250ms (4 fps),
// with each card's projected corners (window.__cardCorners, set by WorkCards) turned into a
// card mask. The frames then go through the same H.264 step as the reference (h264.mjs).
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { compress } from './h264.mjs'

const [, , url, outDir, masksDir] = process.argv
if (!url || !outDir || !masksDir) {
  console.error('usage: record-work.mjs <url> <framesDir> <masksDir>')
  process.exit(1)
}
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Convex hull of the card's projected box corners, grown by 12px. */
function hull(points) {
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list) => {
    const out = []
    for (const p of list) {
      while (out.length >= 2 && cross(out.at(-2), out.at(-1), p) <= 0) out.pop()
      out.push(p)
    }
    return out.slice(0, -1)
  }
  return half(points).concat(half([...points].reverse()))
}
async function writeMask(file, corners) {
  const shapes = Object.values(corners)
    .map((flat) => {
      const points = []
      for (let k = 0; k < flat.length; k += 2) points.push([flat[k], flat[k + 1]])
      const poly = hull(points).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      return `<polygon points="${poly.join(' ')}" fill="#fff" stroke="#fff" stroke-width="24" stroke-linejoin="round"/>`
    })
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900"><rect width="1440" height="900" fill="#000"/>${shapes}</svg>`
  await sharp(Buffer.from(svg)).greyscale().png().toFile(file)
}

for (const dir of [outDir, masksDir]) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
}
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
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => ['error', 'warn'].includes(m.type()) && errors.push(m.text()))
// Skip the preloader (as on a repeat visit); ask the cards for their corners.
// TIER=lite starts the visit on the lite tier (measurement hook in stores/tier.ts).
if (process.env.TIER === 'lite') await page.evaluateOnNewDocument(() => (window.__tier = 'lite'))
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('signal-intro', '1')
  window.__cardCorners = {}
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
await page.evaluate(() => {
  const link = document.createElement('a')
  link.href = '#work'
  document.body.append(link)
  link.click()
  link.remove()
})
await sleep(4500)

const end = await page.evaluate(() => {
  const section = document.getElementById('work')
  if (!section) return 0
  return section.getBoundingClientRect().bottom + window.scrollY - window.innerHeight * 1.4
})
let scrolling = true
const scroller = (async () => {
  while (scrolling) {
    for (let k = 0; k < 4; k++) {
      await page.mouse.wheel({ deltaY: 100 })
      await sleep(70)
    }
    await sleep(1720)
  }
})()

let frame = 0
/** Each frame's projected card corners (for scripts/count-cards.mjs). */
const cards = []
const started = Date.now()
const framesAtStart = await page.evaluate(() => window.__frames)
while (frame < 160) {
  const due = started + frame * 250
  await sleep(Math.max(0, due - Date.now()))
  const name = `frame-${String(frame).padStart(3, '0')}.png`
  const corners = await page.evaluate(() => structuredClone(window.__cardCorners))
  await page.screenshot({ path: path.join(outDir, name) })
  await writeMask(path.join(masksDir, name), corners)
  cards.push({ frame: name, corners })
  frame++
  if ((await page.evaluate(() => window.scrollY)) >= end) break
}
const fps = ((await page.evaluate(() => window.__frames)) - framesAtStart) / ((Date.now() - started) / 1000)
scrolling = false
await scroller
await browser.close()
fs.writeFileSync(path.join(masksDir, 'cards.json'), JSON.stringify(cards))
compress(outDir)
console.log(
  `${frame} frames → ${outDir} | page fps while capturing ${fps.toFixed(0)}`,
  errors.length ? `| ${errors.slice(0, 2).join(' | ')}` : '| clean',
)
