import type { Place } from '@/stores/journey'

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
 * Per-place DPR ceilings, from production measurements on the reference machine (Intel HD
 * 630 at Retina): a place that falls below 55 fps at full DPR renders at most at 1.5×.
 * Applied on top of the device / measured DPR.
 */
export const PLACE_MAX_DPR: Record<Place, number> = {
  hero: 1.25,
  statement: 1.25,
  work: 1.4,
  system: 2,
  depth: 1.5,
  contact: 2,
}

/**
 * The lite tier's resolution ceiling: on integrated GPUs the full-screen passes (HDR
 * buffer, bloom, grade) scale with pixels, so the lite tier renders at 1×.
 */
export const LITE_MAX_DPR = 1
