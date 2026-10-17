import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { samplePhoneWireframe } from '../particles/targets'
import { dissolveParticles, formParticles } from '../particles/transitions'
import type { SceneClock } from '../useSceneClock'
import { DESCENT, type JourneyState } from './path'

type Props = { journey: JourneyState; simSize: number; clock: SceneClock }

/**
 * The stretch of the descent (toWork) where the wireframe stands: from a little before the
 * camera's hold, as the tagline's dust comes down, to just after it, as the spine comes into
 * view. `margin` keeps it from re-forming on a small scroll back across an end.
 */
const SPAN = { from: DESCENT.holdFrom - 0.2, to: DESCENT.holdTo + 0.08, margin: 0.05 }
/** Seconds: the dust assembles (~1s) and holds at least ~1.3s, however fast the scroll. */
const MIN_PLAY = 2.3

/**
 * The "Form" beat of the descent: as the camera nears the hold half-way down, part of the
 * dust snaps into the wireframe of a phone screen in front of it and stands there while the
 * camera holds; it scatters as the camera moves on (or back). Once formed it stays at least
 * MIN_PLAY, so it completes however fast the scroll.
 */
export function FormMoment({ journey, simSize, clock }: Props) {
  const state = useRef({ startedAt: -1, armed: true })

  useFrame(({ size }) => {
    const s = state.current
    const { toWork } = journey
    const inside = toWork > SPAN.from && toWork < SPAN.to

    if (inside && s.armed) {
      s.armed = false
      s.startedAt = clock.time
      // About 65% of the dust (fine grain: more of it keeps the outline readable).
      const count = Math.floor(simSize * simSize * 0.65)
      const distance = 6
      const scale = size.width < 700 ? 0.55 : 0.7
      formParticles(
        samplePhoneWireframe(
          count,
          { x: 0, y: journey.formY, z: journey.formDistance - distance },
          scale,
        ),
      )
    }
    if (s.startedAt >= 0 && !inside && clock.time - s.startedAt > MIN_PLAY) {
      s.startedAt = -1
      dissolveParticles()
    }
    // Scattered and clear of the stretch (either way): ready to form again.
    const clear = toWork < SPAN.from - SPAN.margin || toWork > SPAN.to + SPAN.margin
    if (!s.armed && s.startedAt < 0 && clear) s.armed = true
  })

  return null
}
