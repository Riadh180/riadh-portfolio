/** WCAG 2.x contrast check for the token pairs declared in src/styles/tokens.ts. */
import { contrastPairs, palette } from '../src/styles/tokens.ts'

const channel = (value: number) => {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const luminance = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  )
}

const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

let failed = false
for (const { fg, bg, min } of contrastPairs) {
  const r = ratio(palette[fg], palette[bg])
  const ok = r >= min
  failed ||= !ok
  console.log(`${ok ? 'pass' : 'FAIL'}  ${fg} on ${bg}: ${r.toFixed(2)} (min ${min})`)
}
process.exit(failed ? 1 : 0)
