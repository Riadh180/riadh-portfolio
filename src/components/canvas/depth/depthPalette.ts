import { Color } from 'three'
import { sceneColors } from '@/styles/scene'

/**
 * Depth's colours, in one place: a dark, wet, precious deep (at_10 / at_11), colour only in
 * the light. Gems and roots a deep emerald with aqua only at the tips; caustics pale
 * aqua-white; no flat neon green.
 */
function build(variant: 'emerald' | 'teal') {
  const deep = variant === 'emerald' ? sceneColors.emerald : sceneColors.blue
  const gem = new Color().copy(sceneColors.emerald).lerp(sceneColors.bg, 0.55)
  return {
    /** Gems, lattice and roots: deep, dark emerald. */
    gem,
    /** Their bright tips and pulses: aqua. */
    tip: new Color().copy(sceneColors.glow).lerp(sceneColors.glass, 0.25),
    /** Water seen from below. */
    shallow: new Color()
      .copy(sceneColors.teal)
      .lerp(deep, 0.35)
      .lerp(sceneColors.bg, 0.45)
      .multiplyScalar(0.22),
    deepWater: new Color().copy(sceneColors.teal).lerp(deep, 0.3).multiplyScalar(0.035),
    /** Caustic light: pale aqua-white. */
    caustic: new Color().copy(sceneColors.glow).lerp(sceneColors.glass, 0.6).multiplyScalar(0.6),
    /** The backdrop's top (under the surface) and bottom (almost black). */
    top: new Color()
      .copy(sceneColors.teal)
      .lerp(deep, 0.4)
      .multiplyScalar(0.06)
      .lerp(sceneColors.bg, 0.75),
    bottom: new Color().copy(sceneColors.bg).multiplyScalar(0.55),
    /** The world haze's lean while in Depth. */
    accent: new Color().copy(deep).lerp(sceneColors.teal, 0.5).multiplyScalar(0.6),
  }
}

/**
 * Variant B, "deep teal-blue" (chosen over "deep emerald": closer to the reference Lab's
 * cold, dark mood). `build('emerald')` gives the other.
 */
export const depthPalette = build('teal')
