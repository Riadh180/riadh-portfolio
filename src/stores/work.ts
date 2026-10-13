import { create } from 'zustand'

/**
 * Which job card is in focus (hovered or keyboard-focused), shared by the 3D cards and
 * their HTML list, so either one lights up the other. `since` is when it changed (ms),
 * which starts the title scramble.
 */
type WorkState = {
  focused: string | null
  since: number
  focus: (slug: string | null) => void
  /** Phones: how far the card swipe has gone, in cards (0 = first card). */
  swipe: number
  setSwipe: (swipe: number) => void
}

export const useWork = create<WorkState>()((set, get) => ({
  focused: null,
  since: 0,
  focus: (slug) => {
    if (get().focused !== slug) set({ focused: slug, since: performance.now() })
  },
  swipe: 0,
  setSwipe: (swipe) => set({ swipe }),
}))
