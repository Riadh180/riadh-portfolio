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
import { jobs } from '@/content/site'
import { orbitPose, SPIRAL } from './layout'
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

/** One pocket of grains: centre, spread and its own hue (a bucket of the palette). */
type Pocket = { x: number; y: number; z: number; spread: number; hue: number }

/** Hue buckets in the glitter palette: violet/pink, teal, green-gold. */
const HUES = [0.7, 0.8, 0.9, 0.97]

/**
 * 14 compact "foam pockets": 8 hugging the spine's surface at different heights, 6 at the
 * inner edges of the cards (between each card and the column), each its own muted hue.
 */
function createPockets(): Pocket[] {
  const pockets: Pocket[] = []
  for (let k = 0; k < 8; k++) {
    const angle = k * 2.3 + 0.4
    pockets.push({
      x: Math.cos(angle) * 1.15,
      y: 4.2 - k * 1.25,
      z: Math.sin(angle) * 1.15,
      spread: 0.32 + (k % 3) * 0.08,
      hue: HUES[k % HUES.length] ?? 0.7,
    })
  }
  for (let i = 0; i < jobs.length; i++) {
    const pose = orbitPose(i, jobs.length)
    // Between the card and the column, a little to the column's side of the card.
    const angle = pose.angle - Math.sign(pose.angle - (i / (jobs.length - 1)) * SPIRAL) * 0.35
    pockets.push({
      x: Math.sin(angle) * 1.85,
      y: pose.y - 0.4,
      z: Math.cos(angle) * 1.85,
      spread: 0.38,
      hue: HUES[(i + 1) % HUES.length] ?? 0.8,
    })
  }
  return pockets
}

/**
 * ~90% of the grains in the pockets (dense at the core, quick falloff), ~10% as a sparse
 * silver dust round the column, with real empty space between. Each grain gets its orbit
 * (angle, reach, start height, speed), its pocket (or none) and a seed.
 */
function createPebbles() {
  const { count } = sceneConfig.pebbles
  const halfHeight = sceneConfig.spine.height / 2
  const pockets = createPockets()
  const orbit = new Float32Array(count * 4)
  const cloud = new Float32Array(count * 4)
  const seed = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    const inPocket = Math.random() < 0.9
    const pocket = pockets[i % pockets.length]
    if (inPocket && pocket) {
      // Dense core: the reach is squared, so most grains sit near the centre.
      orbit.set(
        [
          Math.random() * Math.PI * 2,
          Math.random() ** 2.2,
          Math.random() * 6,
          0.5 + Math.random() * 0.5,
        ],
        i * 4,
      )
      cloud.set([pocket.x, pocket.y, pocket.z, pocket.spread], i * 4)
      seed.set(
        [Math.random(), pocket.hue + (Math.random() - 0.5) * 0.04, Math.random(), Math.random()],
        i * 4,
      )
    } else {
      // Sparse silver dust round the column.
      orbit.set(
        [
          Math.random() * Math.PI * 2,
          0.9 + Math.random() ** 2 * 0.6,
          (Math.random() * 2 - 1) * halfHeight,
          0.9 + Math.random() * 0.2,
        ],
        i * 4,
      )
      cloud.set([0, 0, 0, 0], i * 4)
      seed.set([Math.random(), Math.random() * 0.6, Math.random(), Math.random()], i * 4)
    }
  }
  return chipGeometry(orbit, cloud, seed, count)
}

/** Muted glitter: silver-lilac dust, violet/pink, teal and a little gold (pocket hues). */
const GLITTER = [
  sceneColors.glass.clone().lerp(sceneColors.violet, 0.45),
  sceneColors.violet.clone().lerp(sceneColors.pink, 0.4),
  sceneColors.teal.clone(),
  sceneColors.emerald.clone().lerp(sceneColors.warm, 0.6),
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
