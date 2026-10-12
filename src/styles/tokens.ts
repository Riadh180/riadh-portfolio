/**
 * Design tokens — the single source of truth for color and motion.
 * Exported to CSS variables (see `cssVariables`) and, later, to shader uniforms.
 * Changing the palette = editing this file only.
 */

export const palette = {
  bg: '#050B12',
  bgElevated: '#0B1622',
  text: '#E8F1F2',
  muted: '#7D8A94',
  line: '#1A2733',
  blue: '#3A7BFF',
  teal: '#12B5B0',
  emerald: '#10D19A',
  glow: '#7FF5E1',
  warm: '#FFB36B',
} as const

export type ColorToken = keyof typeof palette

export const motion = {
  /** Default transition curve: heavy in, heavy out. */
  easeInOut: [0.76, 0, 0.24, 1],
  durationUi: 0.4,
  durationBig: 1.1,
} as const

/** Text/background pairs that must pass WCAG AA (checked by `npm run check:contrast`). */
export const contrastPairs: ReadonlyArray<{
  fg: ColorToken
  bg: ColorToken
  /** 4.5 for body text, 3 for large display text and UI marks. */
  min: number
}> = [
  { fg: 'text', bg: 'bg', min: 4.5 },
  { fg: 'text', bg: 'bgElevated', min: 4.5 },
  { fg: 'muted', bg: 'bg', min: 4.5 },
  { fg: 'muted', bg: 'bgElevated', min: 4.5 },
  { fg: 'glow', bg: 'bg', min: 4.5 },
  { fg: 'emerald', bg: 'bg', min: 4.5 },
  { fg: 'warm', bg: 'bg', min: 4.5 },
  { fg: 'blue', bg: 'bg', min: 3 },
]

const toKebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

const [x1, y1, x2, y2] = motion.easeInOut

export const cssVariables: Record<`--${string}`, string> = {
  ...Object.fromEntries(Object.entries(palette).map(([key, hex]) => [`--${toKebab(key)}`, hex])),
  '--motion-ease': `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`,
  '--motion-duration-ui': `${motion.durationUi}s`,
  '--motion-duration-big': `${motion.durationBig}s`,
}
