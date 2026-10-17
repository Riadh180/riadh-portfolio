// How far the cursor moves the glass grains (production build): scripted swipes through the
// air at one place, slow / medium / fast, each followed by the air's answer over 3 s. Reads
// window.__air (particles/CursorField.tsx): `peak`, the furthest a grain at the focus has
// moved, and `local`, how far one near the end of the swipe has (px; the flow field read back
// on full, the lite trail evaluated on a grid).
//
//   node scripts/cursor-flow.mjs <url> <progress> [phone]
//
// Env: TIER=lite, LOWGPU=1 (integrated GPU), PATH_AT="x0,y0,x1,y1" the swipe (px; default
// across the middle of the frame's upper half). Swipes: 300, 1000 and 2500 px/s (a finger
// drag on phones). Prints, per swipe: the largest displacement anywhere; near the swipe's end
// (90% along it) the largest and when it came after the swipe ended (the drift), the
// displacement at +0.3 / 0.8 / 1.5 / 2.5 s, the overshoot (the largest swing back, % of the
// peak) and when it stayed under 2 px (settled).
import puppeteer from 'puppeteer-core'
import { goToProgress, playSwipe } from './swipe.mjs'

const [, , url, progressArg, device] = process.argv
if (!url || progressArg === undefined) {
  console.error('usage: cursor-flow.mjs <url> <progress> [phone]')
  process.exit(1)
}
const phone = device === 'phone'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const args = ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu']
if (process.env.LOWGPU) args.push('--force_low_power_gpu')
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args })
const page = await browser.newPage()
const width = phone ? 390 : 1440
const height = phone ? 844 : 900
await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone })
await page.evaluateOnNewDocument((lite) => {
  sessionStorage.setItem('signal-intro', '1')
  window.__air = {}
  if (lite) window.__tier = 'lite'
}, process.env.TIER === 'lite')
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(2500)
await goToProgress(page, Number(progressArg))
await sleep(5000)

const measure = () =>
  page.evaluate(async () => {
    window.__air.request = true
    for (let i = 0; i < 30 && window.__air.request; i++)
      await new Promise((resolve) => requestAnimationFrame(resolve))
    return [window.__air.peak ?? 0, window.__air.local ?? 0]
  })

const [x0, y0, x1, y1] = (process.env.PATH_AT ?? '').split(',').filter(Boolean).map(Number)
const from = Number.isFinite(x0) ? [x0, y0] : [width * 0.3, height * 0.3]
const to = Number.isFinite(x1) ? [x1, y1] : [width * 0.7, height * 0.3]
const length = Math.hypot(to[0] - from[0], to[1] - from[1])
const strength = await page.evaluate(() => window.__air.strength ?? null)
console.log(
  `${phone ? 'phone' : 'desktop'} ${process.env.TIER ?? 'full'} at ${progressArg}: air strength ${strength?.toFixed(2)}; swipe ${Math.round(length)} px`,
)

const near = [from[0] + (to[0] - from[0]) * 0.9, from[1] + (to[1] - from[1]) * 0.9]
await page.evaluate((at) => (window.__air.at = at), near)
for (const speed of [300, 1000, 2500]) {
  await playSwipe(page, from, to, (length / speed) * 1000, phone)
  const end = Date.now()
  const samples = []
  while (Date.now() - end < 3000) {
    const [peak, local] = await measure()
    samples.push({ t: (Date.now() - end) / 1000, peak, local })
    await sleep(30)
  }
  const top = samples.reduce((a, b) => (b.peak > a.peak ? b : a))
  const best = samples.reduce((a, b) => (b.local > a.local ? b : a))
  const at = (t) => samples.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).local
  // After the peak the air swings home: the displacement dips to ~0, then a small swing back
  // past home shows as a second rise (the overshoot).
  const after = samples.filter((s) => s.t > best.t)
  const low = after.reduce((a, b) => (b.local < a.local ? b : a), after[0] ?? best)
  const swing = Math.max(0, ...after.filter((s) => s.t > low.t).map((s) => s.local))
  const settled = [...samples].reverse().find((s) => s.peak >= 2)?.t
  console.log(
    `  ${speed} px/s: anywhere ${top.peak.toFixed(0)} px at +${top.t.toFixed(2)} s; near the end ${best.local.toFixed(0)} px at +${best.t.toFixed(2)} s; +0.3 s ${at(0.3).toFixed(0)}, +0.8 s ${at(0.8).toFixed(0)}, +1.5 s ${at(1.5).toFixed(1)}, +2.5 s ${at(2.5).toFixed(1)} px; overshoot ${((swing / Math.max(best.local, 1e-3)) * 100).toFixed(0)}%; all under 2 px from +${settled === undefined ? '0' : settled.toFixed(2)} s`,
  )
  await sleep(1500)
}
await browser.close()
