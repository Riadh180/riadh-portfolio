import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Group,
  type Mesh,
  type Points,
  type ShaderMaterial,
  Vector2,
} from 'three'
import { sceneColors } from '@/styles/scene'
import { revealed } from '@/stores/loading'
import { ChipCluster } from '../work/Pebbles'
import type { JourneyState } from '../journey/path'
import fragmentShader from '../shaders/glow.frag'
import vertexShader from '../shaders/glow.vert'
import shardFragment from '../shaders/heroShard.frag'
import sparkFragment from '../shaders/heroSpark.frag'
import sparkVertex from '../shaders/heroSpark.vert'
import type { SceneClock } from '../useSceneClock'

/** Where The Core floats at the hero (matches Emblem's hero pose). */
const CENTRE: [number, number, number] = [0, 0.45, 0]

/**
 * A sparse field of glass dust round and behind The Core: [x, y, z, spread]. Wide, loose
 * clouds at different depths, thinning out towards the frame; never in front of its centre.
 */
const DUST: [number, number, number, number][] = [
  [0, 0.45, -2.6, 1.8],
  [-2.4, -0.4, -1.0, 0.9],
  [2.5, -0.2, -1.2, 0.9],
  [-1.4, -1.9, -0.6, 0.8],
  [1.6, -2.1, -0.8, 0.9],
  [-3.4, 1.4, -2.0, 1.0],
  [3.2, 1.8, -2.4, 1.1],
  [0.3, -2.8, -1.5, 1.0],
]

/** Sparks rising past The Core (behind it and at its sides), in a box this tall. */
const SPARKS = { count: 14, height: 6, width: 5.2 }

function createSparks() {
  const positions = new Float32Array(SPARKS.count * 3)
  const seeds = new Float32Array(SPARKS.count * 4)
  for (let i = 0; i < SPARKS.count; i++) {
    positions.set(
      [
        (Math.random() - 0.5) * SPARKS.width,
        Math.random() * SPARKS.height,
        -0.3 - Math.random() * 1.6,
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
 * Thin glass arcs far behind The Core, out of focus, barely there: position, size, the
 * arc's start and end angle, its softness, and the glint's period and phase (seconds).
 */
const SHARDS = [
  { at: [-3.2, 2.2, -7] as const, size: 5, arc: [0.4, 1.9], width: 0.045, period: 9, phase: 0 },
  { at: [3.8, -1.2, -10] as const, size: 7, arc: [-2.6, -1.2], width: 0.05, period: 11, phase: 4 },
  { at: [1.2, 3.4, -13] as const, size: 6, arc: [2.2, 3.0], width: 0.06, period: 13, phase: 7.5 },
]

/**
 * The hero's living space, calm but never dead: a soft halo behind The Core that breathes
 * (one slow pulse every ~6s), a sparse field of glass dust round and behind it, a few gold
 * and pink sparks rising slowly (seg_00's end), and two or three thin glass arcs far behind,
 * out of focus, catching the light now and then. The centre stays clean. Only at the hero
 * (and as the loop returns to it).
 */
export function HeroAura({ journey, clock }: { journey: JourneyState; clock: SceneClock }) {
  const group = useRef<Group>(null)
  const halo = useRef<Mesh>(null)
  const shards = useRef<(Mesh | null)[]>([])
  const sparkPoints = useRef<Points>(null)
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const color = useMemo(() => new Color().copy(sceneColors.teal).lerp(sceneColors.glow, 0.4), [])
  const uniforms = useMemo(() => ({ uColor: { value: color }, uOpacity: { value: 0 } }), [color])
  const sparks = useMemo(() => createSparks(), [])
  useEffect(() => () => sparks.dispose(), [sparks])
  const sparkUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: SPARKS.height },
      uSize: { value: 1 },
      uGold: { value: new Color().copy(sceneColors.warm).multiplyScalar(2) },
      uPink: { value: new Color().copy(sceneColors.pink).multiplyScalar(1.8) },
    }),
    [],
  )
  const shardUniforms = useMemo(
    () =>
      SHARDS.map((shard) => ({
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uArc: { value: new Vector2(shard.arc[0], shard.arc[1]) },
        uWidth: { value: shard.width },
        uPeriod: { value: shard.period },
        uPhase: { value: shard.phase },
        uColors: { value: [sceneColors.teal, sceneColors.violet, sceneColors.pink] },
      })),
    [],
  )

  useFrame(() => {
    const g = group.current
    const m = halo.current
    if (!g || !m) return
    const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2
    // Present at the hero, gone a third of the way to the statement; back with the loop.
    const here = Math.max(1 - ease(journey.camera * 2.5), ease((journey.loop - 0.5) * 2))
    const amount = here * revealed(1.6, 0.6)
    g.visible = amount > 0.01
    if (!g.visible) return
    const breath = 0.5 + 0.5 * Math.sin((clock.time / 6) * Math.PI * 2)
    // A whisper of a halo: the space round The Core stays dark (at_01), its colour lives in
    // the glass. Portrait screens see a narrower slice, where it would fill the frame.
    const portrait = size.width < size.height ? 0.6 : 1
    ;(m.material as ShaderMaterial).uniforms.uOpacity!.value =
      amount * (0.035 + 0.025 * breath) * portrait
    const spark = (sparkPoints.current?.material as ShaderMaterial | undefined)?.uniforms
    if (spark) {
      spark.uTime!.value = clock.time
      spark.uSize!.value = 0.05 * size.height * dpr
    }
    shards.current.forEach((mesh) => {
      const u = (mesh?.material as ShaderMaterial | undefined)?.uniforms
      if (!u) return
      u.uTime!.value = clock.time
      u.uOpacity!.value = amount * 0.06 * portrait
    })
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={halo} position={[CENTRE[0], CENTRE[1], -1.8]}>
        <planeGeometry args={[8, 8]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
      {SHARDS.map((shard, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            shards.current[i] = mesh
          }}
          position={[shard.at[0], shard.at[1], shard.at[2]]}
          raycast={() => null}
        >
          <planeGeometry args={[shard.size, shard.size]} />
          <shaderMaterial
            vertexShader={vertexShader}
            fragmentShader={shardFragment}
            uniforms={shardUniforms[i]}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
      <ChipCluster clusters={DUST} count={150} size={2.2} clock={clock} focusDistance={10} />
      <points
        ref={sparkPoints}
        geometry={sparks}
        position={[CENTRE[0], CENTRE[1] - 0.5, 0]}
        frustumCulled={false}
        raycast={() => null}
      >
        <shaderMaterial
          vertexShader={sparkVertex}
          fragmentShader={sparkFragment}
          uniforms={sparkUniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  )
}
