// Gate: the phone number appears on /impressum only. Reads the number from the Impressum page's
// source (never printed) and looks for its digits, in any spacing, international or national,
// in (1) the production build output, (2) every live page and file of a running production
// server, (3) the CV PDF's text (macOS PDFKit).
//
//   node scripts/phone-only-impressum.mjs <url>
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const base = process.argv[2] ?? 'http://localhost:3100/'
const source = fs.readFileSync('src/app/impressum/page.tsx', 'utf8')
const phone = source.match(/const PHONE = '([^']+)'/)?.[1]
if (!phone) throw new Error('no PHONE constant in the Impressum page')
const digits = phone.replace(/\D/g, '')
const national = digits.startsWith('49') ? `0${digits.slice(2)}` : digits
// Any separators between the digits (spaces, dashes, slashes, dots, brackets, NBSP).
const pattern = (d) => d.split('').join('[\\s\\u00a0\\-/.()]*')
const finder = new RegExp(`(?:\\+?${pattern(digits)}|${pattern(national)})`)
const has = (text) => finder.test(text)

// (1) Build output: every text file under .next (not the cache).
const found = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'cache') walk(file)
    } else if (
      /\.(html|rsc|js|json|txt|body|meta|map|segments)$/.test(entry.name) ||
      !path.extname(entry.name)
    ) {
      if (has(fs.readFileSync(file, 'latin1'))) found.push(path.relative('.next', file))
    }
  }
}
walk('.next')
// Allowed: the Impressum route's own output, and server code that holds the Impressum page's
// module (Turbopack bundles server pages into shared chunks; never sent to a browser).
const impressumModule = (file) =>
  file.startsWith('server/') &&
  fs.readFileSync(path.join('.next', file), 'utf8').includes('Angaben gemäß § 5')
const client = found.filter((f) => f.startsWith('static/'))
const outside = found.filter((f) => !/impressum/.test(f) && !impressumModule(f))
console.log(
  `build output: ${found.length} file(s) carry it (${found.map((f) => f.replace(/^server\/chunks\/ssr\//, '')).join(', ')}); in client bundles: ${client.length}; anywhere but the Impressum page's own output and server module: ${outside.length}${outside.length ? ': ' + outside.join(', ') : ''}`,
)

// (2) Live: every route and public file.
const slugs = [...fs.readFileSync('src/content/site.ts', 'utf8').matchAll(/slug: '([^']+)'/g)].map(
  (m) => m[1],
)
const routes = [
  '/',
  '/cv',
  '/impressum',
  '/datenschutz',
  '/robots.txt',
  '/sitemap.xml',
  '/assets.json',
  '/a-page-that-does-not-exist',
  ...slugs.map((s) => `/work/${s}`),
]
const live = []
for (const route of routes) {
  const res = await fetch(new URL(route, base))
  const text = await res.text()
  live.push([route, res.status, has(text)])
}
const leaks = live.filter(([route, , hit]) => hit && route !== '/impressum')
const onImpressum = live.find(([route]) => route === '/impressum')?.[2]
console.log(
  `live: ${live.length} routes checked; on /impressum: ${onImpressum ? 'yes' : 'NO'}; elsewhere: ${leaks.length ? leaks.map(([r]) => r).join(', ') : 'none'}`,
)

// (3) The CV PDF's text, through macOS PDFKit.
const pdf = path.resolve('public/cv/riadh-souissi-cv.pdf')
const text = execFileSync('osascript', [
  '-l',
  'JavaScript',
  '-e',
  `ObjC.import('PDFKit'); const d = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(${JSON.stringify(pdf)})); d.string.js`,
]).toString()
// PDFKit returns this PDF's lines mirrored: search both ways, and the bare digit sequence too.
const mirrored = text
  .split('\n')
  .map((line) => [...line].reverse().join(''))
  .join('\n')
const bare = text.replace(/\D/g, '')
const inPdf =
  has(text) ||
  has(mirrored) ||
  [digits, national].some((d) => bare.includes(d) || bare.includes([...d].reverse().join('')))
const email = [text, mirrored].some((t) => t.includes('riadhsouissi@gmx.de'))
console.log(
  `CV PDF: ${text.length} characters of text, phone number ${inPdf ? 'FOUND' : 'absent'}; email ${email ? 'present' : 'missing'} (the text is read)`,
)
