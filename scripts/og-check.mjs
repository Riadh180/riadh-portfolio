// Open Graph / Twitter previews (production build): every route's tags, and the image they
// point to (fetched from the same server: status, type, size). Writes a preview sheet of
// the share cards as a social network would draw them.
//
//   node scripts/og-check.mjs <url> <sheet.jpg> [route …]
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'

const [, , base = 'http://localhost:3100/', sheet = 'og-previews.jpg', ...routeArgs] = process.argv
const routes = routeArgs.length ? routeArgs : ['/', '/cv', '/work/bliggit', '/work/capstone']
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const tag = (html, attr, key) =>
  html.match(new RegExp(`<meta[^>]*${attr}="${key}"[^>]*content="([^"]*)"`, 'i'))?.[1] ??
  html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${key}"`, 'i'))?.[1] ??
  null
const decode = (s) =>
  s
    ?.replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<') ?? null

const cards = []
let ok = true
for (const route of routes) {
  const html = await (await fetch(new URL(route, base))).text()
  const og = {
    title: decode(tag(html, 'property', 'og:title')),
    description: decode(tag(html, 'property', 'og:description')),
    url: tag(html, 'property', 'og:url'),
    image: decode(tag(html, 'property', 'og:image')),
    width: tag(html, 'property', 'og:image:width'),
    height: tag(html, 'property', 'og:image:height'),
    alt: decode(tag(html, 'property', 'og:image:alt')),
    card: tag(html, 'name', 'twitter:card'),
    twitterImage: decode(tag(html, 'name', 'twitter:image')),
  }
  // The image's address is absolute (the production origin): fetch it here.
  const local = og.image
    ? new URL(new URL(og.image).pathname + new URL(og.image).search, base)
    : null
  const res = local ? await fetch(local) : null
  const buffer = res?.ok ? Buffer.from(await res.arrayBuffer()) : null
  const meta = buffer ? await sharp(buffer).metadata() : null
  const fine =
    !!og.title &&
    !!og.description &&
    !!og.url &&
    !!og.image &&
    res?.ok &&
    meta?.width === 1200 &&
    meta?.height === 630 &&
    og.card === 'summary_large_image'
  ok &&= fine
  console.log(
    `${route}: ${fine ? '✓' : '✗'} title "${og.title}" · url ${og.url} · image ${og.image ? new URL(og.image).pathname : 'none'} ${res?.status ?? ''} ${res?.headers.get('content-type') ?? ''} ${meta ? `${meta.width}×${meta.height}` : ''} · alt ${og.alt ? 'yes' : 'no'} · twitter ${og.card}${og.twitterImage ? ' + image' : ''}`,
  )
  cards.push({ route, og, image: buffer })
}

// The share cards, as a feed draws them: image, then domain, title, description.
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage()
await page.setViewport({
  width: 1100,
  height: 100 + 470 * Math.ceil(cards.length / 2),
  deviceScaleFactor: 1,
})
const escape = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
await page.setContent(`<!doctype html><body style="margin:0;padding:24px;background:#f3f4f6;font:14px -apple-system,Helvetica,sans-serif;display:grid;grid-template-columns:1fr 1fr;gap:24px">
${cards
  .map(
    ({ route, og, image }) => `<div><div style="color:#555;margin-bottom:6px">${escape(route)}</div>
  <div style="background:#fff;border:1px solid #d6d9de;border-radius:12px;overflow:hidden">
    ${image ? `<img style="display:block;width:100%;aspect-ratio:1200/630" src="data:image/png;base64,${image.toString('base64')}">` : '<div style="aspect-ratio:1200/630;background:#ddd"></div>'}
    <div style="padding:10px 14px 14px"><div style="color:#666;font-size:12px">${escape(og.url ? new URL(og.url).host : '')}</div>
    <div style="font-weight:600;margin:3px 0">${escape(og.title)}</div>
    <div style="color:#444;font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escape(og.description)}</div></div>
  </div></div>`,
  )
  .join('')}</body>`)
const height = await page.evaluate(() => document.body.scrollHeight)
await page.setViewport({ width: 1100, height, deviceScaleFactor: 1 })
await page.screenshot({ path: sheet, type: 'jpeg', quality: 82 })
await browser.close()
console.log(ok ? 'all previews complete' : 'some previews incomplete', '→', sheet)
