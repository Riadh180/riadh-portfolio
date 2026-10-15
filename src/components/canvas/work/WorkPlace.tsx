import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, type Group } from 'three'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useWork } from '@/stores/work'
import { sceneColors } from '@/styles/scene'
import { SceneWord } from '../journey/SceneWord'
import { PLACES, WORK, type JourneyState } from '../journey/path'
import { Drift } from '../motion/Drift'
import type { SceneClock } from '../useSceneClock'
import { Pebbles } from './Pebbles'
import { Spine } from './Spine'
import { WorkCards } from './WorkCards'

type Props = { journey: JourneyState; clock: SceneClock }

const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2
const WORD = ['Selected work'] as const
/** Violet-tinted off-white, under the bloom threshold. */
const INK = new Color().copy(sceneColors.glass).lerp(sceneColors.violet, 0.3).multiplyScalar(0.5)

/**
 * The Work place on the camera path: the spine, its chips and the job cards. Right of
 * centre on desktop (the list and details take the left), centred on phones, where the
 * cards hang in a column. Drawn only once the camera heads down towards it.
 */
export function WorkPlace({ journey, clock }: Props) {
  const group = useRef<Group>(null)
  const column = useThree((state) => state.size.width < 700)
  const reducedMotion = useReducedMotion()

  useFrame(() => {
    const g = group.current
    if (!g) return
    // Gone once the camera has descended past it (it would still cost the full Work
    // scene, off screen, for the rest of the flight to System). Phones a little later:
    // their column's dissolving foot is still leaving the frame.
    g.visible = journey.toWork > 0.02 && journey.toSystem < (column ? 0.65 : 0.55)
    g.position.set(WORK.x, PLACES.work, 0)
  })

  return (
    <group ref={group} visible={false}>
      {/* Arriving: "SELECTED WORK" hangs behind the spine, broken by it and its chips. */}
      <SceneWord
        lines={WORD}
        height={1.5}
        position={[0, 3.4, -2.8]}
        color={INK}
        clock={clock}
        reducedMotion={reducedMotion}
        // Gone while a card is open: its details take the left side.
        amount={() =>
          useWork.getState().opened
            ? 0
            : ease((journey.toWork - 0.55) / 0.45) * (1 - ease(journey.inWork / 0.12))
        }
      />
      <Drift journey={journey} seed={11} weight={1.4}>
        {/* Phones: the column is a mass behind the cards (~60% of the screen wide), further
            back, lifted so its dissolving foot clears the frame before System. */}
        <group
          scale={column ? [0.85, 1, 0.85] : 1}
          position={column ? [0, -1.5, -2.4] : [0, 0, 0]}
        >
          <Spine clock={clock} />
          {column && <Pebbles clock={clock} focusDistance={6} />}
        </group>
        {/* Focus on the card the camera holds at (dollied in, card in front of the column). */}
        {!column && <Pebbles clock={clock} focusDistance={WORK.distance - WORK.dolly - 2} />}
        <WorkCards layout={column ? 'column' : 'orbit'} clock={clock} />
      </Drift>
    </group>
  )
}
