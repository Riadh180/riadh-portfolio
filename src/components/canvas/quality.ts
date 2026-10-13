export type Quality = {
  /** Simulation texture size: simSize² particles. */
  simSize: number
  maxDpr: number
}

/**
 * Initial tier from cheap signals; measured FPS (PerformanceMonitor in SceneCanvas) then
 * lowers DPR at runtime. Touch / few cores reduce particles and DPR.
 */
export function detectQuality(): Quality {
  const touch = window.matchMedia('(pointer: coarse)').matches
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4
  const dpr = window.devicePixelRatio

  return touch || fewCores
    ? { simSize: 64, maxDpr: Math.min(dpr, 1.5) }
    : { simSize: 96, maxDpr: Math.min(dpr, 2) }
}

/**
 * Per-place DPR ceilings. The Work spine fills the screen with heavy per-pixel shading,
 * so the Work place renders at most at 1.5× (keeps 50+ fps on an integrated GPU at
 * Retina). Applied on top of the device / measured DPR.
 */
export const PLACE_MAX_DPR = {
  work: 1.5,
} as const
