import { create } from 'zustand'

/**
 * What the custom cursor is over, from the 3D scene (the HTML side is read from the DOM):
 * a card ("open"), a skill node ("node"), The Core's glass ("glass"), or nothing.
 */
export type SceneCursor = 'open' | 'node' | 'glass' | null

type CursorState = {
  scene: SceneCursor
  setScene: (scene: SceneCursor) => void
  /** Clears `scene` only if it is still the given one (pointer-out after a newer over). */
  leave: (scene: SceneCursor) => void
}

export const useCursor = create<CursorState>()((set, get) => ({
  scene: null,
  setScene: (scene) => {
    if (get().scene !== scene) set({ scene })
  },
  leave: (scene) => {
    if (get().scene === scene) set({ scene: null })
  },
}))
