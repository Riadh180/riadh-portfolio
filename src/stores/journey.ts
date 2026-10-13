import { create } from 'zustand'

export type Place = 'hero' | 'statement' | 'work' | 'system'

/**
 * Where the visitor is on the camera path, shared by the page (HTML) and the 3D scene.
 * `progress` runs 0 (hero) → 1 (statement) → 2 (arriving at Work) → 3 (end of Work) → 4
 * (System), from
 * the smoothed scroll position. The scene reads it every frame without re-rendering; the
 * HTML subscribes to `place`, which flips with some hysteresis so a small scroll back
 * doesn't flicker. `jump` (registered by the smooth scroll) moves the page to a progress.
 */
type Journey = {
  progress: number
  place: Place
  /** Kept for the statement text: true while at the statement. */
  statement: boolean
  setProgress: (progress: number) => void
  jump: (progress: number) => void
  setJump: (jump: (progress: number) => void) => void
}

/** Where each place begins on the way down (and, minus HYSTERESIS, ends on the way up). */
const ENTER = { statement: 0.6, work: 1.7, system: 3.6 }
const HYSTERESIS = 0.2

function placeAt(progress: number, current: Place): Place {
  const down = (from: number) => progress >= from
  const up = (from: number) => progress >= from - HYSTERESIS
  const keep = (place: Place, enter: number) => (current === place ? up(enter) : down(enter))
  if (keep('system', ENTER.system)) return 'system'
  if (keep('work', ENTER.work)) return 'work'
  if (keep('statement', ENTER.statement)) return 'statement'
  return 'hero'
}

export const useJourney = create<Journey>()((set, get) => ({
  progress: 0,
  place: 'hero',
  statement: false,
  setProgress: (progress) => {
    const current = get()
    const place = placeAt(progress, current.place)
    if (progress !== current.progress || place !== current.place) {
      set({ progress, place, statement: place === 'statement' })
    }
  },
  jump: () => {},
  setJump: (jump) => set({ jump }),
}))
