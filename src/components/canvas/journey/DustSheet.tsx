import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type Group, type ShaderMaterial } from 'three'
import { useTier } from '@/stores/tier'
import { sceneColors, sceneConfig } from '@/styles/scene'
import particlesFragment from '../shaders/particles.frag'
import motesVertex from '../shaders/motes.vert'
import slabFragment from '../shaders/slab.frag'
import smokeVertex from '../shaders/smoke.vert'
import type { SceneClock } from '../useSceneClock'
import { createMotesGeometry, createMotesUniforms, gaussian } from './motes'
import { type JourneyState, PLACES } from './path'
import { SlabField } from './slabField'

const COUNT = 42000
/**
 * Extent of the slab (local, underside at y = 0). It reaches past the camera so the camera
 * flies through it, and its far edge stops where, seen from the statement, it draws the
 * diagonal about a quarter of the way down the frame.
 */
const SLAB = { x: 16, zNear: 9.5, zFar: -4.8, depth: 0.5 }

/** Smoke layers under the underside (local y), for depth: cloudy volumes, dark gaps. */
const SMOKE_LAYERS = [-0.03, -0.2, -0.42]

const EXTENT: [number, number] = [SLAB.x * 2, SLAB.zNear - SLAB.zFar]
const CENTER_Z = (SLAB.zNear + SLAB.zFar) / 2

/** Dust packed under a dark underside: densest at the underside, thinning downwards. */
function createSlab() {
  return createMotesGeometry(COUNT, (_, out) => {
    out.set(
      (Math.random() * 2 - 1) * SLAB.x,
      -Math.abs(gaussian()) * SLAB.depth * (Math.random() < 0.85 ? 0.22 : 1),
      SLAB.zFar + Math.random() * (SLAB.zNear - SLAB.zFar),
    )
  })
}

/**
 * The scene change: a thick slab of dust between the hero and the statement. The camera
 * passes through it on the way down (the wipe); from the statement it hangs overhead as a
 * dark ceiling of smoky, nebula-like volumes with sparkles gathered inside them, filling
 * the top of the frame with a crisp diagonal edge. Its colour shifts teal → gold →
 * red-orange.
 */
type Props = { clock: SceneClock; journey: JourneyState }

/** Out of sight once the camera is well down towards Work: skip it entirely. */
const GONE = 0.85

export function DustSheet({ clock, journey }: Props) {
  const group = useRef<Group>(null)
  const material = useRef<ShaderMaterial>(null)
  const frame = useRef(0)
  const gl = useThree((state) => state.gl)
  const geometry = useMemo(() => createSlab(), [])
  const field = useMemo(() => new SlabField(EXTENT, CENTER_Z), [])
  const colors = useMemo(
    () => [sceneColors.teal, sceneColors.warm, sceneColors.ember] as [Color, Color, Color],
    [],
  )
  const uniforms = useMemo(
    () => ({
      ...createMotesUniforms(colors),
      uField: { value: field.texture },
      uFieldExtent: { value: EXTENT },
      uFieldCenterZ: { value: CENTER_Z },
    }),
    [colors, field],
  )
  const smoke = useRef<(ShaderMaterial | null)[]>([])
  const smokeUniforms = useMemo(
    () =>
      SMOKE_LAYERS.map((_, layer) => ({
        uField: { value: field.texture },
        uOpacity: { value: 1 },
        uLayer: { value: layer },
        uColors: { value: colors },
        uCycle: { value: 0 },
      })),
    [colors, field],
  )
  // The underside: darker than the world, so the slab reads as a body, not a line.
  const shade = useMemo(() => new Color().copy(sceneColors.bg).multiplyScalar(0.45), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => field.dispose(), [field])

  useFrame(({ size, viewport }) => {
    if (!material.current || !group.current) return
    group.current.visible = journey.toWork < GONE
    if (!group.current.visible) return
    // Lite tier: the smoke field updates every other frame, and one smoke layer is drawn.
    const lite = useTier.getState().tier === 'lite'
    frame.current++
    if (!lite || frame.current % 2 === 0) field.update(gl, clock.time)
    smoke.current.forEach((layer, i) => {
      if (layer) layer.visible = !lite || i === 0
    })
    const u = material.current.uniforms
    u.uTime!.value = clock.time
    u.uOpacity!.value = 4.5
    // Fine dust, not bokeh dots.
    u.uSize!.value = sceneConfig.particles.size * 0.7
    u.uCycle!.value = clock.time * 0.1
    // One shared hue that drifts, with a little variation between motes.
    u.uSpread!.value = 0.22
    // Flying through, the nearest motes stay fine sparks instead of big discs.
    u.uAperture!.value = 0.45
    u.uMaxSize!.value = 9
    // Little fog: the far edge stays crisp.
    u.uFogFar!.value = 60
    u.uViewportHeight!.value = size.height * viewport.dpr
    smoke.current.forEach((layer) => {
      if (!layer) return
      layer.uniforms.uCycle!.value = clock.time * 0.1
    })
  })

  return (
    // Above the statement, tilted so its edge reads as a diagonal rising to the right.
    <group ref={group} position={[0, PLACES.statement + 3.1, 0]} rotation={[0.07, 0, 0.17]}>
      {/* Faces down only: seen from above (the hero side) it is invisible. */}
      <mesh
        rotation-x={Math.PI / 2}
        position-z={(SLAB.zNear + SLAB.zFar) / 2}
        frustumCulled={false}
      >
        <planeGeometry args={[SLAB.x * 2, SLAB.zNear - SLAB.zFar]} />
        <meshBasicMaterial color={shade} toneMapped={false} />
      </mesh>
      {SMOKE_LAYERS.map((y, i) => (
        <mesh key={y} rotation-x={Math.PI / 2} position={[0, y, CENTER_Z]} frustumCulled={false}>
          <planeGeometry args={[SLAB.x * 2, SLAB.zNear - SLAB.zFar]} />
          <shaderMaterial
            ref={(material) => {
              smoke.current[i] = material
            }}
            vertexShader={smokeVertex}
            fragmentShader={slabFragment}
            uniforms={smokeUniforms[i]}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={material}
          defines={{ CLUMP: '' }}
          vertexShader={motesVertex}
          fragmentShader={particlesFragment}
          uniforms={uniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  )
}
