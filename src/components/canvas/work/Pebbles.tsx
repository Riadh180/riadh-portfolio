import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  type Color,
  type ShaderMaterial,
} from 'three'
import { useTier } from '@/stores/tier'
import { sceneColors, sceneConfig } from '@/styles/scene'
import { gaussian } from '../journey/motes'
import fragmentShader from '../shaders/glitter.frag'
import vertexShader from '../shaders/glitter.vert'
import type { SceneClock } from '../useSceneClock'

/** Glitter points: per-grain orbit / cloud / seed (positions come from the shader). */
function chipGeometry(orbit: Float32Array, cloud: Float32Array, seed: Float32Array, count: number) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('orbit', new Float32BufferAttribute(orbit, 4))
  geometry.setAttribute('cloud', new Float32BufferAttribute(cloud, 4))
  geometry.setAttribute('seed', new Float32BufferAttribute(seed, 4))
  return geometry
}

/**
 * Loose drifting clouds round the column and between the cards: [x, y, z, spread], at
 * the cards' heights and in the gaps between them, spread through depth.
 */
const CLOUDS: [number, number, number, number][] = Array.from({ length: 14 }, (_, k) => {
  const angle = k * 2.4
  // Tight clouds near the column (and the cards' inner edges), not open space.
  const near = 1.2 + (k % 3) * 0.35
  return [Math.cos(angle) * near, 3 - k * 0.95, Math.sin(angle) * near, 0.45 + (k % 4) * 0.12]
})

/**
 * Most chips sit in dense clusters strung up the spine (each cluster rises as one, since
 * they share a speed); some drift loose round it; a share sit in the small clouds.
 * Each gets its orbit (angle, reach, start height, speed), its cloud, and a seed.
 */
function createPebbles() {
  const { count, hug, clouds } = sceneConfig.pebbles
  const halfHeight = sceneConfig.spine.height / 2
  const orbit = new Float32Array(count * 4)
  const cloud = new Float32Array(count * 4)
  const seed = new Float32Array(count * 4)
  // Dense clusters strung up the column: each column chip belongs to one, at that height.
  const clusters = Array.from({ length: 16 }, (_, k) => ({
    y: (k / 15 - 0.5) * halfHeight * 2 + (Math.random() - 0.5) * 0.4,
    angle: Math.random() * Math.PI * 2,
  }))
  for (let i = 0; i < count; i++) {
    const inCloud = Math.random() < clouds
    const cluster = clusters[i % clusters.length] ?? { y: 0, angle: 0 }
    // Almost nothing in empty space: few loose chips.
    const loose = Math.random() < 0.02
    // Density falls off with distance from the spine: dense close in, wispy outside.
    // Capped well inside the cards' ring, so grains don't cover a card's face.
    const reach = inCloud ? 0.2 + Math.random() * 0.8 : 0.9 + Math.random() ** 3 * (1.45 - hug)
    orbit.set(
      [
        loose ? Math.random() * Math.PI * 2 : cluster.angle + gaussian() * 0.8,
        reach,
        loose ? (Math.random() * 2 - 1) * halfHeight : cluster.y + gaussian() * 0.22,
        0.9 + Math.random() * 0.2,
      ],
      i * 4,
    )
    const home = CLOUDS[i % CLOUDS.length] ?? [0, 0, 0, 0]
    cloud.set(inCloud ? home : [0, 0, 0, 0], i * 4)
    seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
  }
  return chipGeometry(orbit, cloud, seed, count)
}

/** Muted glitter: mostly silver-lilac, some violet/pink, a little teal and gold. */
const GLITTER = [
  sceneColors.glass.clone().lerp(sceneColors.violet, 0.45),
  sceneColors.violet.clone().lerp(sceneColors.pink, 0.4),
  sceneColors.teal.clone(),
  sceneColors.warm.clone(),
]

/** World size of a tiny grain at the focus (1–2 px at 1×). */
const GRAIN = 0.011

function createUniforms(focusDistance: number, palette?: Color[]) {
  return {
    uTime: { value: 0 },
    uSize: { value: 0 },
    uViewportHeight: { value: 900 },
    uBokeh: { value: 1 },
    uBrightness: { value: 1 },
    uRadius: { value: 1 },
    uRise: { value: 0 },
    uHalfHeight: { value: sceneConfig.spine.height / 2 },
    uFocusDistance: { value: focusDistance },
    uPalette: { value: palette ?? GLITTER },
  }
}

function updateUniforms(
  material: ShaderMaterial | null,
  clock: SceneClock,
  viewportHeight: number,
  scale = 1,
) {
  if (!material) return
  const { brightness, radius, rise } = sceneConfig.pebbles
  const u = material.uniforms
  u.uTime!.value = clock.time
  u.uSize!.value = GRAIN * scale
  u.uViewportHeight!.value = viewportHeight
  // Bokeh on the full tier only.
  u.uBokeh!.value = useTier.getState().tier === 'lite' ? 0 : 1
  u.uBrightness!.value = brightness
  u.uRadius!.value = radius
  u.uRise!.value = rise
}

type Props = { clock: SceneClock; focusDistance: number }

/**
 * Glitter round the spine: mostly tiny, dim, muted grains that twinkle now and then, a
 * few small and medium ones, a handful of faceted sparks; in loose layered clouds dense at
 * the spine and wispy outside. Points moved in the vertex shader: one draw call.
 */
export function Pebbles({ clock, focusDistance }: Props) {
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => createPebbles(), [])
  const uniforms = useMemo(() => createUniforms(focusDistance), [focusDistance])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ size, viewport }) =>
    updateUniforms(material.current, clock, size.height * viewport.dpr),
  )

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

/**
 * A few chips clustered round a job card's edges, in the card's own space (so they move
 * with it): small clouds at the given points, [x, y, z, spread]. Same chips as round the
 * spine, same shader.
 */
export function ChipCluster({
  clusters,
  count,
  size = 1,
  clock,
  focusDistance,
  palette,
}: {
  clusters: [number, number, number, number][]
  count: number
  /** Chip size relative to the spine's chips. */
  size?: number
  clock: SceneClock
  focusDistance: number
  /** Four tints (default: silver-lilac, violet/pink, teal, gold). */
  palette?: Color[]
}) {
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => createCluster(clusters, count), [clusters, count])
  const uniforms = useMemo(() => createUniforms(focusDistance, palette), [focusDistance, palette])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame((state) =>
    updateUniforms(material.current, clock, state.size.height * state.viewport.dpr, size),
  )
  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

function createCluster(clusters: [number, number, number, number][], count: number) {
  const orbit = new Float32Array(count * 4)
  const cloud = new Float32Array(count * 4)
  const seed = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    orbit.set(
      [
        Math.random() * Math.PI * 2,
        0.15 + Math.random(),
        Math.random() * 6,
        0.4 + Math.random() * 0.5,
      ],
      i * 4,
    )
    cloud.set(clusters[i % clusters.length] ?? [0, 0, 0, 0.1], i * 4)
    seed.set([Math.random() * 0.7, Math.random(), Math.random(), Math.random()], i * 4)
  }
  return chipGeometry(orbit, cloud, seed, count)
}
