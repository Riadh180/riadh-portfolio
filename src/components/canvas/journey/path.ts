import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { useJourney } from '@/stores/journey'

/** The places along the camera path (world y of each place's focus). */
export const PLACES = {
  hero: 0,
  statement: -12,
  /** Where the Work place's own origin sits (the spine's centre). */
  work: -32,
}

/**
 * The Work place's layout, in its own space: the spine on the axis, the cards stacked
 * down it (see WorkCards). The camera walks down the cards, so these match WorkCards.
 */
export const WORK = {
  /** Height of the first and last card the camera centres on. */
  first: 1.6,
  spacing: 2.1,
  cards: 6,
  /** Shifted right of centre, leaving the left column to the list and details. */
  x: 1.1,
  /** Camera distance from the spine, and how far it turns round it on the way down. */
  distance: 7.8,
  spiral: 0.5,
}

const smooth = (p: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, p)))) / 2

/**
 * The journey as the scene sees it, updated once per frame before anything else.
 * `camera` (hero → statement), `toWork` (statement → Work) and `inWork` (down the cards)
 * follow the smoothed scroll directly (Lenis settles a tick in ~0.7s); `objects` lags the
 * first leg with a slower, softer settle (~1.5–2s) so the glass and dust trail the camera,
 * as in the reference. With reduced motion there is no flight: it cuts between places and
 * between cards.
 */
export class JourneyState {
  /** 0 (hero) → 1 (statement). */
  camera = 0
  objects = 0
  /** 0 (statement) → 1 (arrived at Work). */
  toWork = 0
  /** 0 (first card) → 1 (last card). */
  inWork = 0
  /** Phones: the cards hang in a column; the camera rides straight down it. */
  column = false
  /** World y of the camera's focus on the path. */
  y = PLACES.hero
  /** Camera orbit round the path's axis: angle (radians) and distance. */
  angle = 0
  distance = 10

  update(delta: number, reducedMotion: boolean, column: boolean) {
    const progress = useJourney.getState().progress
    this.column = column
    let camera = Math.min(1, progress)
    let toWork = Math.min(1, Math.max(0, progress - 1))
    let inWork = Math.min(1, Math.max(0, progress - 2))
    if (reducedMotion) {
      camera = camera > 0.5 ? 1 : 0
      toWork = toWork > 0.5 ? 1 : 0
      inWork = Math.round(inWork * (WORK.cards - 1)) / (WORK.cards - 1)
    }
    this.camera = camera
    this.toWork = toWork
    this.inWork = inWork
    this.objects = reducedMotion
      ? camera
      : this.objects + (camera - this.objects) * (1 - Math.exp(-Math.min(delta, 1 / 30) * 2.2))

    // Hero → statement → the top of the Work column, then down it card by card.
    const statementY = PLACES.hero + (PLACES.statement - PLACES.hero) * smooth(camera)
    const workTop = PLACES.work + this.cardY(0)
    const workY = PLACES.work + this.cardY(inWork * (WORK.cards - 1))
    const arrive = smooth(toWork)
    this.y = toWork < 1 ? statementY + (workTop - statementY) * arrive : workY
    // At Work: closer, and a slow turn round the spine on the way down (desktop only).
    const workDistance = column ? 7.2 : WORK.distance
    this.distance = 10 + (workDistance - 10) * arrive
    this.angle = column ? 0 : inWork * WORK.spiral * arrive
  }

  /** Height (Work space) where the camera centres on card `index` (fractional between). */
  cardY(index: number) {
    if (this.column) return -index * 1.4 - 0.35
    return WORK.first - index * WORK.spacing + 0.15
  }
}

export function useJourneyState(reducedMotion: boolean) {
  const [journey] = useState(() => new JourneyState())
  useFrame(({ size }, delta) => journey.update(delta, reducedMotion, size.width < 700), -4)
  return journey
}
