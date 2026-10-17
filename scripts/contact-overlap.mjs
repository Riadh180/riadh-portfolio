// Stage 7's Contact rule: The Core never overlaps "LET'S TALK". Measures, on a production
// build, The Core's screen box (window.__boxes.core, from Emblem) against the headline's
// text box (a Range over its glyphs, so not the full-width block) and the text's live
// opacity (the product up its ancestors, so a running CSS fade counts).
//
//   node scripts/contact-overlap.mjs <url> [desktop|390x844|375x667|430x932] [margin px]
//
// 1) At rest: progress 5.0 → 7.0 in 0.02 steps (2.5 s settle each).
// 2) Scrolling: down from 5.0 through the loop and back up, at 400, 1200 and 3000 px/s,
//    sampled every frame. An overlap is any sample where the boxes (the headline grown by
//    the margin) intersect while the text is more than 2% visible.
import puppeteer from 'puppeteer-core'

const [, , url, device = 'desktop', marginArg] = process.argv
const margin = Number(marginArg ?? 16)
const phone = device !== 'desktop'
const [width, height] = phone ? device.split('x').map(Number) : [1440, 900]
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage()
await page.setViewport({
  width,
  height,
  deviceScaleFactor: phone ? 2 : 1,
  isMobile: phone,
  hasTouch: phone,
})
if (process.env.TIER === 'lite') await page.evaluateOnNewDocument(() => (window.__tier = 'lite'))
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('signal-intro', '1')
  window.__boxes = {}
})
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(2500)
if (phone) await page.touchscreen.tap(width / 2, height * 0.35)
else {
  await page.mouse.move(width / 2, height / 2)
  await page.mouse.wheel({ deltaY: 1 })
}
await sleep(2500)
// Keyboard input mode: no soft magnet, no jump back to the top at the loop's end.
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })))

await page.evaluate(() => {
  const top = (id) => document.getElementById(id)?.offsetTop ?? 0
  const end = (id) =>
    top(id) + Math.max(0, (document.getElementById(id)?.offsetHeight ?? 0) - window.innerHeight)
  const anchors = [
    [top('depth'), 5],
    [end('depth'), 5],
    [top('contact'), 6],
    [end('contact'), 6],
    [end('loop'), 7],
  ]
  window.__progressAt = (y) => {
    for (let i = 1; i < anchors.length; i++) {
      const [s0, p0] = anchors[i - 1]
      const [s1, p1] = anchors[i]
      if (y <= s1) return s1 > s0 ? p0 + ((y - s0) / (s1 - s0)) * (p1 - p0) : p1
    }
    return anchors.at(-1)[1]
  }
  window.__scrollFor = (p) => {
    for (let i = 1; i < anchors.length; i++) {
      const [s0, p0] = anchors[i - 1]
      const [s1, p1] = anchors[i]
      if (p <= p1 && p1 > p0) return s0 + ((p - p0) / (p1 - p0)) * (s1 - s0)
    }
    return anchors.at(-1)[0]
  }
  const title = document.getElementById('contact-title')
  window.__sample = () => {
    const core = window.__boxes.core
    const range = document.createRange()
    range.selectNodeContents(title)
    const r = range.getBoundingClientRect()
    let opacity = 1
    for (let el = title; el; el = el.parentElement) opacity *= Number(getComputedStyle(el).opacity)
    const progress = window.__progressAt(window.scrollY)
    return {
      core: core ? [...core] : null,
      text: [r.left, r.top, r.right, r.bottom],
      opacity,
      scroll: window.scrollY,
      progress,
    }
  }
})

// Clearance: how far apart the boxes are vertically (negative: they overlap), for samples
// where the text shows and the boxes share some width.
const judge = (s) => {
  if (!s.core || s.opacity <= 0.02) return { overlap: false, gap: null }
  const [l, t, r, b] = s.core
  const [tl, tt, tr, tb] = s.text
  if (!(l < tr + margin && r > tl - margin)) return { overlap: false, gap: null }
  const gap = Math.max(tt - b, t - tb)
  return { overlap: gap < margin, gap }
}

const rows = []
let worstGap = Infinity
const bad = []
for (let k = 0; k <= 100; k++) {
  const p = 5 + k * 0.02
  await page.evaluate((p) => window.scrollTo(0, window.__scrollFor(p)), p)
  await sleep(k === 0 ? 4000 : 2500)
  const s = await page.evaluate(() => window.__sample())
  const j = judge(s)
  if (j.gap !== null) worstGap = Math.min(worstGap, j.gap)
  if (j.overlap)
    bad.push(`rest p${p.toFixed(2)} gap ${j.gap?.toFixed(0)} op ${s.opacity.toFixed(2)}`)
  rows.push(
    `p${p.toFixed(2)} core ${s.core ? s.core.map((v) => v.toFixed(0)).join(',') : '-'} text ${s.text.map((v) => v.toFixed(0)).join(',')} op ${s.opacity.toFixed(2)} gap ${j.gap === null ? '-' : j.gap.toFixed(0)}${j.overlap ? ' ✗' : ''}`,
  )
}
if (process.env.VERBOSE) console.log(rows.join('\n'))

// Continuous scrolls, sampled every frame in the page.
for (const speed of [400, 1200, 3000]) {
  for (const [from, to] of [
    [5, 7],
    [6.9, 5],
  ]) {
    await page.evaluate((p) => window.scrollTo(0, window.__scrollFor(p)), from)
    await sleep(3000)
    const samples = await page.evaluate(
      ({ from, to, speed }) =>
        new Promise((resolve) => {
          const start = window.__scrollFor(from)
          const stop = window.__scrollFor(to)
          const dir = Math.sign(stop - start)
          const out = []
          let y = start
          let last = performance.now()
          let tail = 0
          const step = (now) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            if ((stop - y) * dir > 0) {
              y += dir * speed * dt
              window.scrollTo(0, (stop - y) * dir > 0 ? y : stop)
            } else tail += dt
            out.push(window.__sample())
            if (tail > 2) resolve(out)
            else requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }),
      { from, to, speed },
    )
    let count = 0
    let first = null
    let last = null
    let worst = Infinity
    for (const s of samples) {
      const j = judge(s)
      if (j.gap !== null) worstGap = Math.min(worstGap, j.gap)
      if (j.overlap) {
        count++
        first ??= s
        last = s
        worst = Math.min(worst, j.gap)
      }
    }
    if (count) {
      bad.push(
        `scroll ${from}→${to} at ${speed}px/s: ${count} of ${samples.length} frames, p${first.progress.toFixed(3)}–p${last.progress.toFixed(3)}, clearance down to ${worst.toFixed(0)} px (op ${first.opacity.toFixed(2)}–${last.opacity.toFixed(2)})`,
      )
    }
  }
}
console.log(
  `${device}: smallest clearance ${worstGap.toFixed(0)} px (margin ${margin}), overlaps: ${bad.length ? '\n  ' + bad.join('\n  ') : 'none'}`,
)
await browser.close()
