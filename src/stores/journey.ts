import { create } from 'zustand'

/**
 * Where the visitor is on the camera path, shared by the page (HTML) and the 3D scene.
 * `progress` runs 0 (hero) → 1 (statement), from the smoothed scroll position. The scene
 * reads it every frame without re-rendering; the HTML subscribes to `statement`, which flips
 * with some hysteresis so a small scroll back doesn't hide the text again.
 */
type Journey = {
  progress: number
  statement: boolean
  setProgress: (progress: number) => void
}

const SHOW_AT = 0.6
const HIDE_AT = 0.4

export const useJourney = create<Journey>()((set, get) => ({
  progress: 0,
  statement: false,
  setProgress: (progress) => {
    const current = get()
    const statement = progress >= SHOW_AT ? true : progress <= HIDE_AT ? false : current.statement
    if (progress !== current.progress || statement !== current.statement)
      set({ progress, statement })
  },
}))
