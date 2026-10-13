import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { PLACES, WORK, type JourneyState } from '../journey/path'
import type { SceneClock } from '../useSceneClock'
import { Pebbles } from './Pebbles'
import { Spine } from './Spine'
import { WorkCards } from './WorkCards'

type Props = { journey: JourneyState; clock: SceneClock }

/**
 * The Work place on the camera path: the spine, its chips and the job cards. Right of
 * centre on desktop (the list and details take the left), centred on phones, where the
 * cards hang in a column. Drawn only once the camera heads down towards it.
 */
export function WorkPlace({ journey, clock }: Props) {
  const group = useRef<Group>(null)
  const column = useThree((state) => state.size.width < 700)

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = journey.toWork > 0.02 && journey.toSystem < 0.98
    g.position.set(column ? 0 : WORK.x, PLACES.work, 0)
  })

  return (
    <group ref={group} visible={false}>
      <Spine clock={clock} />
      <Pebbles clock={clock} focusDistance={column ? 6 : WORK.distance} />
      <WorkCards layout={column ? 'column' : 'orbit'} clock={clock} />
    </group>
  )
}
