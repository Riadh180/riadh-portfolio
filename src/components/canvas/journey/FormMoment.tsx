import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { samplePhoneWireframe } from '../particles/targets'
import { dissolveParticles, formParticles } from '../particles/transitions'
import { DESCENT, type JourneyState } from './path'

type Props = { journey: JourneyState; simSize: number }

/**
 * The "Form" beat of the descent: as the camera reaches the hold half-way down, part of
 * the dust snaps into the wireframe of a phone screen in front of it, holds, and scatters
 * as the camera moves on to the spine. Complexity becomes a polished product.
 */
export function FormMoment({ journey, simSize }: Props) {
  const formed = useRef(false)

  useFrame(({ size }) => {
    const { toWork } = journey
    // A little before the hold, and released a little after it.
    const inside = toWork > DESCENT.holdFrom - 0.12 && toWork < DESCENT.holdTo + 0.06
    if (inside && !formed.current) {
      formed.current = true
      // About 40% of the dust; the rest stays free around it.
      const count = Math.floor(simSize * simSize * 0.4)
      const distance = 6
      const scale = size.width < 700 ? 0.55 : 0.7
      formParticles(
        samplePhoneWireframe(
          count,
          { x: 0, y: journey.formY, z: journey.formDistance - distance },
          scale,
        ),
      )
    } else if (!inside && formed.current) {
      formed.current = false
      dissolveParticles()
    }
  })

  return null
}
