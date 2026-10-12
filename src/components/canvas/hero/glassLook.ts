/**
 * Everything that shapes how the emblem's glass reads, in one flat set of numbers: the light
 * rig it reflects and the material itself. The hero uses `sceneConfig.glass`; the dev lab
 * (/lab) compares several looks side by side and copies one back as JSON.
 */
export type GlassLook = {
  /** Top key light: the single strong hot spot. */
  key: number
  /** Edge-line brightness: the band of light round the emblem's plane that its bevels mirror. */
  edge: number
  /** 0 = edge lines swell and fade along the outline, 1 = evenly bright all round. */
  edgeEven: number
  /** Half-angle of that band in degrees: wider keeps the lines lit at steeper angles. */
  edgeSpread: number
  /** 0..1: how far the light rig turns with the emblem, so the edges stay lit as it turns. */
  follow: number
  /** The bevels' own faint glow: keeps the outline continuous at every angle of the turn. */
  rim: number
  /** Soft light behind the camera, mirrored by the flat faces: face brightness. */
  face: number
  /** Overall strength of the environment reflections. */
  envIntensity: number
  /** 1 = fully see-through glass; lower adds a lit, milky body. */
  transmission: number
  /** Roughness of the clean glass. */
  roughness: number
  /** Refraction depth: how strongly the background bends through the glass. */
  thickness: number
  /** Overall thin-film iridescence strength. */
  iridescence: number
  /** 0..1: size and strength of the pink-white iridescent zone at the top hot spot. */
  spots: number
  /** 0..1: teal / violet thin-film mottling over the glass body. */
  faceFilm: number
  /** 0..1: smudges and scratches on the faces (hazier, catching light). */
  mottling: number
}

/** Slider ranges [min, max, step] for the dev panels. */
export const lookRanges: Record<keyof GlassLook, [number, number, number]> = {
  key: [0, 200, 1],
  edge: [0, 30, 0.1],
  edgeEven: [0, 1, 0.01],
  edgeSpread: [5, 75, 1],
  follow: [0, 1, 0.01],
  rim: [0, 2, 0.01],
  face: [0, 6, 0.05],
  envIntensity: [0, 4, 0.05],
  transmission: [0, 1, 0.01],
  roughness: [0, 1, 0.01],
  thickness: [0, 2, 0.01],
  iridescence: [0, 1, 0.01],
  spots: [0, 1, 0.01],
  faceFilm: [0, 1, 0.01],
  mottling: [0, 1, 0.01],
}

/** The look's light-rig numbers, as a string: when it changes, the environment re-bakes. */
export const lightKey = (look: GlassLook) =>
  [look.key, look.edge, look.edgeEven, look.edgeSpread, look.face].join()

/** The look's texture numbers, as a string: when it changes, the surface maps rebuild. */
export const surfaceKey = (look: GlassLook) =>
  [look.roughness, look.spots, look.faceFilm, look.mottling].join()
