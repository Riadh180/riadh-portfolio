import { create } from 'zustand'

const KEY = 'signal-sound'

/** Sound on/off (off by default), remembered between visits. */
type SoundState = {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  /** Reads the remembered choice (client only). */
  restore: () => void
}

export const useSound = create<SoundState>()((set) => ({
  enabled: false,
  setEnabled: (enabled) => {
    set({ enabled })
    try {
      localStorage.setItem(KEY, enabled ? 'on' : 'off')
    } catch {
      // Storage blocked: the choice lasts for this visit only.
    }
  },
  restore: () => {
    try {
      if (localStorage.getItem(KEY) === 'on') set({ enabled: true })
    } catch {
      // Storage blocked: stay off.
    }
  },
}))
