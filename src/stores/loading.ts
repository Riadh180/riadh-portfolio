import { create } from 'zustand'

/** What has to be ready before The Core resolves: each real, none faked. */
export type LoadStep = 'fonts' | 'scene' | 'assets' | 'shaders'
const STEPS: LoadStep[] = ['fonts', 'scene', 'assets', 'shaders']

type LoadingState = {
  done: Record<LoadStep, boolean>
  /** Scene time (performance.now() / 1000) the reveal started; -Infinity = no intro. */
  revealAt: number | null
  complete: (step: LoadStep) => void
  reveal: () => void
  /** Repeat visit (or no WebGL): no preloader, The Core is simply there. */
  skip: () => void
}

export const useLoading = create<LoadingState>()((set, get) => ({
  done: { fonts: false, scene: false, assets: false, shaders: false },
  revealAt: null,
  complete: (step) => {
    if (get().done[step]) return
    // Marks for the performance timeline (when each step landed).
    performance.mark(`signal:${step}`)
    set({ done: { ...get().done, [step]: true } })
  },
  reveal: () => {
    if (get().revealAt !== null) return
    performance.mark('signal:reveal')
    set({ revealAt: performance.now() / 1000 })
  },
  skip: () => set({ revealAt: -Infinity }),
}))

/** Share of the steps that are done, 0..1. */
export function loadProgress(done: Record<LoadStep, boolean>) {
  return STEPS.filter((step) => done[step]).length / STEPS.length
}

/** 0 before the reveal, easing to 1 over `length` seconds after it (1 at once if skipped). */
export function revealed(length: number, delay = 0) {
  const at = useLoading.getState().revealAt
  if (at === null) return 0
  const t = Math.min(1, Math.max(0, (performance.now() / 1000 - at - delay) / length))
  return 1 - (1 - t) ** 4
}
