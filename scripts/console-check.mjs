// Gate: no console errors or warnings, and no failed requests, on every page and down the
// whole journey (production build). Variants: REDUCED=1 (prefers-reduced-motion), NOWEBGL=1
// (WebGL off: the static fallback), PHONE=1 (390×844, touch). Screenshots of each stop go to
// outDir when given.
//
//   node scripts/console-check.mjs <url> [outDir]
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [, , base = 'http://localhost:3100/', outDir] = process.argv
const phone = !!process.env.PHONE
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
if (outDir) fs.mkdirSync(outDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--enable-gpu',
    '--use-angle=metal',
    '--ignore-gpu-blocklist',
    ...(process.env.NOWEBGL ? ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] : []),
  ],
})
const width = phone ? 390 : 1440
const height = phone ? 844 : 900
const messages = []
const page = await browser.newPage()
await page.setViewport({
  width,
  height,
  deviceScaleFactor: phone ? 2 : 1,
  isMobile: phone,
  hasTouch: phone,
})
if (process.env.REDUCED)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
let where = ''
page.on('console', (m) => {
  if (!['error', 'warn', 'warning'].includes(m.type())) return
  // The 404 test page itself: the browser reports the document's own status, as intended.
  if (where.includes('a-page-that-does-not-exist') && m.text().includes('status of 404')) return
  messages.push(`${where}: [${m.type()}] ${m.text().slice(0, 160)}`)
})
page.on('pageerror', (e) => messages.push(`${where}: [pageerror] ${e.message.slice(0, 160)}`))
page.on('requestfailed', (r) =>
  messages.push(`${where}: [requestfailed] ${r.url()} ${r.failure()?.errorText}`),
)
page.on('response', (r) => {
  const intended = r.url().includes('a-page-that-does-not-exist')
  if (r.status() >= 400 && !intended) messages.push(`${where}: [http ${r.status()}] ${r.url()}`)
})

const shot = async (name) => outDir && page.screenshot({ path: path.join(outDir, `${name}.png`) })
const start = async () => {
  if (phone) await page.touchscreen.tap(width / 2, height * 0.35)
  else {
    await page.mouse.move(width / 2, height / 2)
    await page.mouse.wheel({ deltaY: 1 })
  }
  await sleep(2500)
}

// The journey, place by place, then a card opened and closed with the keyboard.
where = '/'
await page.goto(base, { waitUntil: 'networkidle2' })
await sleep(3000)
const fallback = await page.evaluate(() => !document.querySelector('canvas'))
await start()
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })))
for (const progress of [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 6.9]) {
  where = `/ at ${progress}`
  await page.evaluate((p) => {
    const top = (id) => document.getElementById(id)?.offsetTop ?? 0
    const end = (id) =>
      top(id) + Math.max(0, (document.getElementById(id)?.offsetHeight ?? 0) - innerHeight)
    const a = [
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
    for (let i = 1; i < a.length; i++) {
      const [s0, p0] = a[i - 1]
      const [s1, p1] = a[i]
      if (p <= p1 && p1 > p0) return window.scrollTo(0, s0 + ((p - p0) / (p1 - p0)) * (s1 - s0))
    }
  }, progress)
  await sleep(2200)
  await shot(`journey-${progress.toFixed(1)}`)
}
where = '/ card'
const opened = await page.evaluate(() => {
  const b = document.querySelector('[data-work="bliggit"]')
  b?.focus()
  return !!b
})
if (opened) {
  await page.keyboard.press('Enter')
  await sleep(2500)
  await shot('card-open')
  await page.keyboard.press('Escape')
  await sleep(1500)
}

for (const route of [
  '/cv',
  '/work/bliggit',
  '/work/capstone',
  '/impressum',
  '/datenschutz',
  '/a-page-that-does-not-exist',
]) {
  where = route
  await page.goto(new URL(route, base).toString(), { waitUntil: 'networkidle2' })
  await sleep(route.startsWith('/work') ? 5000 : 2000)
  if (!route.includes('impressum')) await shot(route.replace(/\W+/g, '-').replace(/^-/, ''))
}
await browser.close()

const mode = [
  phone ? 'phone' : 'desktop',
  process.env.REDUCED ? 'reduced motion' : '',
  process.env.NOWEBGL ? 'no WebGL' : '',
]
  .filter(Boolean)
  .join(', ')
console.log(
  `${mode}: ${process.env.NOWEBGL ? `fallback ${fallback ? 'shown (no canvas)' : 'NOT shown'}; ` : ''}${messages.length ? `${messages.length} message(s):\n  ` + [...new Set(messages)].join('\n  ') : 'console clean, no failed requests'}`,
)
