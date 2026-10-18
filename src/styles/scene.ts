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
    /** World-space size of an in-focus particle: fine grain, like everything else. */
    size: 0.008,
    /** Depth-of-field strength: how fast particles blur away from the focus plane. */
    aperture: 0.45,
    focusDistance: 10,
    /** Low: the screen stays mostly dark; the dust lives in the slab and the opening cloud. */
    brightness: 0.45,
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
    /** Seconds between warm light moments (the hero's drift: cool → warm copper → cool). */
    warmPeriod: 9,
    /** How far the light shifts toward the warm accent at the peak. */
    warmth: 0.85,
    /** Lite tier: a constant warm tint on the rims, standing in for the drift. */
    rimWarm: 0.35,
  },
  /**
   * The Core's bevel film: thickness range in nm (through orange, violet, blue, teal, green,
   * gold and pink), world units of outline per hue cycle, how far the cut edges take the
   * film's hue outright at the rainbow spot (0 = the physical film only, pastel under
   * bright light), and the spot's size (cosine threshold: lower is wider).
   */
  film: { min: 260, max: 560, cycle: 1.6, hue: 0.95, spot: 0.72 },
  /**
   * Coloured light-formers in the hero's environment (strength), so The Core's faces and
   * bevels carry colour, not just white: teal low left, violet right, a small amber accent
   * low right (full tier). Hero only: they fade as the camera leaves for Work.
   */
  formers: { teal: 1.6, violet: 1.3, amber: 2.2 },
  /**
   * Work: the spine, one heavy sculpted column of fused, chunky glass-dark pieces in The
   * Core's language (tune at /lab/work).
   */
  spine: {
    /** Pieces stacked up the column (slabs, key blocks, fins). */
    pieces: 72,
    /** Height of the Work span (cards and grains live in it). */
    height: 13,
    /**
     * Where the column itself starts and ends. Both tips dissolve into grains (the top over
     * 4 units, the bottom over 2.5), so no Work frame shows an end; the bottom has left the
     * frame before Work is hidden on the way to System.
     */
    top: 10,
    bottom: -12.2,
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
    /**
     * The free pockets' grains (desktop; phones a quarter). Most of Work's beads cling to the
     * column instead (Pebbles.tsx, ColumnBeads: 12k anchors from scripts/build-spine.mjs).
     */
    count: 6000,
    size: 0.022,
    brightness: 1,
    /** Distance from the axis where they gather. */
    radius: 1.5,
    /** How tightly they hug the column (higher = tighter). */
    hug: 0.75,
    /** Share that drift in the loose clouds between the cards. */
    clouds: 0.3,
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
  /** The one grade for every place (measured against the reference recording). */
  grade: {
    contrast: 1.0,
    grain: 0.04,
    vignette: 0.5,
    /** Black floor as a share of the background colour (linear): a lifted, cool charcoal. */
    lift: 0.22,
    /** How much the cool teal-grey leans into the shadows. */
    shadowTint: 0.18,
    /**
     * Muted world, vivid materials: the environment (haze, water, backdrops) is authored
     * muted, so the grade leaves colour alone; the ceiling only catches true neon.
     */
    saturation: 1,
    saturationCeiling: 2.4,
  },
}
