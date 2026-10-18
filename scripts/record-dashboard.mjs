// Records the capstone's live dashboard as its card loop (look round, Stage 2): ten calm
// seconds on the Jobs tab's AI-exposure bubble chart: a slow scroll, the cursor gliding over the
// bubbles so their tooltips show, and one change of the year. It is graded dark for the Depth
// scene and encoded by scripts/loops/encode.mjs into public/work/capstone/.
//
//   FFMPEG=/path/to/ffmpeg node scripts/record-dashboard.mjs [url]
//
// A sleeping app (Streamlit Community Cloud) is woken first. Headless screenshots carry no
// pointer, so a small arrow is drawn where the mouse is. Frames are taken step by step (30 per
// second of video at 2× for crisp text), so the motion is even however long a screenshot takes;
// the year change waits for the dashboard to redraw, so no half-drawn frame is kept.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { encodeLoop } from './loops/encode.mjs'

/** The dashboard (the capstone repository's README). */
const URL = process.argv[2] ?? 'https://aiwork-eu.streamlit.app/'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const FPS = 30
const SECONDS = 10
const CROSSFADE = 1
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const ease = (x) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2

/**
 * The cursor's path: seconds → a point (px from the chart's top left), passing over the
 * bubbles, up to the year slider (where it clicks one year back), down again and home.
 */
const PATH = [
  [0, 'chart', 880, 224],
  [1.6, 'chart', 560, 384],
  [3.0, 'chart', 414, 281],
  [4.0, 'slider', 0.75, 0],
  [4.4, 'slider', 0.75, 0],
  [5.8, 'chart', 350, 384],
  [7.2, 'chart', 210, 444],
  [8.6, 'chart', 480, 344],
  [10, 'chart', 880, 224],
  [11, 'chart', 880, 224],
]
/** When the cursor clicks the slider (seconds). */
const CLICK = 4.2
/** The scroll (px below the chart's heading): down a little, a pause, back up. */
const scrollAt = (t) => 60 + 90 * ease(t / 5) - 90 * ease((t - 7.5) / 2.5)

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-gpu', '--use-angle=metal', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 })

// Wake the app if it sleeps, then open the app itself (without the hosting page's frame).
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })
for (let i = 0; i < 40; i++) {
  const text = await page.evaluate(() => document.body.innerText).catch(() => '')
  if (/get this app back up/i.test(text)) {
    await page.evaluate(() =>
      [...document.querySelectorAll('button')].find((b) => /back up/i.test(b.innerText))?.click(),
    )
  } else if (!/waking up|taking longer|oven/i.test(text)) break
  await sleep(5000)
}
await page.goto(new globalThis.URL('/~/+/', URL).href, {
  waitUntil: 'networkidle2',
  timeout: 90000,
})
await page.waitForSelector('[role="tab"]', { timeout: 120000 })
await sleep(3000)
await page.evaluate(() =>
  [...document.querySelectorAll('[role="tab"]')].find((tab) => /Jobs/.test(tab.innerText))?.click(),
)
await page.waitForSelector('[data-testid="stSlider"]', { visible: true, timeout: 60000 })
await sleep(3000)

// The hosting UI out of the frame; a pointer that follows the mouse.
await page.addStyleTag({
  content: `header[data-testid="stHeader"], [data-testid="stToolbar"], [data-testid="stStatusWidget"],
    [data-testid="stDecoration"] { display: none !important; }
    #signal-cursor { position: fixed; z-index: 99999; pointer-events: none; width: 18px;
      height: 26px; transform: translate(-2px, -2px); }`,
})
await page.evaluate(() => {
  const cursor = document.createElement('div')
  cursor.id = 'signal-cursor'
  cursor.innerHTML =
    '<svg viewBox="0 0 18 26" width="18" height="26"><path d="M1.5 1.5v19.5l5-4.6 3.6 8 3.1-1.4-3.5-7.7h6.8z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  document.body.append(cursor)
  window.addEventListener('mousemove', (event) => {
    cursor.style.left = `${event.clientX}px`
    cursor.style.top = `${event.clientY}px`
  })
})

// Where things are, in the scroll container's own coordinates.
const layout = await page.evaluate(() => {
  const main = document.querySelector('[data-testid="stMain"]')
  const y = (el) => el.getBoundingClientRect().top + main.scrollTop
  const heading = [...document.querySelectorAll('h1, h2, h3')].find(
    (h) => /exposure landscape/i.test(h.innerText) && h.offsetParent,
  )
  const chart = [...document.querySelectorAll('.js-plotly-plot')].find((p) => p.offsetParent)
  const slider = document.querySelector('[data-testid="stSlider"]')
  const box = (el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, top: y(el), width: r.width, height: r.height }
  }
  return { heading: y(heading), chart: box(chart), slider: box(slider) }
})
const scrollTo = (top) =>
  page.evaluate((top) => document.querySelector('[data-testid="stMain"]').scrollTo(0, top), top)

/** The cursor at time t, in viewport pixels (the page scrolled to `scroll`). */
function cursorAt(t, scroll) {
  const k = Math.max(0, PATH.findIndex(([time]) => time > t) - 1)
  const [t0, ...a] = PATH[k]
  const [t1, ...b] = PATH[Math.min(k + 1, PATH.length - 1)]
  const point = ([where, x, y]) =>
    where === 'chart'
      ? [layout.chart.left + x, layout.chart.top + y - scroll]
      : // The slider's track: a share of its width, along its lower part.
        [
          layout.slider.left + 8 + (layout.slider.width - 16) * x,
          layout.slider.top + layout.slider.height - 14 - scroll,
        ]
  const p = point(a)
  const q = point(b)
  const s = ease((t - t0) / Math.max(1e-6, t1 - t0))
  return [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s]
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capstone-loop-'))
const total = Math.round((SECONDS + CROSSFADE) * FPS)
let clicked = false
for (let i = 0; i < total; i++) {
  const t = i / FPS
  const scroll = layout.heading + scrollAt(t)
  await scrollTo(scroll)
  const [x, y] = cursorAt(t, scroll)
  await page.mouse.move(x, y)
  if (!clicked && t >= CLICK) {
    clicked = true
    await page.mouse.click(x, y)
    // The dashboard redraws (a server round trip): wait until it has, then go on.
    await page
      .waitForFunction(
        () =>
          /posted in 2025/.test(document.body.innerText) &&
          !document.querySelector('[data-stale="true"]'),
        { timeout: 30000, polling: 200 },
      )
      .catch(() => console.warn('the year change did not finish in time'))
    await sleep(800)
    await scrollTo(scroll)
    await page.mouse.move(x, y)
  }
  await sleep(60)
  await page.screenshot({ path: path.join(dir, `frame-${String(i).padStart(5, '0')}.png`) })
}
await browser.close()

const files = encodeLoop({
  frames: dir,
  fps: FPS,
  seconds: SECONDS,
  crossfade: CROSSFADE,
  out: 'public/work/capstone',
  // Darker and a little cooler, to sit in the Depth scene.
  grade: 'eq=gamma=0.9:saturation=0.9:brightness=-0.02,colorbalance=bs=0.04:bm=0.02',
})
fs.rmSync(dir, { recursive: true, force: true })
console.log(JSON.stringify(files))
