// An opening (and closing) in time (production build): flies to Work, waits at a card's stop,
// opens it from the HTML list (as a keyboard or list user would) and takes a frame every
// `step` ms; then closes it (Esc) and does the same.
//
//   node scripts/capture-opening.mjs <url> <outDir> <slug> [frames] [step]   (TIER=lite)
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [, , url, outDir, slug, framesArg = '8', stepArg = '300'] = process.argv
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
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
if (process.env.TIER === 'lite') await page.evaluateOnNewDocument(() => (window.__tier = 'lite'))
await page.evaluateOnNewDocument(() => sessionStorage.setItem('signal-intro', '1'))
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(2500)
await page.mouse.move(1400, 880)
await page.mouse.wheel({ deltaY: 1 })
await sleep(2000)
// Straight to the card from the HTML list: focus + Enter opens it (and the scene flies there).
await page.evaluate(() => {
  const a = document.createElement('a')
  a.href = '#work'
  document.body.append(a)
  a.click()
  a.remove()
})
await sleep(4500)
await page.focus(`[data-work="${slug}"]`)
await sleep(3000)
const frames = Number(framesArg)
const step = Number(stepArg)
const shoot = async (prefix) => {
  const start = Date.now()
  for (let k = 0; k < frames; k++) {
    await sleep(Math.max(0, start + k * step - Date.now()))
    await page.screenshot({ path: path.join(outDir, `${prefix}-${String(k * step).padStart(4, '0')}.png`) })
  }
}
await page.keyboard.press('Enter')
await shoot('open')
await sleep(1500)
await page.keyboard.press('Escape')
await shoot('close')
console.log(`opening and closing → ${outDir}`)
await browser.close()
