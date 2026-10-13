/** Glyphs a scrambling letter flickers through. */
const GLYPHS = 'ABCDEFGHKMNPRSTUVWXYZ0123456789<>/+=#%*'

/** How long a title takes to resolve, in seconds (MOTION.md: ~1–1.5s). */
export const SCRAMBLE_DURATION = 1.2

export type ScrambledChar = {
  char: string
  /** 0..1: how far its ghost copy is offset sideways (doubled / ghosted letters). */
  ghost: number
}

/**
 * A title mid-scramble, `elapsed` seconds after hover: letters start doubled and ghosted,
 * flicker through random glyphs, and resolve left to right into the clean title. Spaces
 * and punctuation stay put. Deterministic for a given time, so text, 3D and HTML agree.
 */
export function scramble(text: string, elapsed: number): ScrambledChar[] {
  const t = elapsed / SCRAMBLE_DURATION
  const tick = Math.floor(elapsed * 24)
  return [...text].map((char, i) => {
    const resolveAt = 0.25 + (i / Math.max(1, text.length - 1)) * 0.65
    const left = Math.max(0, Math.min(1, (resolveAt - t) / 0.3))
    const keep = /[\s·.,:%<>−\-+]/.test(char) || left === 0
    const flicker = GLYPHS[(i * 7 + tick * 13 + char.charCodeAt(0)) % GLYPHS.length] ?? char
    return { char: keep ? char : flicker, ghost: left }
  })
}

/** Plain-string version (for HTML), ghosts dropped. */
export function scrambleText(text: string, elapsed: number) {
  return scramble(text, elapsed)
    .map((c) => c.char)
    .join('')
}
