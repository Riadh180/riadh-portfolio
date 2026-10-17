// The capstone opening (production build). Desktop: Depth closed, the panel hovered, opened
// by a click, the second image (arrow key), closed again (Esc) with the scroll position kept.
// Phone: its own page /work/capstone (deep link) opened, then a sideways swipe.
//
//   node scripts/capture-capstone.mjs <baseUrl> <outDir> [phone]
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [, , base, outDir, device] = process.argv
const phone = device === 'phone'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage()
const width = phone ? 390 : 1440
const height = phone ? 844 : 900
await page.setViewport({ width, height, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.evaluateOnNewDocument(() => sessionStorage.setItem('signal-intro', '1'))
const shot = (name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })
const state = () =>
  page.evaluate(() => ({
    url: location.pathname,
    scroll: Math.round(window.scrollY),
    focus: document.activeElement?.getAttribute('aria-labelledby') ?? document.activeElement?.textContent?.slice(0, 30) ?? '',
  }))

if (phone) {
  await page.goto(`${base.replace(/\/$/, '')}/work/capstone`, { waitUntil: 'networkidle2' })
  await sleep(1500)
  await page.touchscreen.tap(width / 2, 60)
  await sleep(6000)
  await shot('open-1')
  // A sideways swipe on the lower half (the details) changes the image.
  await page.touchscreen.touchStart(320, 600)
  for (let k = 1; k <= 10; k++) {
    await page.touchscreen.touchMove(320 - k * 22, 602)
    await sleep(16)
  }
  await page.touchscreen.touchEnd()
  await sleep(1800)
  await shot('open-2')
} else {
  await page.goto(base, { waitUntil: 'networkidle2' })
  await sleep(2500)
  await page.mouse.move(width - 40, height - 40)
  await page.mouse.wheel({ deltaY: 1 })
  await sleep(2000)
  await page.evaluate(() => {
    const a = document.createElement('a')
    a.href = '#depth'
    document.body.append(a)
    a.click()
    a.remove()
  })
  await sleep(5000)
  await shot('closed')
  const before = await state()
  // The panel sits right of centre at Depth.
  const [x, y] = (process.env.PANEL ?? '860,430').split(',').map(Number)
  await page.mouse.move(x - 60, y - 20, { steps: 8 })
  await page.mouse.move(x, y, { steps: 8 })
  await sleep(1600)
  await shot('hover')
  await page.mouse.click(x, y)
  await sleep(3400)
  await shot('open-1')
  const opened = await state()
  await page.keyboard.press('ArrowRight')
  await sleep(1800)
  await shot('open-2')
  await page.keyboard.press('Escape')
  await sleep(3000)
  await shot('closed-again')
  const after = await state()
  console.log(JSON.stringify({ before, opened, after }))
}
console.log(`capstone → ${outDir}`, errors.length ? `| ${errors[0]}` : '| clean')
await browser.close()
