import { Color } from 'three'
import type { GlassLook } from '@/components/canvas/hero/glassLook'
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
  ember: new Color(palette.ember),
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
    /** Low: the screen stays mostly dark; the dust lives in the slab and the opening cloud. */
    brightness: 0.2,
  },
  flow: {
    speed: 0.12,
    scale: 0.12,
    drift: 0.015,
  },
  emblem: {
    /** Overall size: small and delicate, like the reference. */
    scale: 0.65,
    /** Max tilt toward the cursor, in radians (small and late, as in the reference). */
    tilt: 0.25,
    /** Breathing float amplitude. */
    float: 0.06,
    /** Seconds per idle half turn (a full turn every ~7.5s). */
    halfTurn: 3.75,
    /** 0..1: how long it lingers face-on before passing edge-on. */
    dwell: 0.85,
  },
  /**
   * The hero's glass look, locked: variant B "bright cut" from /lab with a teal / violet
   * body and a small pink-white sparkle. Light rig and material (see GlassLook).
   */
  glass: {
    key: 900,
    edge: 11,
    edgeEven: 0.9,
    edgeSpread: 16,
    follow: 0.9,
    rim: 0.5,
    face: 2,
    envIntensity: 1.6,
    transmission: 1,
    roughness: 0.1,
    thickness: 0.4,
    iridescence: 1,
    spots: 0.7,
    faceFilm: 0.9,
    mottling: 0.08,
  } satisfies GlassLook,
  light: {
    /** Strength of the corner light bleeds. */
    corners: 0.12,
    /** Seconds between warm light moments. */
    warmPeriod: 9,
    /** How far the key light shifts toward the warm accent at the peak. */
    warmth: 0.85,
  },
  /**
   * Work: the spine, one heavy sculpted column of fused, chunky glass-dark pieces in The
   * Core's language (tune at /lab/work).
   */
  spine: {
    /** Pieces stacked up the column (slabs, key blocks, fins). */
    pieces: 72,
    /** Height of the column. */
    height: 13,
    /** Turn between one piece and the next, in radians. */
    twist: 0.7,
    /** Sideways wander off the axis and tilt of each piece. */
    offset: 0.16,
    tilt: 0.38,
    /** Share of pieces that are thin fins sticking out. */
    fins: 0.18,
    /** Sculpting: how much the surface bulges. */
    bulge: 0.06,
    /** Slow turn of the whole column, radians per second. */
    turn: 0.05,
    /** Oily sheen strength and how glossy the dark body is. */
    sheen: 0.85,
    gloss: 0.72,
  },
  /**
   * Work's own, much darker light rig (the hero's is built for thin glass and would turn a
   * glossy mass white): a dim edge band and fill, so the oily sheen shows only where light
   * catches the bulges. Overrides the hero look's light values at the Work place.
   */
  workLight: {
    key: 160,
    edge: 1.6,
    face: 0.2,
  },
  /** Work: round coloured pebbles clumped round the spine and in a few small clouds. */
  pebbles: {
    count: 7000,
    size: 0.022,
    brightness: 1,
    /** Distance from the axis where they gather. */
    radius: 0.95,
    /** How tightly they hug the column (higher = tighter). */
    hug: 0.7,
    /** Share that sit in the small clouds away from the column. */
    clouds: 0.12,
    /** Rise speed up the column, units per second. */
    rise: 0.18,
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
