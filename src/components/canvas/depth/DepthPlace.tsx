import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, type Group } from 'three'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { capstone } from '@/content/site'
import { useWork } from '@/stores/work'
import { sceneColors } from '@/styles/scene'
import { SceneWord } from '../journey/SceneWord'
import { DEPTH, type JourneyState, PLACES } from '../journey/path'
import { Drift } from '../motion/Drift'
import type { SceneClock } from '../useSceneClock'
import { DEPTH_FOG } from './DepthBackdrop'
import { DepthBubbles } from './DepthBubbles'
import { DepthWorld } from './DepthWorld'

type Props = { journey: JourneyState; clock: SceneClock }

const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2
const WORDS = ['Beneath the', 'interface'] as const
/** Aqua-tinted, like light through the water above. */
const INK = new Color().copy(sceneColors.glass).lerp(sceneColors.glow, 0.45).multiplyScalar(0.42)

/**
 * Depth on the camera path, below System: the water, its light, the data roots and the
 * capstone panel, right of centre on desktop. Drawn only while the camera is near it.
 */
export function DepthPlace({ journey, clock }: Props) {
  const group = useRef<Group>(null)
  const column = useThree((state) => state.size.width < 700)
  // Phones: the HTML heading sits where the word would be; it says the same.
  const short = useThree((state) => state.size.width < 700)
  const reducedMotion = useReducedMotion()

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = journey.toDepth > 0.02 && journey.toContact < 0.9
    // Phones: the panel (at x 2.3 in Depth's space) centred.
    g.position.set(column ? -2.3 : DEPTH.x - 1.6, PLACES.depth, 0)
  })

  return (
    <group ref={group} visible={false}>
      {/* High above the panel, just under the surface, wavering as if seen through it. */}
      <SceneWord
        lines={WORDS}
        // Phones: in the gap under the panel, above the text.
        height={column ? 1.4 : 2}
        position={column ? [2.3, -3.3, -4] : [2.3, 1.7, -5]}
        color={INK}
        clock={clock}
        reducedMotion={reducedMotion}
        accent={sceneColors.teal}
        ripple
        // Gone while the capstone is open: its panel and details take the frame.
        amount={() =>
          short || useWork.getState().opened === capstone.slug
            ? 0
            : ease((journey.toDepth - 0.35) / 0.45) * (1 - ease(journey.toContact * 2.5))
        }
      />
      <Drift journey={journey} seed={37} weight={1.2}>
        <DepthWorld clock={clock} fog={DEPTH_FOG} />
        <DepthBubbles clock={clock} journey={journey} />
      </Drift>
    </group>
  )
}
