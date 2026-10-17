import { useJourney } from '@/stores/journey'

/** Progress past which the visitor has left the hero (the first scroll is under way). */
const LEFT_HERO = 0.3

/**
 * Resolves once the visitor has left the hero (at once on a page that starts further down,
 * e.g. /work/<slug>). Heavy media for the places further down waits for it, so nothing but
 * the hero loads while the hero is all there is to see.
 */
export function afterHero() {
  return new Promise<void>((resolve) => {
    if (useJourney.getState().progress >= LEFT_HERO) return resolve()
    const stop = useJourney.subscribe((state) => {
      if (state.progress < LEFT_HERO) return
      stop()
      resolve()
    })
  })
}
