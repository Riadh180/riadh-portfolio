import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type Group, type ShaderMaterial, Vector3 } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import particlesFragment from '../shaders/particles.frag'
import motesVertex from '../shaders/motes.vert'
import noise from '../shaders/noise.glsl'
import smokeFragment from '../shaders/smoke.frag'
import smokeVertex from '../shaders/smoke.vert'
import type { SceneClock } from '../useSceneClock'
import { createMotesGeometry, createMotesUniforms, gaussian } from './motes'
import type { JourneyState } from './path'

/** Where The Core floats at the hero: the cloud blooms around it. */
const ORIGIN = new Vector3(0, 0.15, -0.4)
const COUNT = 7000

/** Nebula colours, from the tokens: a deeper amber body and pale gold filaments. */
const AMBER = new Color().copy(sceneColors.warm).multiplyScalar(0.7)
const PALE_GOLD = new Color().copy(sceneColors.warm).lerp(sceneColors.glass, 0.3)

/** Nebula layers behind and around The Core: [width, height, x, y, z, roll, seed]. */
const WISPS: [number, number, number, number, number, number, number][] = [
  [7.5, 4.6, 0, 0.2, -1.2, 0.35, 0.1],
  [8.5, 5, 0.6, 0.4, -2.2, -0.55, 0.4],
  [6, 3.8, -0.8, -0.1, -0.6, 1.25, 0.75],
]

/**
 * A wide, sparse drift of fine gold dust round The Core, denser near it, spreading far to
 * either side (the reference cloud fills the width of the frame).
 */
function createCloud() {
  return createMotesGeometry(COUNT, (_, out) => {
    const near = Math.random() < 0.2
    out.set(
      gaussian() * (near ? 1.3 : 5),
      gaussian() * (near ? 0.8 : 1.6) + (near ? 0 : gaussian() * 0.3),
      gaussian() * (near ? 0.7 : 1.8),
    )
    out.add(ORIGIN)
  })
}

/**
 * Once the scroll starts, the nebula plays out on its own over ~1.5s, whatever the scroll
 * speed: blooms in 0.35s, holds, fades by 1.5s. Re-arms back at the hero.
 */
const PLAY = 1.5
const envelope = (t: number) => {
  if (t < 0 || t > PLAY) return 0
  const rise = Math.min(1, t / 0.35)
  const fall = Math.min(1, Math.max(0, (t - 0.8) / (PLAY - 0.8)))
  return rise * rise * (3 - 2 * rise) * (1 - fall * fall * (3 - 2 * fall))
}

type Props = { journey: JourneyState; clock: SceneClock; reducedMotion: boolean }

/**
 * The golden cloud of the first scroll: a warm nebula with an orange glow and gold dust
 * blooms round The Core as the visitor starts to scroll, then fades (MOTION.md §2).
 */
export function GoldCloud({ journey, clock, reducedMotion }: Props) {
  const group = useRef<Group>(null)
  const motes = useRef<ShaderMaterial>(null)
  const playedAt = useRef(-1)
  const smoke = useRef<(ShaderMaterial | null)[]>([])
  const geometry = useMemo(() => createCloud(), [])
  const uniforms = useMemo(
    () => createMotesUniforms([sceneColors.warm, sceneColors.warm, sceneColors.warm], ORIGIN),
    [],
  )
  const smokeUniforms = useMemo(
    () =>
      WISPS.map(([width, height, , , , , seed]) => ({
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uSeed: { value: seed },
        uAspect: { value: width / height },
        uColor: { value: AMBER },
        uHighlight: { value: PALE_GOLD },
      })),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ size, viewport }) => {
    const now = clock.time
    if (playedAt.current < 0 && journey.camera > 0.015) playedAt.current = now
    if (playedAt.current >= 0 && journey.camera < 0.005 && now - playedAt.current > PLAY) {
      playedAt.current = -1
    }
    const elapsed = playedAt.current < 0 ? -1 : now - playedAt.current
    const amount = reducedMotion ? 0 : envelope(elapsed)
    // Only drawn while it shows: the smoke is a full-screen noise shader.
    if (group.current) group.current.visible = amount > 0.001
    if (motes.current) {
      const u = motes.current.uniforms
      u.uTime!.value = clock.time
      u.uOpacity!.value = amount * 3
      u.uSize!.value = sceneConfig.particles.size * 0.9
      u.uMaxSize!.value = 20
      u.uExpand!.value = Math.max(0, elapsed / PLAY) * 0.6
      u.uDrift!.value = 0.08
      u.uViewportHeight!.value = size.height * viewport.dpr
    }
    smoke.current.forEach((material) => {
      if (!material) return
      material.uniforms.uTime!.value = clock.time
      material.uniforms.uOpacity!.value = amount * 0.6
    })
  })

  return (
    <group ref={group}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={motes}
          vertexShader={motesVertex}
          fragmentShader={particlesFragment}
          uniforms={uniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </points>
      {WISPS.map(([width, height, x, y, z, roll], i) => (
        <mesh key={i} position={[x, y, z]} rotation-z={roll}>
          <planeGeometry args={[width, height]} />
          <shaderMaterial
            ref={(material) => {
              smoke.current[i] = material
            }}
            vertexShader={smokeVertex}
            fragmentShader={`${noise}\n${smokeFragment}`}
            uniforms={smokeUniforms[i]}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
