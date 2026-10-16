import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { sceneColors } from '@/styles/scene'
import { ChipCluster } from '../work/Pebbles'
import type { SceneClock } from '../useSceneClock'
import { type JourneyState, PLACES } from './path'

/**
 * Loose glass dust at the statement (world space, round PLACES.statement): wide clouds behind
 * the tagline, and one just behind The Core's held slit, so its glass bends the grains as it
 * bends the type. Never in front of the tagline.
 */
const CLOUDS: [number, number, number, number][] = [
  [-3.2, PLACES.statement - 0.4, -3.2, 2.2],
  [1.6, PLACES.statement - 1.4, -4.2, 2.4],
  [-0.2, PLACES.statement - 0.5, 1.3, 0.9],
  [3.8, PLACES.statement + 0.1, -2.0, 1.4],
  [-5.6, PLACES.statement - 1.8, -2.4, 1.5],
]

/** Teal and silver, a little gold: the statement's own light (the slab above runs teal → gold). */
const PALETTE = [
  sceneColors.glass.clone().lerp(sceneColors.teal, 0.3),
  sceneColors.teal.clone(),
  sceneColors.violet.clone().lerp(sceneColors.glass, 0.3),
  sceneColors.warm.clone(),
]

type Props = { journey: JourneyState; clock: SceneClock }

/** The statement's air: present from the hero's first scroll until the descent to Work. */
export function StatementDust({ journey, clock }: Props) {
  const group = useRef<Group>(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = journey.camera > 0.35 && journey.toWork < 0.45
  })
  return (
    <group ref={group} visible={false}>
      <ChipCluster
        clusters={CLOUDS}
        count={440}
        size={2.6}
        clock={clock}
        focusDistance={11}
        palette={PALETTE}
      />
    </group>
  )
}
