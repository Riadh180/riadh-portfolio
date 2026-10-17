// Phones (production build): for each size, (1) the first swipe starts the 3D and scrolls the
// page (a real touch scroll gesture), (2) a touch drag moves the particles (frames round the
// finger change far more than a control band), (3) no clipped text at every place and in the
// open views, with a screenshot of each (for the sheet).
//
//   node scripts/phone-pass.mjs <url> <outDir> [390x844 375x667 430x932]
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'

const [, , base = 'http://localhost:3100/', outDir = 'phones', ...sizeArgs] = process.argv
const sizes = (sizeArgs.length ? sizeArgs : ['390x844', '375x667', '430x932']).map((s) =>
  s.split('x').map(Number),
)
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
fs.mkdirSync(outDir, { recursive: true })

const PLACES = [
  ['hero', 0],
  ['statement', 1],
  ['work', 2],
  ['work-mid', 2.6],
  ['system', 4],
  ['depth', 5],
  ['contact', 6],
]
const PAGES = [
  ['card-open', 'work/bliggit'],
  ['capstone-open', 'work/capstone'],
  ['cv', 'cv'],
  ['impressum', 'impressum'],
]

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'],
})

/**
 * Visible text that runs past the screen's sides, or past a box that clips it sideways
 * (text in screen-reader-only or aria-hidden layers is skipped: it isn't shown).
 */
const clippedText = () => {
  const found = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue
    const el = node.parentElement
    if (!el || el.closest('[aria-hidden="true"], .sr-only, canvas, svg, script, style, noscript'))
      continue
    let opacity = 1
    let hidden = false
    for (let p = el; p; p = p.parentElement) {
      const st = getComputedStyle(p)
      if (st.display === 'none' || st.visibility === 'hidden') hidden = true
      opacity *= Number(st.opacity)
    }
    if (hidden || opacity < 0.5) continue
    range.selectNodeContents(node)
    const rects = [...range.getClientRects()].filter(
      (q) => q.width > 0 && q.bottom > 0 && q.top < innerHeight,
    )
    if (!rects.length) continue
    let cut = rects.some((q) => q.right > innerWidth + 0.5 || q.left < -0.5)
    for (let p = el; p && !cut; p = p.parentElement) {
      const st = getComputedStyle(p)
      if (!['hidden', 'clip'].includes(st.overflowX)) continue
      const box = p.getBoundingClientRect()
      cut = rects.some((q) => q.right > box.right + 0.5 || q.left < box.left - 0.5)
    }
    if (cut) found.push(`${el.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 40)}"`)
  }
  return found
}

for (const [width, height] of sizes) {
  const label = `${width}x${height}`
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('signal-intro', '1')
    window.__air = {}
  })
  await page.goto(base, { waitUntil: 'networkidle2' })
  await sleep(2500)
  const before = await page.evaluate(() => ({
    canvas: !!document.querySelector('canvas'),
    y: scrollY,
  }))
  // (1) The first swipe: a touch scroll gesture up the screen.
  const cdp = await page.createCDPSession()
  await cdp.send('Input.synthesizeScrollGesture', {
    x: Math.round(width / 2),
    y: Math.round(height * 0.7),
    yDistance: -Math.round(height * 0.45),
    speed: 900,
    gestureSourceType: 'touch',
  })
  await sleep(3500)
  const after = await page.evaluate(() => ({
    canvas: !!document.querySelector('canvas'),
    y: scrollY,
  }))
  console.log(
    `${label}: before the swipe 3D ${before.canvas ? 'running' : 'waiting'} at y ${before.y}; after it 3D ${after.canvas ? 'running' : 'NOT running'}, scrolled to y ${Math.round(after.y)} ${after.y > 50 ? '✓' : '✗'}`,
  )

  // Back to the top for the drag (the hero's dust).
  await page.evaluate(() => window.scrollTo(0, 0))
  await sleep(3000)
  // (2) A sideways touch drag through the hero's dust: the air must still be moving at the end
  // of the drag (window.__air.peak, how far a grain at the focus has moved, px); once the
  // browser takes a touch over for scrolling it sends no more pointer moves, only touch moves.
  // The change in the band round the finger against the same band untouched is printed too.
  const shot = async () =>
    sharp(await page.screenshot())
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })
  const y = Math.round(height * 0.62)
  const drag = async (touch) => {
    const a = await shot()
    if (touch) await page.touchscreen.touchStart(width * 0.15, y)
    for (let k = 1; k <= 24; k++) {
      if (touch) await page.touchscreen.touchMove(width * (0.15 + 0.7 * (k / 24)), y)
      await sleep(16)
    }
    const push = await page.evaluate(async () => {
      if (!window.__air) return null
      window.__air.request = true
      for (let i = 0; i < 30 && window.__air.request; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve))
      return window.__air.peak ?? null
    })
    const b = await shot()
    if (touch) await page.touchscreen.touchEnd()
    const { data: A, info } = a
    const { data: B } = b
    const top = Math.round((0.62 - 0.07) * info.height)
    const bottom = Math.round((0.62 + 0.07) * info.height)
    let sum = 0
    for (let yy = top; yy < bottom; yy++) {
      for (let x = 0; x < info.width; x++)
        sum += Math.abs(A[yy * info.width + x] - B[yy * info.width + x])
    }
    return { change: sum / ((bottom - top) * info.width), push, b }
  }
  const idle = await drag(false)
  await sleep(1500)
  const touched = await drag(true)
  await sharp(touched.b.data, { raw: touched.b.info })
    .png()
    .toFile(path.join(outDir, `${label}-touch.png`))
  const ratio = touched.change / Math.max(idle.change, 0.01)
  console.log(
    `${label}: touch drag: the air moved ${touched.push === null ? 'n/a' : `${touched.push.toFixed(0)} px`} at the end of the drag ${touched.push > 3 ? '✓' : '✗'} (band change ${touched.change.toFixed(2)} vs ${idle.change.toFixed(2)} untouched, ×${ratio.toFixed(1)})`,
  )

  // (3) Clipped text, place by place (exact progress: keyboard input, no magnet).
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })),
  )
  const clipped = []
  for (const [name, progress] of PLACES) {
    await page.evaluate((p) => {
      const top = (id) => document.getElementById(id)?.offsetTop ?? 0
      const end = (id) =>
        top(id) + Math.max(0, (document.getElementById(id)?.offsetHeight ?? 0) - innerHeight)
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
      let y = 0
      for (let i = 1; i < anchors.length; i++) {
        const [s0, p0] = anchors[i - 1]
        const [s1, p1] = anchors[i]
        if (p <= p1 && p1 > p0) {
          y = s0 + ((p - p0) / (p1 - p0)) * (s1 - s0)
          break
        }
      }
      window.scrollTo(0, y)
    }, progress)
    await sleep(3500)
    const found = await page.evaluate(clippedText)
    if (found.length) clipped.push(`${name}: ${found.join(', ')}`)
    await page.screenshot({ path: path.join(outDir, `${label}-${name}.png`) })
  }
  for (const [name, route] of PAGES) {
    await page.goto(new URL(route, base).toString(), { waitUntil: 'networkidle2' })
    await page.touchscreen.tap(width / 2, height * 0.2)
    await sleep(name.endsWith('open') ? 6000 : 2500)
    const found = await page.evaluate(clippedText)
    if (found.length) clipped.push(`${name}: ${found.join(', ')}`)
    await page.screenshot({ path: path.join(outDir, `${label}-${name}.png`) })
  }
  console.log(`${label}: clipped text: ${clipped.length ? '\n  ' + clipped.join('\n  ') : 'none'}`)
  if (errors.length) console.log(`${label}: page errors: ${errors.slice(0, 2).join(' | ')}`)
  await page.close()
}
await browser.close()
