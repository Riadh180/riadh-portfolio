// Prints /cv to public/cv/riadh-souissi-cv.pdf with the local Chrome (A4, print styles).
// Run with the site served locally: `npm run dev` (or `npm start`), then `npm run cv:pdf`.
// Usage: node scripts/cv-pdf.mjs [baseUrl]
import puppeteer from 'puppeteer-core'

const base = process.argv[2] ?? 'http://localhost:3000'
const chrome =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const browser = await puppeteer.launch({ executablePath: chrome, headless: true })
const page = await browser.newPage()
await page.goto(`${base}/cv`, { waitUntil: 'networkidle0' })
await page.evaluate(() => document.fonts.ready)
await page.pdf({
  path: 'public/cv/riadh-souissi-cv.pdf',
  format: 'A4',
  // No backgrounds: the CV is black on white; the site's dark canvas would fill the margins.
  printBackground: false,
  // Margins from the renderer (unpainted, white); CSS @page margins take the page colour.
  margin: { top: '16mm', right: '16mm', bottom: '18mm', left: '16mm' },
})
await browser.close()
console.log('wrote public/cv/riadh-souissi-cv.pdf')
