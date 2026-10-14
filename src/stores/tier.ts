import { create } from 'zustand'

/**
 * The rendering tier. Everyone starts on 'full'; when the measured frame rate stays below
 * the budget (55 fps), the scene drops once to 'lite' and stays there for the visit:
 * The Core keeps its glass but without the refraction pass, bloom is lighter, the card
 * frost takes fewer samples and the live card scenes update less often.
 */
export type Tier = 'full' | 'lite'

type TierState = {
  tier: Tier
  degrade: () => void
}

export const useTier = create<TierState>()((set) => ({
  tier: 'full',
  degrade: () => set({ tier: 'lite' }),
}))
