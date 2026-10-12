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
  violet: new Color(palette.violet),
  emerald: new Color(palette.emerald),
  glow: new Color(palette.glow),
  warm: new Color(palette.warm),
}

export type SceneColor = keyof typeof sceneColors

export const sceneConfig = {
  particles: {
    /** World-space size of an in-focus particle. */
    size: 0.022,
    /** Depth-of-field strength: how fast particles blur away from the focus plane. */
    aperture: 1.2,
    focusDistance: 10,
    brightness: 0.9,
  },
  flow: {
    speed: 0.12,
    scale: 0.12,
    drift: 0.015,
  },
  cursor: {
    strength: 0.6,
    radius: 0.006,
  },
  bloom: {
    intensity: 0.9,
    threshold: 0.7,
    smoothing: 0.25,
    radius: 0.7,
  },
  chromatic: {
    /** Radial offset at rest: clean center, fringes toward the edges. */
    offset: 0.0016,
    modulationOffset: 0.22,
  },
  grade: {
    contrast: 1.0,
    grain: 0.06,
    vignette: 0.45,
  },
}
