// Shader compile check (production build): production turns three's shader error checks off,
// so a broken shader only shows as a missing object. This visits every place with WebGL's
// compile and link calls hooked and prints each error with the lines round it.
//
//   node scripts/shader-check.mjs <url> [phone]      (TIER=lite: the lite tier's variants)
import puppeteer from 'puppeteer-core'

const [, , url, device] = process.argv
const phone = device === 'phone'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage()
const width = phone ? 390 : 1440
const height = phone ? 844 : 900
await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone })
const errors = new Set()
page.on('console', (m) => m.text().startsWith('SHADER') && errors.add(m.text()))
page.on('pageerror', (e) => errors.add(`PAGE ${e.message}`))
if (process.env.TIER === 'lite') await page.evaluateOnNewDocument(() => (window.__tier = 'lite'))
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('signal-intro', '1')
  const proto = WebGL2RenderingContext.prototype
  const compile = proto.compileShader
  proto.compileShader = function (shader) {
    compile.call(this, shader)
    if (!this.getShaderParameter(shader, this.COMPILE_STATUS)) {
      const log = this.getShaderInfoLog(shader) ?? ''
      const lines = (this.getShaderSource(shader) ?? '').split('\n')
      const at = Number(/ERROR: \d+:(\d+)/.exec(log)?.[1] ?? 0)
      const context = lines
        .slice(Math.max(0, at - 3), at + 2)
        .map((line, k) => `${Math.max(0, at - 3) + k + 1}: ${line}`)
        .join('\n')
      console.error(`SHADER compile: ${log.trim()}\n${context}`)
    }
  }
  const link = proto.linkProgram
  proto.linkProgram = function (program) {
    link.call(this, program)
    if (!this.getProgramParameter(program, this.LINK_STATUS)) {
      console.error(`SHADER link: ${(this.getProgramInfoLog(program) ?? '').trim()}`)
    }
  }
})
await page.goto(url, { waitUntil: 'networkidle2' })
await sleep(2500)
if (phone) await page.touchscreen.tap(width / 2, height * 0.35)
else {
  await page.mouse.move(width / 2, height / 2)
  await page.mouse.wheel({ deltaY: 1 })
}
await sleep(2500)
for (const place of ['approach', 'work', 'system', 'depth', 'contact', 'signal']) {
  await page.evaluate((h) => {
    const a = document.createElement('a')
    a.href = h
    document.body.append(a)
    a.click()
    a.remove()
  }, `#${place}`)
  await sleep(3500)
}
console.log(errors.size ? [...errors].join('\n\n') : 'no shader errors')
await browser.close()
