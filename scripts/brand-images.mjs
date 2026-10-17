// Renders the site's brand images from the live 3D scene (run the site first):
//   npm run brand:images [url]   (default http://localhost:3000)
// - src/app/opengraph-image.png + twitter-image.png (1200×630): a real frame of The Core,
//   caught face-on, with name, role and tagline in Departure Mono.
// - src/app/apple-icon.png (180×180) from the same frame.
// - src/app/favicon.ico (32 + 48 px PNGs) rendered from src/app/icon.svg.
// Colours come from src/styles/tokens.ts, the font from src/fonts.
import { readFileSync, writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const url = process.argv[2] ?? 'http://localhost:3000'
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const tokens = readFileSync('src/styles/tokens.ts', 'utf8')
const palette = Object.fromEntries([...tokens.matchAll(/^\s+(\w+): '(#[0-9a-fA-F]{6})'/gm)].map((m) => [m[1], m[2]]))
const font = readFileSync('src/fonts/DepartureMono-Regular.woff2').toString('base64')
const profile = readFileSync('src/content/site.ts', 'utf8')
const field = (name) => profile.match(new RegExp(`${name}: '([^']+)'`))?.[1] ?? ''
const [name, role, tagline] = [field('name'), field('role'), field('tagline')]

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.evaluateOnNewDocument(() => sessionStorage.setItem('signal-intro', '1'))
await page.goto(url, { waitUntil: 'networkidle2' })
await page.addStyleTag({ content: 'header, main, .cursor, nextjs-portal, #leva__root, [class*=leva-] { visibility: hidden !important }' })
await new Promise((r) => setTimeout(r, 5000))

// The Core turns: keep the brightest frame (face-on shows the whole ring).
const clip = { x: 720 - 230, y: 410 - 230, width: 460, height: 460 }
let best = { score: -1, image: '' }
for (let i = 0; i < 16; i++) {
  const image = await page.screenshot({ clip, encoding: 'base64' })
  const score = await page.evaluate(async (src) => {
    const img = new Image()
    img.src = `data:image/png;base64,${src}`
    await img.decode()
    const canvas = new OffscreenCanvas(64, 64)
    const context = canvas.getContext('2d')
    context.drawImage(img, 0, 0, 64, 64)
    const data = context.getImageData(0, 0, 64, 64).data
    let sum = 0
    for (let p = 0; p < data.length; p += 4) sum += data[p] + data[p + 1] + data[p + 2]
    return sum
  }, image)
  if (score > best.score) best = { score, image }
  await new Promise((r) => setTimeout(r, 250))
}

const shell = (width, height, body) => `<!doctype html><html><head><style>
  @font-face { font-family: Departure; src: url(data:font/woff2;base64,${font}) format('woff2'); }
  * { margin: 0; box-sizing: border-box; }
  body { width: ${width}px; height: ${height}px; overflow: hidden; font-family: Departure, monospace; color: ${palette.text};
    background:
      radial-gradient(60% 70% at 0% 100%, ${palette.violet}38, transparent 70%),
      radial-gradient(50% 60% at 100% 0%, ${palette.teal}2e, transparent 70%),
      ${palette.bg}; }
</style></head><body>${body}</body></html>`
const core = `data:image/png;base64,${best.image}`

const render = async (path, width, height, body) => {
  const out = await browser.newPage()
  await out.setViewport({ width, height, deviceScaleFactor: 1 })
  await out.setContent(shell(width, height, body), { waitUntil: 'load' })
  await out.evaluate(() => document.fonts.ready)
  await out.screenshot({ path, type: 'png' })
  await out.close()
}

const og = `
  <img src="${core}" style="position:absolute;left:30px;top:15px;width:600px;height:600px;-webkit-mask-image:radial-gradient(closest-side,#000 55%,transparent 100%)">
  <div style="position:absolute;left:620px;top:0;bottom:0;right:60px;display:flex;flex-direction:column;justify-content:center;gap:22px">
    <div style="font-size:18px;letter-spacing:.12em;color:${palette.muted}">00 / SIGNAL</div>
    <div style="font-size:58px;line-height:1;text-transform:uppercase">${name}</div>
    <div style="font-size:24px;line-height:1.3;color:${palette.muted};text-transform:uppercase;letter-spacing:.04em">${role}</div>
    <div style="font-size:24px;line-height:1.3;text-transform:uppercase;letter-spacing:.04em;margin-top:18px">${tagline}</div>
  </div>`
await render('src/app/opengraph-image.png', 1200, 630, og)
await render('src/app/twitter-image.png', 1200, 630, og)
// The whole frame with a margin (The Core spans ~58% of the clip at the hero's size).
await render('src/app/apple-icon.png', 180, 180, `<img src="${core}" style="position:absolute;left:-40px;top:-40px;width:260px;height:260px">`)

// favicon.ico: PNG-compressed entries (supported by every current browser).
const svg = readFileSync('src/app/icon.svg', 'utf8')
const sizes = [32, 48]
const pngs = []
for (const size of sizes) {
  const icon = await browser.newPage()
  await icon.setViewport({ width: size, height: size })
  await icon.setContent(`<style>*{margin:0}body{background:transparent}</style>${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}`)
  pngs.push(await icon.screenshot({ type: 'png', omitBackground: true }))
  await icon.close()
}
const header = Buffer.alloc(6 + 16 * pngs.length)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(pngs.length, 4)
let offset = header.length
pngs.forEach((png, i) => {
  const entry = 6 + i * 16
  header.writeUInt8(sizes[i] % 256, entry)
  header.writeUInt8(sizes[i] % 256, entry + 1)
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(png.length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += png.length
})
writeFileSync('src/app/favicon.ico', Buffer.concat([header, ...pngs]))
writeFileSync('src/app/opengraph-image.alt.txt', `${name}, ${role}: The Core, a glass emblem, beside the tagline “${tagline}”`)
writeFileSync('src/app/twitter-image.alt.txt', `${name}, ${role}: The Core, a glass emblem, beside the tagline “${tagline}”`)
await browser.close()
console.log('brand images written (best frame score', best.score, ')')
