import { create } from 'zustand'
import type { WorkFilter } from '@/content/site'

/**
 * The Work place's shared state, used by the 3D cards, their HTML list and the detail
 * panel, so each lights up or opens the others.
 * - `focused`: the card hovered or keyboard-focused; `since` (ms) starts its title scramble.
 * - `opened`: the card flown in and dissolved, its details showing.
 * - `swipe`: phones, how far the card swipe has gone, in cards (0 = first card).
 * - `routed`: the URL has been read on the client.
 * - `filter`: the active work filter (jobs outside it dim, in the list and in 3D).
 */
type WorkState = {
  focused: string | null
  since: number
  focus: (slug: string | null) => void
  opened: string | null
  open: (slug: string) => void
  close: () => void
  swipe: number
  setSwipe: (swipe: number) => void
  /** True once the URL has been read on the client (until then a page can pre-open a card). */
  routed: boolean
  filter: WorkFilter | null
  setFilter: (filter: WorkFilter | null) => void
}

export const useWork = create<WorkState>()((set, get) => ({
  focused: null,
  since: 0,
  focus: (slug) => {
    if (get().focused !== slug) set({ focused: slug, since: performance.now() })
  },
  opened: null,
  open: (slug) => set({ opened: slug, focused: slug }),
  close: () => set({ opened: null }),
  swipe: 0,
  setSwipe: (swipe) => set({ swipe }),
  routed: false,
  filter: null,
  setFilter: (filter) => set({ filter }),
}))
