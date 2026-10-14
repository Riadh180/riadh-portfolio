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
  /** Depth's origin (its water surface sits SURFACE above it). */
  depth: -80,
  /** Where The Core rises for Contact. */
  contact: -106,
}

/** Depth: the panel right of centre, the camera close and looking up towards the surface. */
export const DEPTH = { x: 1.2, distance: 7.5, below: 2.6, lookUp: 1.3, phoneDistance: 12 }
/** Contact: The Core closer than on the hero; the loop pulls back to the hero's distance. */
export const CONTACT = { distance: 7, hero: 10 }

/** The System place: the graph right of centre, seen from further back (it's wide). */
export const SYSTEM = { x: 2.2, distance: 14, phoneDistance: 30, phoneShift: 0.24, swing: 0.45 }

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
 * `toSystem` (on to the skills graph), `toDepth`, `toContact` and `loop` follow the smoothed scroll directly (Lenis settles a
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
  /** 0 (System) → 1 (arrived at Depth). */
  toDepth = 0
  /** 0 (Depth) → 1 (arrived at Contact). */
  toContact = 0
  /** 0 (Contact) → 1 (the view has become the hero's again). */
  loop = 0
  /** The camera's vertical speed (world units / s), from the camera rig's spring. */
  velocity = 0
  /** How far above its focus the camera looks (Depth looks up at the surface). */
  lookUp = 0
  /**
   * Phones: how far the picture is shifted up (fraction of the screen height), so a
   * scene's subject sits in the upper part and the text below never covers it.
   */
  screenShift = 0
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

  /** Set by the camera rig each frame (its spring's vertical speed). */
  setVelocity(velocity: number) {
    this.velocity = velocity
  }

  update(delta: number, reducedMotion: boolean, column: boolean) {
    const progress = useJourney.getState().progress
    this.column = column
    let camera = Math.min(1, progress)
    let toWork = Math.min(1, Math.max(0, progress - 1))
    let inWork = Math.min(1, Math.max(0, progress - 2))
    let toSystem = Math.min(1, Math.max(0, progress - 3))
    let toDepth = Math.min(1, Math.max(0, progress - 4))
    let toContact = Math.min(1, Math.max(0, progress - 5))
    let loop = Math.min(1, Math.max(0, progress - 6))
    this.time += reducedMotion ? 0 : Math.min(delta, 1 / 30)
    if (reducedMotion) {
      toSystem = toSystem > 0.5 ? 1 : 0
      toDepth = toDepth > 0.5 ? 1 : 0
      toContact = toContact > 0.5 ? 1 : 0
      loop = loop > 0.5 ? 1 : 0
      camera = camera > 0.5 ? 1 : 0
      toWork = toWork > 0.5 ? 1 : 0
      inWork = Math.round(inWork * (WORK.cards - 1)) / (WORK.cards - 1)
    }
    this.camera = camera
    this.toWork = toWork
    this.inWork = inWork
    this.toSystem = toSystem
    this.toDepth = toDepth
    this.toContact = toContact
    this.loop = loop
    // The Core's move to the statement plays on its own clock once triggered (~1.4s), so
    // the slit always lands in front of the tagline, however fast the scroll.
    if (camera > 0.55) this.heading = 1
    else if (camera < 0.35) this.heading = 0
    // At Contact The Core is back in its hero pose: reset, so the loop's return to the top
    // finds it at the hero, not on its way back from the statement.
    if (toContact > 0.3) {
      this.heading = 0
      this.objects = 0
    }
    const step = Math.min(delta, 1 / 30) / OBJECTS_TRAVEL
    if (toContact <= 0.3) {
      this.objects = reducedMotion
        ? this.heading
        : this.objects + Math.max(-step, Math.min(step, this.heading - this.objects))
    }

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
    this.lookUp = 0
    this.screenShift = column ? SYSTEM.phoneShift * smooth(toSystem) : 0

    // On down through the water surface into Depth, looking up at it.
    if (toDepth > 0) {
      const down = smooth(toDepth)
      const depthDistance = column ? DEPTH.phoneDistance : DEPTH.distance
      this.y = PLACES.system + (PLACES.depth - DEPTH.below - PLACES.system) * down
      this.distance += (depthDistance - this.distance) * down
      this.angle *= 1 - down
      // Phones look lower, so the panel sits in the upper half, above the text.
      this.lookUp = (column ? -0.9 : DEPTH.lookUp) * down
      this.screenShift *= 1 - down
    }

    // On down into the dark, where The Core rises for Contact.
    if (toContact > 0) {
      const down = smooth(toContact)
      const depthY = PLACES.depth - DEPTH.below
      this.y = depthY + (PLACES.contact - depthY) * down
      this.distance += (CONTACT.distance - this.distance) * down
      this.lookUp *= 1 - down
    }

    // The loop: the camera pulls back to the hero's distance, so the view becomes the
    // hero's, and the page can jump back to the top without a visible cut.
    if (loop > 0) this.distance += (CONTACT.hero - this.distance) * smooth(loop)
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
