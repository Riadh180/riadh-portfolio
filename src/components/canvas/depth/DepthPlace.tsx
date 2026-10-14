import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { DEPTH, type JourneyState, PLACES } from '../journey/path'
import { Drift } from '../motion/Drift'
import type { SceneClock } from '../useSceneClock'
import { DEPTH_FOG } from './DepthBackdrop'
import { DepthWorld } from './DepthWorld'

type Props = { journey: JourneyState; clock: SceneClock }

/**
 * Depth on the camera path, below System: the water, its light, the data roots and the
 * capstone panel, right of centre on desktop. Drawn only while the camera is near it.
 */
export function DepthPlace({ journey, clock }: Props) {
  const group = useRef<Group>(null)
  const column = useThree((state) => state.size.width < 700)

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = journey.toDepth > 0.02 && journey.toContact < 0.9
    // Phones: the panel (at x 2.3 in Depth's space) centred.
    g.position.set(column ? -2.3 : DEPTH.x - 1.6, PLACES.depth, 0)
  })

  return (
    <group ref={group} visible={false}>
      <Drift journey={journey} seed={37} weight={1.2}>
        <DepthWorld clock={clock} fog={DEPTH_FOG} />
      </Drift>
    </group>
  )
}
