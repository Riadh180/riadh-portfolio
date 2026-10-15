import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { samplePhoneWireframe } from '../particles/targets'
import { dissolveParticles, formParticles } from '../particles/transitions'
import type { SceneClock } from '../useSceneClock'
import { DESCENT, type JourneyState } from './path'

type Props = { journey: JourneyState; simSize: number; clock: SceneClock }

/** Seconds: the dust assembles (~1s), the wireframe holds (~1.3s), then it scatters. */
const PLAY = 2.8

/**
 * The "Form" beat of the descent: as the camera nears the hold half-way down, part of the
 * dust snaps into the wireframe of a phone screen in front of it, holds, and scatters.
 * Complexity becomes a polished product. Once triggered it plays out on its own clock, so
 * it completes however fast the scroll; it re-arms once the camera leaves the descent.
 */
export function FormMoment({ journey, simSize, clock }: Props) {
  const state = useRef({ startedAt: -1, armed: true })

  useFrame(({ size }) => {
    const s = state.current
    const { toWork } = journey
    const near = toWork > DESCENT.holdFrom - 0.15 && toWork < DESCENT.holdTo + 0.15

    if (near && s.armed) {
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
    if (s.startedAt >= 0 && clock.time - s.startedAt > PLAY) {
      s.startedAt = -1
      dissolveParticles()
    }
    // Out of the descent (either way): ready to play again next time.
    if (!s.armed && (toWork < 0.08 || toWork > 0.9)) s.armed = true
  })

  return null
}
