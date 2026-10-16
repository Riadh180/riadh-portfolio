/**
 * Hero idle motion, timed against the reference recording (docs/MOTION.md):
 * a continuous slow turn that dwells face-on and passes quickly through edge-on,
 * and a slow drift of the light from cool to one warm copper moment and back.
 */

/** Rotation (radians) at time t: one half turn every `halfTurn` seconds. dwell 0..1. */
export function idleSpin(t: number, halfTurn: number, dwell: number) {
  const u = t / halfTurn
  return Math.PI * (u - (dwell / (2 * Math.PI)) * Math.sin(2 * Math.PI * u))
}

/**
 * 0..1 light drift: cool for most of the cycle, easing into one warm copper moment once per
 * `period` seconds (about 2s above half strength, as in seg_00 at 4–5.5s) and back.
 */
export function lightDrift(t: number, period: number) {
  const phase = (t % period) / period
  return Math.pow(Math.sin(Math.PI * phase), 10)
}
