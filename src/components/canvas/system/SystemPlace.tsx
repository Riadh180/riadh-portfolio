import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, type Group } from 'three'
import { sceneColors } from '@/styles/scene'
import { SceneWord } from '../journey/SceneWord'
import type { GlassLook } from '../hero/glassLook'
import { type JourneyState, PLACES, SYSTEM } from '../journey/path'
import type { Pointer } from '../usePointer'
import { Drift } from '../motion/Drift'
import type { SceneClock } from '../useSceneClock'
import { SkillGraph } from './SkillGraph'

const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2
const WORD = ['System'] as const
/** Dim and cool: atmosphere behind the graph, never competing with its labels. */
const INK = new Color().copy(sceneColors.glass).lerp(sceneColors.blue, 0.35).multiplyScalar(0.15)

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
    g.visible = journey.toSystem > 0.02 && journey.toDepth < 0.9
    g.position.set(column ? 0 : SYSTEM.x, PLACES.system, 0)
  })

  return (
    <group ref={group} visible={false}>
      {/* "SYSTEM", huge behind the graph: The Core's glass bends it, the gems break it. */}
      <SceneWord
        lines={WORD}
        height={3.4}
        position={column ? [0, 0.2, -5.5] : [-1.8, 0.2, -5.5]}
        color={INK}
        clock={clock}
        reducedMotion={reducedMotion}
        fit={0.95}
        amount={() => ease((journey.toSystem - 0.6) / 0.4) * (1 - ease(journey.toDepth * 2.5))}
      />
      <Drift journey={journey} seed={23} weight={1}>
        <SkillGraph clock={clock} look={look} pointer={pointer} reducedMotion={reducedMotion} />
      </Drift>
    </group>
  )
}
