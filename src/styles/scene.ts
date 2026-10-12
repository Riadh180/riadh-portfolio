import { Color } from 'three'
import { palette } from './tokens'

/**
 * Live scene settings, seeded from the design tokens.
 * Shaders hold references to these Color objects, so the dev panel can retune
 * them without re-creating materials. Numbers are read every frame.
 */
export const sceneColors = {
  bg: new Color(palette.bg),
  blue: new Color(palette.blue),
  teal: new Color(palette.teal),
  emerald: new Color(palette.emerald),
  glow: new Color(palette.glow),
}

export type SceneColor = keyof typeof sceneColors

export const sceneConfig = {
  particles: {
    /** World-space size of an in-focus particle. */
    size: 0.03,
    /** Depth-of-field strength: how fast particles blur away from the focus plane. */
    aperture: 1.4,
    focusDistance: 10,
    brightness: 1.4,
  },
  flow: {
    speed: 0.32,
    scale: 0.16,
    /** Horizontal current along the streams. */
    drift: 0.12,
    /** How tightly particles are gathered into the three streams. */
    streamPull: 0.55,
  },
  cursor: {
    strength: 1.0,
    radius: 0.006,
  },
  light: {
    /** Intensity of the soft colored light pools behind the field. */
    pools: 0.06,
  },
  bloom: {
    intensity: 1.1,
    threshold: 0.55,
    smoothing: 0.3,
    radius: 0.72,
  },
  chromatic: {
    /** Radial offset at rest: clean center, fringes toward the edges. */
    offset: 0.0016,
    modulationOffset: 0.22,
  },
  grade: {
    contrast: 1.08,
    grain: 0.06,
    vignette: 0.35,
  },
}
