/**
 * Hero idle motion, timed against the reference recording (docs/MOTION.md):
 * a continuous slow turn that dwells face-on and passes quickly through edge-on,
 * and a brief warm light moment in an otherwise cool environment.
 */

/** Rotation (radians) at time t: one half turn every `halfTurn` seconds. dwell 0..1. */
export function idleSpin(t: number, halfTurn: number, dwell: number) {
  const u = t / halfTurn
  return Math.PI * (u - (dwell / (2 * Math.PI)) * Math.sin(2 * Math.PI * u))
}

/** 0..1 warm pulse, peaking once per `period` seconds and about 1.2s wide. */
export function warmPulse(t: number, period: number) {
  const phase = (t % period) / period
  return Math.pow(Math.sin(Math.PI * phase), 24)
}
