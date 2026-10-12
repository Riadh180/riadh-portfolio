import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, type PerspectiveCamera, type ShaderMaterial, type Texture } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import fragmentShader from '../shaders/particles.frag'
import vertexShader from '../shaders/particles.vert'
import type { SceneClock } from '../useSceneClock'
import type { Pointer } from '../usePointer'
import { createParticleAttributes, createSimulation, FIELD, type Simulation } from './simulation'
import { particleTransition } from './transitions'

type Props = {
  simSize: number
  clock: SceneClock
  pointer: Pointer
  timeScale: number
  /** 0 disables the cursor force (reduced motion). */
  cursorStrength: number
}

/** Sparse multi-hue dust: atmosphere, cursor wake, and the medium for dissolves. */
export function ParticleField({ simSize, clock, pointer, timeScale, cursorStrength }: Props) {
  const gl = useThree((state) => state.gl)
  const simulation = useRef<Simulation | null>(null)
  const material = useRef<ShaderMaterial>(null)
  const form = useRef(0)
  const targetsVersion = useRef(-1)
  const { references, seeds } = useMemo(() => createParticleAttributes(simSize), [simSize])

  useEffect(() => {
    const sim = createSimulation(gl, simSize)
    simulation.current = sim
    targetsVersion.current = -1
    return () => {
      sim.dispose()
      simulation.current = null
    }
  }, [gl, simSize])

  const uniforms = useMemo(
    () => ({
      uPositions: { value: null as Texture | null },
      uVelocities: { value: null as Texture | null },
      uTime: { value: 0 },
      uSize: { value: 0 },
      uAperture: { value: 0 },
      uFocusDistance: { value: 0 },
      uViewportHeight: { value: 0 },
      uBrightness: { value: 0 },
      uCenter: { value: FIELD.center },
      uBounds: { value: FIELD.bounds },
      uPalette: {
        value: [
          sceneColors.teal,
          sceneColors.blue,
          sceneColors.violet,
          sceneColors.emerald,
          sceneColors.warm,
          sceneColors.glow,
        ],
      },
    }),
    [],
  )

  useFrame((state, rawDelta) => {
    const sim = simulation.current
    if (!sim || !material.current) return

    if (targetsVersion.current !== particleTransition.version) {
      targetsVersion.current = particleTransition.version
      sim.setTargets(particleTransition.targets)
    }

    // Ease toward the requested form; releasing it turns the drop into a scatter burst.
    const delta = Math.min(rawDelta, 1 / 30) * timeScale
    const previousForm = form.current
    form.current += (particleTransition.form - form.current) * (1 - Math.exp(-delta * 2.5))
    const scatter = (Math.max(0, previousForm - form.current) / Math.max(delta, 1e-3)) * 6

    const { positions, velocities } = sim.step({
      camera: state.camera as PerspectiveCamera,
      aspect: state.size.width / state.size.height,
      rawDelta,
      delta,
      time: clock.time,
      pointer,
      cursorStrength,
      form: form.current,
      scatter,
    })

    const { particles } = sceneConfig
    const u = material.current.uniforms
    u.uPositions!.value = positions
    u.uVelocities!.value = velocities
    u.uTime!.value = clock.time
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
