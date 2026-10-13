import { create } from 'zustand'

/**
 * The skill in focus (hovered or keyboard-focused) in the System place, shared by the 3D
 * graph and its HTML list: a skill name, a branch id, or null.
 */
type SystemState = {
  focused: string | null
  focus: (id: string | null) => void
}

export const useSystem = create<SystemState>()((set, get) => ({
  focused: null,
  focus: (id) => {
    if (get().focused !== id) set({ focused: id })
  },
}))
