// Renders the card loops that are made rather than recorded (look round, Stage 2): Bliggit's
// two-phone composition and the live scenes of the confidential jobs (and Freelance), offline at
// video quality, then encodes them (scripts/loops/encode.mjs) into public/work/<slug>/.
// The capstone's loop is recorded from its live dashboard instead (record-dashboard.mjs).
//
//   FFMPEG=/path/to/ffmpeg node scripts/make-loops.mjs [slug …]
//
// The stage (scripts/loops/stage.ts) is bundled with esbuild (a production build of the same
// scene code the site runs), served next to public/, and driven frame by frame in headless
// Chrome; every frame is read back losslessly.
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { build } from 'esbuild'
import puppeteer from 'puppeteer-core'
import { encodeLoop } from './loops/encode.mjs'

const LOOPS = ['bliggit', 'kuehne-nagel', 'adesso', 'eon', 'licht-und-schatten', 'freelance']
/**
 * Particles per scene, as a multiple of the live card's (default 2). Campaign bars keep the
 * card's own: their stream is the subject, and twice as many moving points cost the file its
 * quality. Freelance's dust at 1.5×: at 2× the opened card glared (over 1.4× its closed tone).
 */
const DETAIL = { 'licht-und-schatten': 1, freelance: 1.5 }
const FPS = 30
const SECONDS = 10
const CROSSFADE = 1
/** Fine grain and a touch of contrast; the card's frost does the rest of the grade. */
const GRADE = 'noise=alls=3:allf=t,eq=contrast=1.04'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : LOOPS
const bundle = await build({
  entryPoints: ['scripts/loops/stage.ts'],
  bundle: true,
  format: 'esm',
  minify: true,
  write: false,
  platform: 'browser',
  target: 'es2022',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.glsl': 'text', '.vert': 'text', '.frag': 'text' },
  logLevel: 'error',
})
const script = bundle.outputFiles[0].text

// The page and public/ (the screenshots), on a free port.
const server = http.createServer((request, response) => {
  const url = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  if (url === '/') {
    response.setHeader('content-type', 'text/html')
    response.end(
      '<!doctype html><body style="margin:0;background:#000"><script type="module" src="/stage.js"></script>',
    )
  } else if (url === '/favicon.ico') {
    response.statusCode = 204
    response.end()
  } else if (url === '/stage.js') {
    response.setHeader('content-type', 'text/javascript')
    response.end(script)
  } else {
    const file = path.join(process.cwd(), 'public', path.normalize(url))
    if (!file.startsWith(path.join(process.cwd(), 'public')) || !fs.existsSync(file)) {
      response.statusCode = 404
      response.end()
      return
    }
    response.end(fs.readFileSync(file))
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
await page.goto(origin, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => !!window.loops)

const report = {}
for (const slug of wanted) {
  await page.evaluate(
    (name, period, detail) => window.loops.setup(name, period, detail),
    slug,
    SECONDS,
    DETAIL[slug] ?? 2,
  )
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${slug}-loop-`))
  const total = Math.round((SECONDS + CROSSFADE) * FPS)
  for (let i = 0; i < total; i++) {
    const data = await page.evaluate((t) => {
      window.loops.frame(t)
      return document.getElementById('frame').toDataURL('image/png')
    }, i / FPS)
    fs.writeFileSync(
      path.join(dir, `frame-${String(i).padStart(5, '0')}.png`),
      Buffer.from(data.split(',')[1], 'base64'),
    )
  }
  report[slug] = encodeLoop({
    frames: dir,
    fps: FPS,
    seconds: SECONDS,
    crossfade: CROSSFADE,
    out: path.join('public/work', slug),
    grade: GRADE,
  })
  fs.rmSync(dir, { recursive: true, force: true })
  console.log(slug, JSON.stringify(report[slug]))
}
await browser.close()
server.close()
if (errors.length) console.warn('page errors:', errors.slice(0, 5))
