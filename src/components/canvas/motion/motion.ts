/**
 * The site's one motion system. Every scene moves through these springs and drifts, so the
 * whole world shares one sense of weight: things overshoot a little and settle, lag behind
 * the camera, and never come to a dead stop.
 *
 * Springs are damped harmonic followers: `frequency` (Hz) sets how quickly they respond,
 * `damping` (ζ) how much they overshoot (1 = none, 0.6 ≈ a soft 10% overshoot).
 */

export type SpringConfig = { frequency: number; damping: number }

/** The shared feel, measured against the reference recording (docs/MOTION.md). */
export const MOTION = {
  /** The camera along the path: arrives with a slight overshoot, settles in ~1s. */
  camera: { frequency: 1.1, damping: 0.55 },
  /** Places and their subjects trailing the camera: softer, later (~1.5–2s settle). */
  lag: { frequency: 0.55, damping: 0.62 },
  /** How far objects trail the camera, per unit of camera speed (world units per u/s). */
  lagAmount: 0.18,
  /** Cursor-driven tilt and parallax: heavy, ~0.8–1s. */
  pointer: { frequency: 0.45, damping: 0.85 },
  /** UI and hover reactions: quick but still soft. */
  ui: { frequency: 3, damping: 0.75 },
  /**
   * The air: grains pushed by the cursor spring back home in ~1–1.5s with a tiny overshoot
   * (the cursor field), and the stirring settles at the same pace.
   */
  air: { frequency: 0.8, damping: 0.7 },
  /** Idle drift: amplitude (world units / radians) and speed of the never-still breathing. */
  idle: { position: 0.06, rotation: 0.025, speed: 0.12 },
} as const

/** A one-dimensional spring follower. */
export class Spring {
  value: number
  velocity = 0

  constructor(
    initial = 0,
    private config: SpringConfig = MOTION.camera,
  ) {
    this.value = initial
  }

  /** Steps towards `target`; stable for any frame time (sub-steps long frames). */
  step(target: number, delta: number) {
    const omega = 2 * Math.PI * this.config.frequency
    const zeta = this.config.damping
    let remaining = Math.min(delta, 0.1)
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120)
      const acceleration = omega * omega * (target - this.value) - 2 * zeta * omega * this.velocity
      this.velocity += acceleration * dt
      this.value += this.velocity * dt
      remaining -= dt
    }
    return this.value
  }

  /** Jumps to a value with no motion (reduced motion, teleports). */
  set(value: number) {
    this.value = value
    this.velocity = 0
  }
}

/** Springs for x, y, z. */
export class Spring3 {
  x: Spring
  y: Spring
  z: Spring

  constructor(config: SpringConfig, initial: [number, number, number] = [0, 0, 0]) {
    this.x = new Spring(initial[0], config)
    this.y = new Spring(initial[1], config)
    this.z = new Spring(initial[2], config)
  }

  step(x: number, y: number, z: number, delta: number) {
    this.x.step(x, delta)
    this.y.step(y, delta)
    this.z.step(z, delta)
  }
}

/**
 * Smooth, never-repeating idle drift in [-1, 1] for a given seed: a sum of slow sines at
 * unrelated frequencies, so a subject breathes without a visible loop.
 */
export function drift(t: number, seed: number) {
  const s = MOTION.idle.speed
  return (
    Math.sin(t * s * 1.0 + seed * 1.7) * 0.5 +
    Math.sin(t * s * 1.618 + seed * 4.1) * 0.3 +
    Math.sin(t * s * 2.718 + seed * 2.3) * 0.2
  )
}
