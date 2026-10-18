import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type Group, type ShaderMaterial, Vector3 } from 'three'
import { useTier } from '@/stores/tier'
import { sceneColors, sceneConfig } from '@/styles/scene'
import { grainBlending, syncGrainTier } from '../particles/CursorField'
import noise from '../shaders/noise.glsl'
import smokeFragment from '../shaders/smoke.frag'
import smokeVertex from '../shaders/smoke.vert'
import type { SceneClock } from '../useSceneClock'
import { createMotesGeometry, createMotesUniforms, gaussian, grainMotes } from './motes'
import { CORE, firstLeg, type JourneyState, statementLift } from './path'

/** Where The Core floats at the hero: the cloud blooms around it. */
const ORIGIN = new Vector3(0, 0.15, -0.4)
/**
 * Glass beads (the world's grains), as in seg_12: a shell wrapping The Core, clumps round it
 * and a wide, thin band across the frame (shares of the count); beads of 2–6 px (`size`, ×
 * the world's fine grain).
 */
const COUNT = 8000
const SHARE = { wrap: 0.3, clumps: 0.45 }
const BEAD = { size: 3.2 }
/** The clumps round The Core: [x, y, z, spread]. */
const CLUMPS: [number, number, number, number][] = [
  [1.9, 0.5, -0.3, 0.4],
  [2.8, -0.2, -1, 0.55],
  [-2.1, 0.3, -0.6, 0.45],
  [-1.4, -0.7, 0.2, 0.3],
  [0.9, 1.1, -0.8, 0.35],
  [3.8, 0.6, -1.6, 0.6],
  [-3.2, -0.3, -1.4, 0.55],
  [0.4, -1.2, -0.4, 0.35],
  [4.9, -0.4, -2.2, 0.7],
  [-4.4, 0.7, -2, 0.65],
  [2.2, 1.4, -1.8, 0.45],
  [-0.9, 1.3, -1.2, 0.4],
]

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
 * Gold beads round The Core: a shell wrapping it (flattened towards the frame's plane),
 * clumps round it, and a wide, thin band (the reference cloud fills the width of the frame).
 */
function createCloud() {
  return createMotesGeometry(COUNT, (_, out) => {
    const pick = Math.random()
    if (pick < SHARE.wrap) {
      const reach = 1 + Math.abs(gaussian()) * 0.45
      const a = Math.random() * Math.PI * 2
      out.set(Math.cos(a) * reach * 1.15, Math.sin(a) * reach, gaussian() * 0.45)
    } else if (pick < SHARE.wrap + SHARE.clumps) {
      const [x, y, z, spread] = CLUMPS[Math.floor(Math.random() * CLUMPS.length)]!
      out.set(x + gaussian() * spread, y + gaussian() * spread * 0.7, z + gaussian() * spread)
    } else {
      out.set(gaussian() * 5, gaussian() * 0.6, gaussian() * 1.6)
    }
    out.add(ORIGIN)
  })
}

/**
 * The first scroll makes the nebula bloom (0.35s, whatever the scroll speed) and spread out
 * over ~1.5s; back at the hero it falls away (0.6s). In between it travels with The Core
 * (the first leg, see path.ts), wrapping it all the way down (a little behind it: `depth`
 * of its approach), and thins out as the statement arrives (leg fadeFrom → fadeTo).
 */
const BLOOM = { rise: 0.35, fall: 0.6, spread: 1.5 }
const HOLD = { depth: 0.7, fadeFrom: 0.55, fadeTo: 0.95 }
/**
 * Peak strengths: gold beads with smoky wisps between them (seg_12), not a bank of smoke.
 * Lite draws one wisp layer of the three.
 */
const PEAK = { dust: 3, smoke: 0.25 }
const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

type Props = { journey: JourneyState; clock: SceneClock; reducedMotion: boolean }

/**
 * The golden cloud of the first scroll: a warm nebula with an orange glow and gold beads
 * blooms round The Core as the visitor starts to scroll, wraps it as it rides down with the
 * camera, and thins out as the statement arrives (MOTION.md §2).
 */
export function GoldCloud({ journey, clock, reducedMotion }: Props) {
  const group = useRef<Group>(null)
  const motes = useRef<ShaderMaterial>(null)
  const bloom = useRef({ level: 0, shown: 0 })
  const smoke = useRef<(ShaderMaterial | null)[]>([])
  const geometry = useMemo(() => createCloud(), [])
  const uniforms = useMemo(
    () => createMotesUniforms([sceneColors.warm, PALE_GOLD, AMBER], ORIGIN, true),
    [],
  )
  const travel = useRef(new Vector3())
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
    const leg = firstLeg(journey)
    const held = 1 - smooth((leg - HOLD.fadeFrom) / (HOLD.fadeTo - HOLD.fadeFrom))
    const amount = reducedMotion ? 0 : smooth(b.level) * held
    // Only drawn while it shows: the smoke is a full-screen noise shader.
    if (group.current) {
      group.current.visible = amount > 0.001
      // Travels with The Core (its own path, see Emblem), a little behind it.
      const offset = travel.current.subVectors(CORE.statement, CORE.hero).multiplyScalar(leg)
      offset.y += statementLift(size.width, size.height) * leg
      offset.z *= HOLD.depth
      group.current.position.copy(offset)
    }
    if (motes.current) {
      syncGrainTier(motes.current)
      const u = motes.current.uniforms
      u.uTime!.value = clock.time
      u.uOpacity!.value = amount * PEAK.dust
      u.uSize!.value = sceneConfig.particles.size * BEAD.size
      u.uMaxSize!.value = 20
      u.uExpand!.value = Math.min(1, b.shown / BLOOM.spread) * 0.6
      u.uDrift!.value = 0.08
      // In focus round The Core as it comes closer.
      u.uFocusDistance!.value = sceneConfig.particles.focusDistance - travel.current.z
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
          vertexShader={grainMotes.vertexShader}
          fragmentShader={grainMotes.fragmentShader}
          defines={grainMotes.defines}
          uniforms={uniforms}
          {...grainBlending}
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
