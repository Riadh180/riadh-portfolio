/**
 * Each place's ambient bed: a few soft, slightly detuned tones (Hz) through a low-pass
 * filter that breathes, plus a little filtered noise for air. Quiet, low, never melodic.
 * `at` is where on the journey (progress 0..7) the bed is fullest.
 */
export type Bed = {
  at: [number, number]
  tones: number[]
  wave: OscillatorType
  cutoff: number
  /** How much the filter breathes (Hz) and how fast (Hz). */
  sweep: number
  rate: number
  noise: number
  level: number
}

export const BEDS: Bed[] = [
  // Signal: a low, open fifth, teal and calm.
  {
    at: [0, 0.3],
    tones: [55, 82.4, 110.2],
    wave: 'sine',
    cutoff: 520,
    sweep: 180,
    rate: 0.05,
    noise: 0.05,
    level: 0.9,
  },
  // Approach: the same root, a third added, a touch brighter.
  {
    at: [1, 1],
    tones: [55, 69.3, 110, 164.8],
    wave: 'sine',
    cutoff: 760,
    sweep: 260,
    rate: 0.07,
    noise: 0.04,
    level: 0.75,
  },
  // Work: violet, a slow shimmer in a triangle voice.
  {
    at: [2, 3],
    tones: [49, 73.4, 98, 146.8],
    wave: 'triangle',
    cutoff: 900,
    sweep: 400,
    rate: 0.09,
    noise: 0.03,
    level: 0.6,
  },
  // System: cool, airy, a high harmonic.
  {
    at: [4, 4],
    tones: [61.7, 92.5, 123.5, 246.9],
    wave: 'sine',
    cutoff: 1200,
    sweep: 500,
    rate: 0.06,
    noise: 0.05,
    level: 0.6,
  },
  // Depth: under water, everything muffled, more noise.
  {
    at: [5, 5],
    tones: [41.2, 61.7, 82.4],
    wave: 'sine',
    cutoff: 320,
    sweep: 140,
    rate: 0.12,
    noise: 0.14,
    level: 1,
  },
  // Contact: warm, a major sixth, a little closer.
  {
    at: [6, 6],
    tones: [55, 69.3, 82.4, 92.5],
    wave: 'triangle',
    cutoff: 680,
    sweep: 220,
    rate: 0.05,
    noise: 0.03,
    level: 0.8,
  },
]

/** How strongly each bed plays at `progress`: full inside its span, fading over 0.8. */
export function bedWeights(progress: number) {
  // The loop (6 → 7) flows back into the hero's bed.
  const p = progress > 6.5 ? progress - 7 : progress
  const raw = BEDS.map(({ at: [from, to] }) => {
    const distance = p < from ? from - p : p > to ? p - to : 0
    return Math.max(0, 1 - distance / 0.8)
  })
  const sum = raw.reduce((a, b) => a + b, 0) || 1
  return raw.map((w) => w / sum)
}
