import { useMemo } from 'react'
import { sceneColors } from '@/styles/scene'
import { SURFACE } from '../depth/DepthWorld'
import { DESCENT } from './descent'
import { DustTrail } from './DustTrail'
import { DEPTH, type JourneyState, PLACES, SYSTEM, WORK } from './path'

/** 0..1 inside [from, to] of a leg, with soft ends. */
function band(value: number, from: number, to: number, soft = 0.1) {
  return (
    Math.min(1, Math.max(0, (value - from) / soft)) * Math.min(1, Math.max(0, (to - value) / soft))
  )
}

/**
 * The trails that carry every transition, so the camera always moves through something:
 * the wireframe down to the spine; the spine's chips down to the skills graph; the data
 * branch down to the water; embers down into Contact's warm light.
 */
export function Trails({ journey }: { journey: JourneyState }) {
  const colors = useMemo(
    () => ({
      descent: [sceneColors.teal, sceneColors.violet, sceneColors.glow] as const,
      chips: [sceneColors.pink, sceneColors.violet, sceneColors.teal] as const,
      data: [sceneColors.emerald, sceneColors.teal, sceneColors.glow] as const,
      embers: [sceneColors.ember, sceneColors.warm, sceneColors.pink] as const,
    }),
    [],
  )
  const workBottom = PLACES.work - 12
  return (
    <>
      <DustTrail
        top={(PLACES.statement + PLACES.work) / 2}
        bottom={PLACES.work + 2.5}
        fromX={0}
        toX={WORK.x}
        width={0.9}
        depth={1.4}
        count={3600}
        colors={[...colors.descent]}
        amount={() => band(journey.toWork, DESCENT.holdTo - 0.05, 1.02, 0.1)}
      />
      <DustTrail
        top={workBottom + 1}
        bottom={PLACES.system + 3}
        fromX={WORK.x}
        toX={SYSTEM.x}
        width={1.1}
        depth={1.6}
        count={4200}
        colors={[...colors.chips]}
        brightness={2.2}
        amount={() => band(journey.toSystem, 0.02, 0.95, 0.12)}
      />
      <DustTrail
        top={PLACES.system - 3}
        bottom={PLACES.depth + SURFACE - 0.5}
        fromX={SYSTEM.x}
        toX={DEPTH.x}
        width={0.7}
        depth={1.2}
        count={3600}
        colors={[...colors.data]}
        amount={() => band(journey.toDepth, 0.02, 0.85, 0.12)}
        brightness={2.4}
      />
      <DustTrail
        top={PLACES.depth - 4}
        bottom={PLACES.contact + 1}
        fromX={DEPTH.x - 0.5}
        toX={0}
        width={1}
        depth={1.5}
        count={4200}
        colors={[...colors.embers]}
        amount={() => band(journey.toContact, 0.05, 0.75, 0.15)}
        brightness={2.6}
      />
    </>
  )
}
