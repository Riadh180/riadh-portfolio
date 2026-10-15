import { useMemo } from 'react'
import type { Color } from 'three'
import { sceneColors } from '@/styles/scene'
import { SURFACE } from '../depth/DepthWorld'
import { DESCENT } from './descent'
import { DustTrail } from './DustTrail'
import { ParticleWall } from './ParticleWall'
import type { SceneClock } from '../useSceneClock'
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
export function Trails({ journey, clock }: { journey: JourneyState; clock: SceneClock }) {
  const colors = useMemo(
    () => ({
      descent: [sceneColors.teal, sceneColors.violet, sceneColors.glow] as const,
      chips: [sceneColors.pink, sceneColors.violet, sceneColors.teal] as const,
      walls: {
        work: [sceneColors.violet, sceneColors.pink, sceneColors.glow],
        system: [sceneColors.blue, sceneColors.violet, sceneColors.teal],
        depth: [sceneColors.emerald, sceneColors.teal, sceneColors.glow],
        contact: [sceneColors.ember, sceneColors.warm, sceneColors.pink],
      } satisfies Record<string, [Color, Color, Color]>,
      data: [sceneColors.emerald, sceneColors.teal, sceneColors.glow] as const,
      embers: [sceneColors.ember, sceneColors.warm, sceneColors.pink] as const,
    }),
    [],
  )
  const workBottom = PLACES.work - 12
  return (
    <>
      {/* The walls: one per transition, each in its own colour (the statement has its slab). */}
      <ParticleWall clock={clock} y={-26} tilt={[0.06, 0.2]} colors={colors.walls.work} seed={1} />
      <ParticleWall
        clock={clock}
        y={-47.5}
        tilt={[-0.05, -0.22]}
        colors={colors.walls.system}
        seed={2}
      />
      <ParticleWall
        clock={clock}
        // Just above the water surface: the camera breaks through the dust into Depth.
        y={-72.5}
        tilt={[0.05, 0.18]}
        colors={colors.walls.depth}
        seed={3}
      />
      <ParticleWall
        clock={clock}
        y={-94}
        tilt={[-0.06, -0.2]}
        colors={colors.walls.contact}
        seed={4}
      />
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
        bottom={PLACES.system}
        fromX={WORK.x}
        toX={SYSTEM.x}
        width={1.1}
        depth={1.6}
        count={3200}
        colors={[...colors.chips]}
        brightness={2.8}
        gather
        // The work feeds the system: the trail streams into its centre and stays until
        // the constellation fills the frame (overlapping its arrival).
        amount={() => band(journey.toSystem, 0.02, 1.0, 0.12) * (1 - journey.toDepth)}
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
        brightness={3.4}
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
