import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type Group, type ShaderMaterial, Vector3 } from 'three'
import { useTier } from '@/stores/tier'
import { sceneColors, sceneConfig } from '@/styles/scene'
import particlesFragment from '../shaders/particles.frag'
import motesVertex from '../shaders/motes.vert'
import noise from '../shaders/noise.glsl'
import smokeFragment from '../shaders/smoke.frag'
import smokeVertex from '../shaders/smoke.vert'
import type { SceneClock } from '../useSceneClock'
import { createMotesGeometry, createMotesUniforms, gaussian } from './motes'
import { type JourneyState, PLACES } from './path'

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
 * The first scroll makes the nebula bloom (0.35s, whatever the scroll speed) and spread out
 * over ~1.5s; back at the hero it falls away (0.6s). In between it is held by the scroll:
 * it comes down most of the way with the camera (`follow`), so the stretch to the statement
 * is never empty, and fades as the camera passes through the dust sheet (camera progress
 * fadeFrom → fadeTo), overlapping it.
 */
const BLOOM = { rise: 0.35, fall: 0.6, spread: 1.5 }
const HOLD = { follow: 0.75, fadeFrom: 0.5, fadeTo: 0.82 }
/**
 * Peak strengths: mostly fine gold dust with faint smoky wisps between (seg_12), not a bank
 * of smoke. Lite draws one wisp layer of the three.
 */
const PEAK = { dust: 6, smoke: 0.2 }
const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

type Props = { journey: JourneyState; clock: SceneClock; reducedMotion: boolean }

/**
 * The golden cloud of the first scroll: a warm nebula with an orange glow and gold dust
 * blooms round The Core as the visitor starts to scroll, comes down with the camera and fades
 * into the dust sheet (MOTION.md §2).
 */
export function GoldCloud({ journey, clock, reducedMotion }: Props) {
  const group = useRef<Group>(null)
  const motes = useRef<ShaderMaterial>(null)
  const bloom = useRef({ level: 0, shown: 0 })
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

  useFrame(({ size, viewport }, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const b = bloom.current
    const scrolled = journey.camera > 0.015 && journey.toWork < 0.5
    b.level = scrolled
      ? Math.min(1, b.level + dt / BLOOM.rise)
      : Math.max(0, b.level - dt / BLOOM.fall)
    b.shown = b.level > 0 ? b.shown + dt : 0
    const held = 1 - smooth((journey.camera - HOLD.fadeFrom) / (HOLD.fadeTo - HOLD.fadeFrom))
    const amount = reducedMotion ? 0 : smooth(b.level) * held
    // Only drawn while it shows: the smoke is a full-screen noise shader.
    if (group.current) {
      group.current.visible = amount > 0.001
      group.current.position.y = (journey.view.y - PLACES.hero) * HOLD.follow
    }
    if (motes.current) {
      const u = motes.current.uniforms
      u.uTime!.value = clock.time
      u.uOpacity!.value = amount * PEAK.dust
      u.uSize!.value = sceneConfig.particles.size * 0.9
      u.uMaxSize!.value = 20
      u.uExpand!.value = Math.min(1, b.shown / BLOOM.spread) * 0.6
      u.uDrift!.value = 0.08
      u.uViewportHeight!.value = size.height * viewport.dpr
    }
    const lite = useTier.getState().tier === 'lite'
    smoke.current.forEach((material, i) => {
      if (!material) return
      material.visible = !lite || i === 0
      material.uniforms.uTime!.value = clock.time
      material.uniforms.uOpacity!.value = amount * PEAK.smoke
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
