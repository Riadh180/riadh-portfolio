import { useThree } from '@react-three/fiber'
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
  // Phones: System's graph and Depth's panel are centred, so the trails run down the axis.
  const phone = useThree((state) => state.size.width < 700)
  const x = { system: phone ? 0 : SYSTEM.x, depth: phone ? 0 : DEPTH.x }
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
        // From the hold on: the dust streams down from the wireframe to the spine.
        amount={() => band(journey.toWork, DESCENT.holdFrom, 1.02, 0.12)}
      />
      <DustTrail
        top={workBottom + 1}
        bottom={PLACES.system}
        fromX={WORK.x}
        toX={x.system}
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
        fromX={x.system}
        toX={x.depth}
        // Phones see this leg from 20–30 units away: a wider, denser trail of larger motes.
        width={phone ? 1.3 : 0.7}
        depth={1.2}
        count={phone ? 6000 : 3600}
        colors={[...colors.data]}
        amount={() => band(journey.toDepth, 0.02, 0.85, 0.12)}
        brightness={phone ? 4.5 : 3.4}
        moteSize={phone ? 0.045 : 0.03}
      />
      <DustTrail
        top={PLACES.depth - 4}
        bottom={PLACES.contact + 1}
        fromX={x.depth - (phone ? 0 : 0.5)}
        toX={0}
        width={1}
        depth={1.5}
        count={4200}
        colors={[...colors.embers]}
        // Overlaps The Core's descent: the embers thin out only as it fills the frame.
        amount={() => band(journey.toContact, 0.05, 0.97, 0.22)}
        brightness={2.6}
      />
    </>
  )
}
