import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import type { GlassLook } from '../hero/glassLook'
import { type JourneyState, PLACES, SYSTEM } from '../journey/path'
import type { Pointer } from '../usePointer'
import type { SceneClock } from '../useSceneClock'
import { SkillGraph } from './SkillGraph'

type Props = {
  journey: JourneyState
  clock: SceneClock
  look: GlassLook
  pointer: Pointer
  reducedMotion: boolean
}

/**
 * The System place on the camera path: the skills graph round its Core, right of centre
 * on desktop (the list takes the left). Drawn only once the camera heads down to it.
 */
export function SystemPlace({ journey, clock, look, pointer, reducedMotion }: Props) {
  const group = useRef<Group>(null)
  const column = useThree((state) => state.size.width < 700)

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = journey.toSystem > 0.02
    g.position.set(column ? 0 : SYSTEM.x, PLACES.system, 0)
  })

  return (
    <group ref={group} visible={false}>
      <SkillGraph clock={clock} look={look} pointer={pointer} reducedMotion={reducedMotion} />
    </group>
  )
}
