import { useFrame } from '@react-three/fiber'
import { type ReactNode, useRef } from 'react'
import type { Group } from 'three'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { JourneyState } from '../journey/path'
import { drift, MOTION, Spring3 } from './motion'

type Props = {
  journey: JourneyState
  /** Distinct per subject, so they don't breathe in unison. */
  seed: number
  /** Scales the idle drift (big, heavy things move less). */
  weight?: number
  /**
   * Idle rotation too (default). Off for subjects placed far from the world origin (The Core,
   * the tagline): the group pivots on the origin, so a tiny sway would swing them sideways.
   */
  rotate?: boolean
  children: ReactNode
}

/**
 * Gives a place or subject the shared weight: it is dragged a little with the camera and
 * springs back after (the slower secondary settle, overshooting slightly), and it breathes
 * with a slow idle drift in position and rotation, so it never comes to a dead stop.
 */
export function Drift({ journey, seed, weight = 1, rotate = true, children }: Props) {
  const enabled = !useReducedMotion()
  const group = useRef<Group>(null)
  const lag = useRef(new Spring3(MOTION.lag))

  useFrame(({ clock }, delta) => {
    const g = group.current
    if (!g) return
    if (!enabled) {
      g.position.set(0, 0, 0)
      g.rotation.set(0, 0, 0)
      return
    }
    const l = lag.current
    // Dragged along with the camera (capped), released when it stops.
    const pull = Math.max(-1.6, Math.min(1.6, journey.velocity * MOTION.lagAmount))
    l.step(0, pull, 0, Math.min(delta, 1 / 30))
    const t = clock.elapsedTime
    const p = MOTION.idle.position / weight
    const r = rotate ? MOTION.idle.rotation / weight : 0
    g.position.set(drift(t, seed) * p, l.y.value + drift(t, seed + 9) * p, drift(t, seed + 17) * p)
    // The drag alone, for a subject that has to hold its place in the frame (The Core at Contact).
    g.userData.lag = l.y.value
    g.rotation.set(
      drift(t, seed + 3) * r,
      drift(t, seed + 5) * r * 1.4,
      drift(t, seed + 7) * r * 0.5,
    )
  })

  return <group ref={group}>{children}</group>
}
