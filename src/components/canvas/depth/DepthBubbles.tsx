import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  type Group,
  type ShaderMaterial,
} from 'three'
import { sceneColors } from '@/styles/scene'
import { grainUniforms, syncGrainTier } from '../particles/CursorField'
import fragmentShader from '../shaders/bubble.frag'
import vertexShader from '../shaders/bubble.vert'
import glassGrain from '../shaders/glassGrain.glsl'
import grainMotion from '../shaders/grainMotion.glsl'
import risingFragment from '../shaders/risingGrain.frag'
import { DEPTH, type JourneyState, PLACES } from '../journey/path'
import type { SceneClock } from '../useSceneClock'

const COUNT = 70
/** A few larger glass beads rising with the bubbles. */
const BEADS = 16
const BOX = { width: 9, height: 13, depth: 5 }
/**
 * Leaving for Contact they ride part of the way down with the camera (still rising past it,
 * only slower), so Depth's water overlaps Contact's embers and warm light instead of ending
 * before they start; they shrink away as The Core settles (toContact fadeFrom → fadeTo).
 */
const RIDE = { follow: 0.65, fadeFrom: 0.45, fadeTo: 0.75 }
const BEAD_SHADERS = {
  vertexShader: `${grainMotion}\n${vertexShader}`,
  fragmentShader: `${glassGrain}\n${risingFragment}`,
  defines: { GRAIN: '' },
}

function createBubbles(count: number) {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    positions.set(
      [
        (Math.random() - 0.4) * BOX.width,
        Math.random() * BOX.height,
        -Math.random() * BOX.depth + 1,
      ],
      i * 3,
    )
    seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 4))
  return geometry
}

/**
 * A few larger bubbles drifting up through Depth (under water, going deeper), and with them a
 * few larger glass beads, the world's glass grains, catching the light from the surface.
 */
export function DepthBubbles({ clock, journey }: { clock: SceneClock; journey: JourneyState }) {
  const group = useRef<Group>(null)
  const material = useRef<ShaderMaterial>(null)
  const beadMaterial = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => createBubbles(COUNT), [])
  const beads = useMemo(() => createBubbles(BEADS), [])
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: BOX.height },
      uSize: { value: 1 },
      uColor: { value: sceneColors.glow },
    }),
    [],
  )
  const beadUniforms = useMemo(
    () => ({
      ...grainUniforms,
      uTextZone: { value: [-2, -2] },
      uTime: { value: 0 },
      uHeight: { value: BOX.height },
      uSize: { value: 1 },
      uColor: { value: sceneColors.glow.clone().lerp(sceneColors.glass, 0.35) },
    }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => beads.dispose(), [beads])
  useFrame(() => {
    const m = material.current
    const b = beadMaterial.current
    if (!m || !b || !group.current) return
    const below = Math.min(0, journey.view.y - (PLACES.depth - DEPTH.below))
    group.current.position.y = 0.5 + below * RIDE.follow
    const t = Math.min(
      1,
      Math.max(0, (journey.toContact - RIDE.fadeFrom) / (RIDE.fadeTo - RIDE.fadeFrom)),
    )
    const shown = 1 - t * t * (3 - 2 * t)
    m.uniforms.uTime!.value = clock.time
    m.uniforms.uSize!.value = 0.07 * size.height * dpr * shown
    syncGrainTier(b)
    b.uniforms.uTime!.value = clock.time * 0.8
    b.uniforms.uSize!.value = 0.08 * size.height * dpr * shown
  })
  return (
    <group ref={group} position={[0, 0.5, 0]}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </points>
      <points geometry={beads} frustumCulled={false}>
        <shaderMaterial
          ref={beadMaterial}
          {...BEAD_SHADERS}
          uniforms={beadUniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  )
}
