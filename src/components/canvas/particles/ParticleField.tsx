import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, type PerspectiveCamera, type ShaderMaterial, type Texture } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import fragmentShader from '../shaders/particles.frag'
import vertexShader from '../shaders/particles.vert'
import type { LightRig } from '../useLightRig'
import type { Pointer } from '../usePointer'
import { createParticleAttributes, createSimulation, FIELD, type Simulation } from './simulation'

type Props = {
  simSize: number
  rig: LightRig
  pointer: Pointer
  timeScale: number
  /** 0 disables the cursor force (reduced motion). */
  cursorStrength: number
  /** Pre-run the simulation so the streams are already formed on the first frame. */
  warmUp: boolean
}

const WARM_UP_STEPS = 180

export function ParticleField({ simSize, rig, pointer, timeScale, cursorStrength, warmUp }: Props) {
  const gl = useThree((state) => state.gl)
  const simulation = useRef<Simulation | null>(null)
  const material = useRef<ShaderMaterial>(null)
  const needsWarmUp = useRef(warmUp)
  const { references, seeds } = useMemo(() => createParticleAttributes(simSize), [simSize])

  useEffect(() => {
    const sim = createSimulation(gl, simSize)
    simulation.current = sim
    return () => {
      sim.dispose()
      simulation.current = null
    }
  }, [gl, simSize])

  const uniforms = useMemo(
    () => ({
      uPositions: { value: null as Texture | null },
      uVelocities: { value: null as Texture | null },
      uSize: { value: 0 },
      uAperture: { value: 0 },
      uFocusDistance: { value: 0 },
      uViewportHeight: { value: 0 },
      uBrightness: { value: 0 },
      uCenter: { value: FIELD.center },
      uBounds: { value: FIELD.bounds },
      uLightPositions: { value: rig.positions },
      uLightColors: { value: rig.colors },
      uGlowColor: { value: sceneColors.glow },
    }),
    [rig],
  )

  useFrame((state, rawDelta) => {
    const sim = simulation.current
    if (!sim || !material.current) return

    if (needsWarmUp.current) {
      needsWarmUp.current = false
      const camera = state.camera as PerspectiveCamera
      const aspect = state.size.width / state.size.height
      for (let i = 0; i < WARM_UP_STEPS; i++) {
        const delta = 1 / 30
        sim.step({
          camera,
          aspect,
          rawDelta: delta,
          delta,
          time: rig.time,
          pointer,
          cursorStrength: 0,
        })
      }
    }

    const { positions, velocities } = sim.step({
      camera: state.camera as PerspectiveCamera,
      aspect: state.size.width / state.size.height,
      rawDelta,
      delta: Math.min(rawDelta, 1 / 30) * timeScale,
      time: rig.time,
      pointer,
      cursorStrength,
    })

    const { particles } = sceneConfig
    const u = material.current.uniforms
    u.uPositions!.value = positions
    u.uVelocities!.value = velocities
    u.uSize!.value = particles.size
    u.uAperture!.value = particles.aperture
    u.uFocusDistance!.value = particles.focusDistance
    u.uViewportHeight!.value = state.size.height * state.viewport.dpr
    u.uBrightness!.value = particles.brightness
  }, -1)

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[references, 3]} />
        <bufferAttribute attach="attributes-seed" args={[seeds, 4]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        blending={AdditiveBlending}
        depthWrite={false}
        depthTest={false}
        transparent
      />
    </points>
  )
}
