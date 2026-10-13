import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { useJourney } from '@/stores/journey'

/** The places along the camera path (world y of each place's focus). */
export const PLACES = {
  hero: 0,
  statement: -12,
}

/** Ease for the camera's descent: leaves and arrives softly, moves steadily in between. */
const descent = (p: number) => (1 - Math.cos(Math.PI * p)) / 2

/**
 * The journey as the scene sees it, updated once per frame before anything else.
 * `camera` follows the smoothed scroll directly (Lenis settles a tick in ~0.7s); `objects`
 * lags it with a slower, softer settle (~1.5–2s) so the glass and dust trail the camera,
 * as in the reference. With reduced motion there is no flight: both snap between places.
 */
export class JourneyState {
  /** 0 (hero) → 1 (statement). */
  camera = 0
  objects = 0
  /** World y of the camera's focus on the path. */
  y = PLACES.hero

  update(delta: number, reducedMotion: boolean) {
    const progress = useJourney.getState().progress
    if (reducedMotion) {
      this.camera = this.objects = progress > 0.5 ? 1 : 0
    } else {
      this.camera = progress
      this.objects += (progress - this.objects) * (1 - Math.exp(-Math.min(delta, 1 / 30) * 2.2))
    }
    this.y = PLACES.hero + (PLACES.statement - PLACES.hero) * descent(this.camera)
  }
}

export function useJourneyState(reducedMotion: boolean) {
  const [journey] = useState(() => new JourneyState())
  useFrame((_, delta) => journey.update(delta, reducedMotion), -4)
  return journey
}
