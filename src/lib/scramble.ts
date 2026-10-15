/**
 * Look-alike glyphs per letter: the in-between state of a scramble still reads like the
 * word (similar shapes, never random symbols).
 */
const SIMILAR: Record<string, string> = {
  A: 'Λ4Д',
  B: '8ßЬ',
  C: 'ÇϹ(',
  D: 'ÐÞ',
  E: '3ΣЄ',
  F: 'ƑΓ',
  G: '6ĞĜ',
  H: 'ĦНИ',
  I: '1|Ї',
  J: 'ĴЈ',
  K: 'ĶΚ',
  L: '£Ł',
  M: 'ΜЛ',
  N: 'ИŃΝ',
  O: '0ØΘ',
  P: 'ÞΡ',
  Q: 'Ø0',
  R: 'ЯŘ',
  S: '5$Ş',
  T: '7ŦΤ',
  U: 'ÜЦ',
  V: 'ѴΥ',
  W: 'ШѠ',
  X: 'ЖΧ',
  Y: 'ҮΨ',
  Z: '2Ƶ',
  '0': 'OØ',
  '1': 'Il',
  '2': 'Z',
  '3': 'E',
  '4': 'A',
  '5': 'S',
  '6': 'G',
  '7': 'T',
  '8': 'B',
  '9': 'g',
}

/** How long a title takes to resolve, in seconds. */
export const SCRAMBLE_DURATION = 0.6

export type ScrambledChar = {
  char: string
  /** 0..1: how far its ghost copy is offset sideways (doubled / ghosted letters). */
  ghost: number
}

/**
 * A title mid-scramble, `elapsed` seconds after it starts: letters resolve left to right
 * through look-alike glyphs; from 60% of the time on, the word is correct but for one or two
 * letters still flickering. Spaces and punctuation stay put. Deterministic for a given
 * time, so text, 3D and HTML agree.
 */
export function scramble(text: string, elapsed: number): ScrambledChar[] {
  const t = elapsed / SCRAMBLE_DURATION
  const tick = Math.floor(elapsed * 24)
  const n = Math.max(1, text.length - 1)
  return [...text].map((char, i) => {
    // All but the last ~2 letters resolve by 60%; those by 100%.
    const resolveAt =
      0.08 + (i / n) * 0.52 + (i >= text.length - 2 ? 0.4 * ((i - (text.length - 3)) / 2) : 0)
    const left = Math.max(0, Math.min(1, (resolveAt - t) / 0.15))
    const upper = char.toUpperCase()
    const pool = SIMILAR[upper]
    const keep = !pool || left === 0
    const glyph = pool ? (pool[(i * 7 + tick * 13) % pool.length] ?? char) : char
    return { char: keep ? char : glyph, ghost: left }
  })
}

/** Plain-string version (for HTML), ghosts dropped. */
export function scrambleText(text: string, elapsed: number) {
  return scramble(text, elapsed)
    .map((c) => c.char)
    .join('')
}
