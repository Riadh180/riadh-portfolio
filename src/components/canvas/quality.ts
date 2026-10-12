export type Quality = {
  /** Simulation texture size: simSize² particles. */
  simSize: number
  maxDpr: number
}

/** Initial tier from cheap signals; FPS-based degrading then lowers DPR at runtime. */
export function detectQuality(): Quality {
  const touch = window.matchMedia('(pointer: coarse)').matches
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4
  const dpr = window.devicePixelRatio

  return touch || fewCores
    ? { simSize: 64, maxDpr: Math.min(dpr, 1.5) }
    : { simSize: 96, maxDpr: Math.min(dpr, 2) }
}
