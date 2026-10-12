/**
 * Shared transition state for the particle field. Anything (sections, the dev panel)
 * can ask the dust to assemble into a shape and to dissolve back out of it.
 */
export const particleTransition = {
  /** World-space points (xyz) the particles assemble into. */
  targets: null as Float32Array | null,
  /** Bumped when `targets` changes, so the simulation re-uploads them. */
  version: 0,
  /** 1 = assembled into `targets`, 0 = released back into dust. */
  form: 0,
}

export function formParticles(points: Float32Array) {
  particleTransition.targets = points
  particleTransition.version++
  particleTransition.form = 1
}

export function dissolveParticles() {
  particleTransition.form = 0
}
