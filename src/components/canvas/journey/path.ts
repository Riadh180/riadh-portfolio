import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { useJourney } from '@/stores/journey'
import { DESCENT } from './descent'

export { DESCENT }
import { COLUMN_SPACING, SPIRAL, orbitPose } from '../work/layout'

/** The places along the camera path (world y of each place's focus). */
export const PLACES = {
  hero: 0,
  statement: -12,
  /** Where the Work place's own origin sits (the spine's centre). */
  work: -32,
  /** The skills graph's centre (The Core). */
  system: -54,
}

/** The System place: the graph right of centre, seen from further back (it's wide). */
export const SYSTEM = { x: 2.2, distance: 14, phoneDistance: 24, swing: 0.45 }

/**
 * The Work place's layout, in its own space: the spine on the axis, the cards stacked
 * down it (see WorkCards). The camera walks down the cards, so these match WorkCards.
 */
export const WORK = {
  cards: 6,
  /** Shifted right of centre, leaving the left column to the list and details. */
  x: 1.1,
  /** Camera distance from the spine, and how far it turns round it on the way down. */
  distance: 7.8,
}

/** Seconds The Core takes to travel to the statement (or back). */
const OBJECTS_TRAVEL = 1.4

const smooth = (p: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, p)))) / 2

function descend(toWork: number) {
  const { holdFrom, holdTo } = DESCENT
  if (toWork <= holdFrom) return 0.5 * smooth(toWork / holdFrom)
  if (toWork <= holdTo) return 0.5
  return 0.5 + 0.5 * smooth((toWork - holdTo) / (1 - holdTo))
}

/**
 * The journey as the scene sees it, updated once per frame before anything else.
 * `camera` (hero → statement), `toWork` (statement → Work), `inWork` (down the cards) and
 * `toSystem` (on to the skills graph) follow the smoothed scroll directly (Lenis settles a
 * tick in ~0.7s); `objects` (The Core's move to the statement) plays on its own clock once
 * triggered. With reduced motion there is no flight: it cuts between places and cards.
 */
export class JourneyState {
  /** 0 (hero) → 1 (statement). */
  camera = 0
  /** 0 (hero) → 1 (statement) for the objects that move with it, on their own clock. */
  objects = 0
  private heading = 0
  /** 0 (statement) → 1 (arrived at Work). */
  toWork = 0
  /** 0 (first card) → 1 (last card). */
  inWork = 0
  /** 0 (last card) → 1 (arrived at System). */
  toSystem = 0
  private time = 0
  /** Phones: the cards hang in a column; the camera rides straight down it. */
  column = false
  /** World y of the camera's focus on the path. */
  y = PLACES.hero
  /** Where the descent holds: the wireframe's height, and the camera's distance there. */
  formY = 0
  formDistance = 10
  /** Camera orbit round the path's axis: angle (radians) and distance. */
  angle = 0
  distance = 10

  update(delta: number, reducedMotion: boolean, column: boolean) {
    const progress = useJourney.getState().progress
    this.column = column
    let camera = Math.min(1, progress)
    let toWork = Math.min(1, Math.max(0, progress - 1))
    let inWork = Math.min(1, Math.max(0, progress - 2))
    let toSystem = Math.min(1, Math.max(0, progress - 3))
    this.time += reducedMotion ? 0 : Math.min(delta, 1 / 30)
    if (reducedMotion) {
      toSystem = toSystem > 0.5 ? 1 : 0
      camera = camera > 0.5 ? 1 : 0
      toWork = toWork > 0.5 ? 1 : 0
      inWork = Math.round(inWork * (WORK.cards - 1)) / (WORK.cards - 1)
    }
    this.camera = camera
    this.toWork = toWork
    this.inWork = inWork
    this.toSystem = toSystem
    // The Core's move to the statement plays on its own clock once triggered (~1.4s), so
    // the slit always lands in front of the tagline, however fast the scroll.
    if (camera > 0.55) this.heading = 1
    else if (camera < 0.35) this.heading = 0
    const step = Math.min(delta, 1 / 30) / OBJECTS_TRAVEL
    this.objects = reducedMotion
      ? this.heading
      : this.objects + Math.max(-step, Math.min(step, this.heading - this.objects))

    // Hero → statement → the top of the Work column, then down it card by card.
    const statementY = PLACES.hero + (PLACES.statement - PLACES.hero) * smooth(camera)
    const workTop = PLACES.work + this.cardY(0)
    const workY = PLACES.work + this.cardY(inWork * (WORK.cards - 1))
    const arrive = descend(toWork)
    this.y = toWork < 1 ? statementY + (workTop - statementY) * arrive : workY
    this.formY = statementY + (workTop - statementY) * 0.5
    this.formDistance = 10 + ((column ? 7.2 : WORK.distance) - 10) * 0.5
    // At Work: closer, and a slow turn round the spine on the way down (desktop only).
    const workDistance = column ? 7.2 : WORK.distance
    this.distance = 10 + (workDistance - 10) * arrive
    this.angle = column ? 0 : inWork * SPIRAL * arrive

    // On down from the last card to the skills graph, then a slow swing round it.
    if (toSystem > 0) {
      const down = smooth(toSystem)
      const systemDistance = column ? SYSTEM.phoneDistance : SYSTEM.distance
      this.y = workY + (PLACES.system - workY) * down
      this.distance = workDistance + (systemDistance - workDistance) * down
      const swing = Math.sin(this.time * 0.07) * SYSTEM.swing
      this.angle = this.angle * (1 - down) + (column ? 0 : swing) * down
    }
  }

  /** Height (Work space) where the camera centres on card `index` (fractional between). */
  cardY(index: number) {
    // Phones: the card sits in the upper half, the next one below the title at the bottom.
    if (this.column) return -index * COLUMN_SPACING - 0.6
    const below = Math.floor(index)
    const above = Math.min(WORK.cards - 1, below + 1)
    const t = index - below
    const y = (i: number) => orbitPose(i, WORK.cards).y + 0.15
    return y(below) + (y(above) - y(below)) * t
  }
}

export function useJourneyState(reducedMotion: boolean) {
  const [journey] = useState(() => new JourneyState())
  useFrame(({ size }, delta) => journey.update(delta, reducedMotion, size.width < 700), -4)
  return journey
}
