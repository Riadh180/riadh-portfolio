// Opened cards (production build): each job's own page /work/<slug> opens its card in 3D;
// a screenshot once the fly-in and the dissolve have finished (and, with MID=1, one mid-way).
//
//   node scripts/capture-open.mjs <baseUrl> <outDir> [phone]   (TIER=lite: the lite tier)
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [, , base, outDir, device] = process.argv
if (!base || !outDir) {
  console.error('usage: capture-open.mjs <baseUrl> <outDir> [phone]')
  process.exit(1)
}
const phone = device === 'phone'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const slugs = (process.env.SLUGS ?? 'bliggit,kuehne-nagel,adesso,eon,licht-und-schatten,freelance').split(',')
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'],
})
const errors = []
for (const slug of slugs) {
  const page = await browser.newPage()
  const width = phone ? 390 : 1440
  const height = phone ? 844 : 900
  await page.setViewport({ width, height, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone })
  page.on('pageerror', (e) => errors.push(e.message))
  if (process.env.TIER === 'lite') await page.evaluateOnNewDocument(() => (window.__tier = 'lite'))
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('signal-intro', '1')
    window.__cardCorners = {}
  })
  await page.goto(`${base.replace(/\/$/, '')}/work/${slug}`, { waitUntil: 'networkidle2' })
  await sleep(1500)
  // Phones start the 3D on the first interaction: a tap away from the details.
  if (phone) await page.touchscreen.tap(width / 2, 60)
  else await page.mouse.move(width - 40, height - 40)
  if (process.env.MID) {
    await sleep(1600)
    await page.screenshot({ path: path.join(outDir, `${slug}-mid.png`) })
  }
  await sleep(process.env.MID ? 4400 : 6000)
  await page.screenshot({ path: path.join(outDir, `${slug}.png`) })
  // The opened card's projected corners (for scripts/card-tone.mjs).
  const corners = await page.evaluate((s) => window.__cardCorners?.[s] ?? null, slug)
  fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(corners))
  await page.close()
}
console.log(`${slugs.length} cards → ${outDir}`, errors.length ? `| ${errors[0]}` : '| clean')
await browser.close()
