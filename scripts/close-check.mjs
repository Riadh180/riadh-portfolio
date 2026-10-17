// Click to close (production build): for every job card and the capstone, on desktop the
// cursor over the opened card ("CLOSE"), over the details (its own mode) and over a link;
// clicks that must not close (during the fly-in, a drag, on the details text, on previous /
// next); then closing by a click on the card, on the smoke behind it, by Esc, and by keyboard
// (Tab to the card, Enter), with focus back on the card's button and the change announced.
// Phones: a tap on the card closes it, a scroll of the details doesn't, a tap on the smoke
// does. Screenshots for the sheet go to outDir.
//
//   node scripts/close-check.mjs <url> <outDir> [phone]      (REDUCED=1: reduced motion)
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [, , base = 'http://localhost:3100', outDir = '/tmp/close-check', device] = process.argv
const phone = device === 'phone'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
fs.mkdirSync(outDir, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'],
})
const page = await browser.newPage()
const width = phone ? 390 : 1440
const height = phone ? 844 : 900
await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone })
if (process.env.REDUCED) {
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
}
await page.evaluateOnNewDocument(() => sessionStorage.setItem('signal-intro', '1'))
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

const isOpen = () => page.evaluate(() => !!document.querySelector('[role="dialog"]'))
const mode = () => page.evaluate(() => document.querySelector('.cursor')?.dataset.mode ?? 'none')
const center = (selector) =>
  page.evaluate((s) => {
    const r = document.querySelector(s)?.getBoundingClientRect()
    return r && r.width > 0 ? [r.left + r.width / 2, r.top + r.height / 2] : null
  }, selector)
const cardButton = 'button[aria-label^="Close "]'
const announced = () =>
  page.evaluate(() => document.querySelector('p[aria-live="polite"].sr-only')?.textContent ?? '')
const focusedOn = (slug) =>
  page.evaluate((s) => document.activeElement?.getAttribute('data-work') === s, slug)
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? '✓' : '✗'} ${name}${detail}`)

async function fly(hash) {
  await page.evaluate((h) => {
    const a = document.createElement('a')
    a.href = h
    document.body.append(a)
    a.click()
    a.remove()
  }, hash)
  await sleep(4500)
}

async function openBy(slug) {
  const at = await center(`button[data-work="${slug}"]`)
  if (!at) return false
  await page.mouse.click(at[0], at[1])
  return true
}

await page.goto(base, { waitUntil: 'networkidle2' })
await sleep(3000)
await page.mouse.move(width / 2, height / 2)
await page.mouse.wheel({ deltaY: 1 })
await sleep(2500)

if (!phone) {
  const cards = ['bliggit', 'kuehne-nagel', 'adesso', 'eon', 'licht-und-schatten', 'freelance']
  await fly('#work')
  for (const [i, slug] of [...cards, 'capstone'].entries()) {
    if (slug === 'capstone') await fly('#depth')
    const label = slug
    if (!(await openBy(slug))) {
      check(`${label}: opens from its button`, false)
      continue
    }
    // During the fly-in: a click on the card doesn't close it.
    await sleep(200)
    const early = await center(cardButton)
    if (early) await page.mouse.click(early[0], early[1])
    await sleep(100)
    check(`${label}: a click during the fly-in leaves it open`, await isOpen())
    await sleep(1800)
    const card = await center(cardButton)
    if (!card) {
      check(`${label}: the card's button lies over it`, false)
      continue
    }
    await page.mouse.move(card[0], card[1], { steps: 4 })
    await sleep(400)
    const overCard = await mode()
    check(`${label}: cursor over the card reads CLOSE`, overCard === 'close', ` (${overCard})`)
    if (i === 0 || slug === 'capstone') {
      await page.screenshot({ path: path.join(outDir, `${slug}-close-cursor.png`) })
    }
    const text = await center('[role="dialog"] p')
    if (text) {
      await page.mouse.move(text[0], text[1], { steps: 4 })
      await sleep(400)
      const overText = await mode()
      check(`${label}: cursor over the details is its own`, overText !== 'close', ` (${overText})`)
      if (i === 0) await page.screenshot({ path: path.join(outDir, `${slug}-details-cursor.png`) })
      await page.mouse.click(text[0], text[1])
      await sleep(300)
      check(`${label}: a click on the details text leaves it open`, await isOpen())
    }
    const link = await center('[role="dialog"] nav button, [role="dialog"] a')
    if (link) {
      await page.mouse.move(link[0], link[1], { steps: 4 })
      await sleep(400)
      check(`${label}: cursor over a link is a link`, (await mode()) === 'link')
    }
    // A drag on the card is no click.
    await page.mouse.move(card[0], card[1], { steps: 3 })
    await page.mouse.down()
    await page.mouse.move(card[0] + 24, card[1] + 6, { steps: 4 })
    await page.mouse.up()
    await sleep(300)
    check(`${label}: a drag on the card leaves it open`, await isOpen())
    // A click on the card closes it; focus back on its button; announced.
    await page.mouse.click(card[0], card[1])
    await sleep(500)
    const closed = !(await isOpen())
    check(`${label}: a click on the card closes it`, closed)
    if (i === 0 || slug === 'capstone') {
      await sleep(1400)
      await page.screenshot({ path: path.join(outDir, `${slug}-closed.png`) })
    }
    check(`${label}: focus back on its button`, await focusedOn(slug))
    const said = await announced()
    check(`${label}: the change is announced`, /closed$/.test(said), ` ("${said}")`)
    await sleep(1600)
    // The smoke behind it.
    if (await openBy(slug)) {
      await sleep(2000)
      const spot = [width * 0.86, height * 0.9]
      await page.mouse.move(spot[0], spot[1], { steps: 4 })
      await sleep(400)
      const overSmoke = await mode()
      check(`${label}: cursor over the smoke reads CLOSE`, overSmoke === 'close', ` (${overSmoke})`)
      await page.mouse.click(spot[0], spot[1])
      await sleep(500)
      check(`${label}: a click on the smoke closes it`, !(await isOpen()))
      await sleep(1600)
    }
    // Keyboard: Tab to the card, Enter.
    await page.focus(`button[data-work="${slug}"]`)
    await page.keyboard.press('Enter')
    await sleep(2200)
    let onCard = false
    for (let k = 0; k < 12 && !onCard; k++) {
      await page.keyboard.press('Tab')
      onCard = await page.evaluate(() =>
        (document.activeElement?.getAttribute('aria-label') ?? '').startsWith('Close '),
      )
    }
    check(`${label}: Tab reaches the card as a button`, onCard)
    if (onCard) {
      await page.keyboard.press('Enter')
      await sleep(600)
      check(`${label}: Enter on the card closes it`, !(await isOpen()))
      check(`${label}: focus back on its button (keyboard)`, await focusedOn(slug))
    }
    await sleep(1600)
    if (slug !== 'capstone' && slug !== 'freelance') {
      // Previous / next keep it open (another card).
      await openBy(slug)
      await sleep(2000)
      const next = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[role="dialog"] nav button')]
        const b = buttons.at(-1)?.getBoundingClientRect()
        return b ? [b.left + b.width / 2, b.top + b.height / 2] : null
      })
      if (next) {
        await page.mouse.click(next[0], next[1])
        await sleep(600)
        check(`${label}: next → keeps a card open`, await isOpen())
      }
      await page.keyboard.press('Escape')
      await sleep(600)
      check(`${label}: Esc still closes`, !(await isOpen()))
      await sleep(1600)
    }
  }
} else {
  for (const slug of [
    'bliggit',
    'kuehne-nagel',
    'adesso',
    'eon',
    'licht-und-schatten',
    'freelance',
    'capstone',
  ]) {
    await page.goto(`${base}/work/${slug}`, { waitUntil: 'networkidle2' })
    // A first tap, as a visitor's (it starts the scene; the card is still flying in, so the
    // smoke ignores it). Without one, the dialog's focus counts as keyboard focus and shows
    // its ring.
    await sleep(300)
    await page.touchscreen.tap(width / 2, height * 0.62)
    await sleep(4000)
    check(`${slug}: opened by its own page`, await isOpen())
    const panel = await center('[role="dialog"] .detail-in')
    if (panel) {
      const cdp = await page.createCDPSession()
      await cdp.send('Input.synthesizeScrollGesture', {
        x: Math.round(panel[0]),
        y: Math.round(panel[1]),
        yDistance: -120,
        speed: 600,
        gestureSourceType: 'touch',
      })
      await sleep(700)
      check(`${slug}: scrolling the details leaves it open`, await isOpen())
    }
    const card = await center(cardButton)
    if (slug === 'bliggit')
      await page.screenshot({ path: path.join(outDir, `phone-${slug}-open.png`) })
    if (card) {
      await page.touchscreen.tap(card[0], card[1])
      await sleep(400)
      if (slug === 'bliggit') {
        await page.screenshot({ path: path.join(outDir, `phone-${slug}-tapped.png`) })
      }
      await sleep(300)
      check(`${slug}: a tap on the card closes it`, !(await isOpen()))
      if (slug === 'bliggit') {
        await sleep(1500)
        await page.screenshot({ path: path.join(outDir, `phone-${slug}-closed.png`) })
      }
    } else check(`${slug}: the card's button lies over it`, false)
  }
  // A tap on the smoke between the card (above) and the details (below) closes it too.
  await page.goto(`${base}/work/bliggit`, { waitUntil: 'networkidle2' })
  await sleep(300)
  await page.touchscreen.tap(width / 2, height * 0.62)
  await sleep(4000)
  const card = await page.evaluate((s) => {
    const r = document.querySelector(s)?.getBoundingClientRect()
    return r ? r.bottom : null
  }, cardButton)
  const details = await page.evaluate(
    () => document.querySelector('[role="dialog"] .detail-in')?.getBoundingClientRect().top ?? null,
  )
  if (card !== null && details !== null && details - card > 24) {
    await page.touchscreen.tap(width / 2, (card + details) / 2)
    await sleep(600)
    check('bliggit: a tap on the smoke closes it', !(await isOpen()))
  } else check('bliggit: room between the card and the details', false)
}
console.log(results.join('\n'))
const failed = results.filter((r) => r.startsWith('✗')).length
console.log(
  `${phone ? 'phone' : 'desktop'}: ${results.length - failed}/${results.length} passed${errors.length ? ` | page errors: ${errors.join(' | ')}` : ''}`,
)
await browser.close()
