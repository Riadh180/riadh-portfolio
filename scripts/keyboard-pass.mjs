// Keyboard and screen-reader pass (production build): Tab through the page from the top and
// list every stop (role, accessible name, visible focus ring, on screen); then open a job card
// and the capstone from their buttons with Enter and check that focus moves in, stays inside
// (Tab and Shift+Tab), and that Esc closes and returns focus to the button.
//
//   node scripts/keyboard-pass.mjs <url> [tabs]
import puppeteer from 'puppeteer-core'

const [, , url = 'http://localhost:3100/', tabsArg] = process.argv
const tabs = Number(tabsArg ?? 70)
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => ['error', 'warn'].includes(m.type()) && errors.push(m.text()))
await page.evaluateOnNewDocument(() => sessionStorage.setItem('signal-intro', '1'))
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(3000)

// The accessible name and role as assistive tech gets them (aria-hidden layers left out).
async function accessible() {
  const handle = await page.evaluateHandle(() => document.activeElement)
  const node = await page.accessibility.snapshot({ root: handle, interestingOnly: false })
  await handle.dispose()
  return node
    ? { role: node.role, name: (node.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 60) }
    : null
}

const describe = async () => {
  const ax = await accessible()
  const d = await page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const style = getComputedStyle(el)
    const ring =
      (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) ||
      (style.boxShadow && style.boxShadow !== 'none')
    const labelled = el.getAttribute('aria-labelledby')
    const name = (
      el.getAttribute('aria-label') ||
      (labelled && document.getElementById(labelled)?.textContent) ||
      el.textContent ||
      ''
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 48)
    const r = el.getBoundingClientRect()
    let opacity = 1
    for (let p = el; p; p = p.parentElement) opacity *= Number(getComputedStyle(p).opacity)
    const onScreen = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
    const role = el.getAttribute('role') || el.tagName.toLowerCase()
    return {
      role,
      name,
      work: el.getAttribute('data-work'),
      pressed: el.getAttribute('aria-pressed'),
      ring,
      shown: onScreen && opacity > 0.3,
      dialog: !!el.closest('[role=dialog]'),
    }
  })
  return d && ax ? { ...d, role: ax.role, name: ax.name } : d
}

// 1) Tab order from the top.
const stops = []
for (let i = 0; i < tabs; i++) {
  await page.keyboard.press('Tab')
  await sleep(i < 3 ? 400 : 300)
  let d = await describe()
  if (!d) continue
  // A section fades in as focus arrives (0.7s): look again before calling it hidden.
  if (!d.shown) {
    await sleep(1000)
    d = (await describe()) ?? d
  }
  const key = `${d.role}|${d.name}|${d.work}`
  if (stops.length && stops[0].key === key) break // wrapped round to the start
  stops.push({ key, ...d })
}
console.log('Tab order:')
for (const s of stops) {
  console.log(
    `  ${s.role.padEnd(7)} ${JSON.stringify(s.name)}${s.work ? ` [${s.work}]` : ''}${s.pressed !== null ? ` pressed=${s.pressed}` : ''}${s.ring ? '' : '  ✗ no ring'}${s.shown ? '' : '  (off screen / hidden)'}`,
  )
}

// 2) Open views: a job card and the capstone.
async function openView(slug) {
  const found = await page.evaluate((s) => {
    const b = document.querySelector(`[data-work="${s}"]`)
    b?.focus()
    return !!b
  }, slug)
  if (!found) return `${slug}: no button`
  await page.keyboard.press('Enter')
  await sleep(2200)
  const inside = await describe()
  const trapped = []
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    await sleep(120)
    trapped.push((await describe())?.dialog ?? false)
  }
  for (let i = 0; i < 4; i++) {
    await page.keyboard.down('Shift')
    await page.keyboard.press('Tab')
    await page.keyboard.up('Shift')
    await sleep(120)
    trapped.push((await describe())?.dialog ?? false)
  }
  const modal = await page.evaluate(() => {
    const d = document.querySelector('[role=dialog]')
    return d
      ? {
          modal: d.getAttribute('aria-modal'),
          label:
            d.getAttribute('aria-labelledby') &&
            document.getElementById(d.getAttribute('aria-labelledby'))?.textContent?.trim(),
        }
      : null
  })
  await page.keyboard.press('Escape')
  await sleep(1500)
  const after = await describe()
  const closed = await page.evaluate(() => !document.querySelector('[role=dialog]'))
  return `${slug}: focus in ${inside?.dialog ? 'yes' : 'NO'} (${JSON.stringify(inside?.name)}), stays in ${trapped.every(Boolean) ? 'yes' : `NO (${trapped.filter((t) => !t).length} of ${trapped.length} left it)`}, dialog ${JSON.stringify(modal)}, Esc closes ${closed ? 'yes' : 'NO'}, focus back ${after?.work === slug ? 'yes' : `NO (${JSON.stringify(after?.name)})`}`
}
console.log('Open views:')
console.log('  ' + (await openView(process.env.CARD ?? 'bliggit')))
console.log('  ' + (await openView('capstone')))
console.log(errors.length ? `console: ${errors.slice(0, 3).join(' | ')}` : 'console: clean')
await browser.close()
