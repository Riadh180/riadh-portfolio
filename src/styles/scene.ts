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
  pink: new Color(palette.pink),
  emerald: new Color(palette.emerald),
  glow: new Color(palette.glow),
  warm: new Color(palette.warm),
  /** Tint of clear glass. */
  glass: new Color(palette.text),
}

export type SceneColor = keyof typeof sceneColors

export const sceneConfig = {
  particles: {
    /** World-space size of an in-focus particle. */
    size: 0.022,
    /** Depth-of-field strength: how fast particles blur away from the focus plane. */
    aperture: 1.2,
    focusDistance: 10,
    brightness: 0.75,
  },
  flow: {
    speed: 0.12,
    scale: 0.12,
    drift: 0.015,
  },
  emblem: {
    /** Max tilt toward the cursor, in radians (small and late, as in the reference). */
    tilt: 0.25,
    /** Breathing float amplitude. */
    float: 0.06,
    /** Seconds per idle half turn (a full turn every ~7.5s). */
    halfTurn: 3.75,
    /** 0..1: how long it lingers face-on before passing edge-on. */
    dwell: 0.85,
  },
  glass: {
    /** Fraction of light passing through; the rest is lit glass body (soft grey-silver). */
    transmission: 1,
    thickness: 0.6,
    /** Frosted a little: the tube body lightens and the highlights stay soft and continuous. */
    roughness: 0.2,
    ior: 1.5,
    /** Kept low: the colour comes from thin-film iridescence, not dispersion. */
    dispersion: 0.3,
    /** Thin-film rainbow (pink / green / blue) sliding over the surface as it turns. */
    iridescence: 0.6,
    iridescenceIOR: 1.3,
    iridescenceMin: 100,
    iridescenceMax: 400,
  },
  light: {
    /** Strength of the corner light bleeds. */
    corners: 0.12,
    /** Seconds between warm light moments. */
    warmPeriod: 9,
    /** How far the key light shifts toward the warm accent at the peak. */
    warmth: 0.85,
  },
  cursor: {
    strength: 0.6,
    radius: 0.006,
  },
  bloom: {
    intensity: 1.4,
    threshold: 0.6,
    smoothing: 0.25,
    radius: 0.7,
  },
  chromatic: {
    /**
     * Radial offset at rest: kept tiny, since larger offsets break thin glass rims into
     * dashes. The visible chromatic moments are the spikes (scroll, transitions).
     */
    offset: 0.0003,
    modulationOffset: 0.22,
  },
  grade: {
    contrast: 1.0,
    grain: 0.03,
    vignette: 0.45,
  },
}
