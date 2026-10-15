import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  IcosahedronGeometry,
  DoubleSide,
  type Color,
  type ShaderMaterial,
} from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import { gaussian } from '../journey/motes'
import fragmentShader from '../shaders/glassChip.frag'
import vertexShader from '../shaders/glassChip.vert'
import type { SceneClock } from '../useSceneClock'

/** The bead every grain is drawn from: a faceted near-sphere (icosahedron, 20 faces). */
const SHARD = new IcosahedronGeometry(1, 0)

/** Instanced chips: one shard, per-chip orbit / cloud / seed (positions come from the shader). */
function chipGeometry(orbit: Float32Array, cloud: Float32Array, seed: Float32Array, count: number) {
  const geometry = new InstancedBufferGeometry()
  geometry.index = SHARD.index
  geometry.setAttribute('position', SHARD.getAttribute('position'))
  geometry.setAttribute('normal', SHARD.getAttribute('normal'))
  geometry.setAttribute('orbit', new InstancedBufferAttribute(orbit, 4))
  geometry.setAttribute('cloud', new InstancedBufferAttribute(cloud, 4))
  geometry.setAttribute('seed', new InstancedBufferAttribute(seed, 4))
  geometry.instanceCount = count
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
    const reach = inCloud
      ? 0.2 + Math.random() * 0.8
      : 0.85 + Math.abs(gaussian()) * (1 - hug) * 0.6
    orbit.set(
      [
        loose ? Math.random() * Math.PI * 2 : cluster.angle + gaussian() * 0.45,
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

function createUniforms(focusDistance: number, palette?: Color[]) {
  return {
    uTime: { value: 0 },
    uSize: { value: 0 },
    uBrightness: { value: 1 },
    uRadius: { value: 1 },
    uRise: { value: 0 },
    uHalfHeight: { value: sceneConfig.spine.height / 2 },
    uFocusDistance: { value: focusDistance },
    uFilm: { value: [sceneColors.glow, sceneColors.violet, sceneColors.warm] },
    uPalette: {
      value: palette ?? [
        sceneColors.pink,
        sceneColors.violet,
        sceneColors.teal,
        sceneColors.emerald,
      ],
    },
  }
}

function updateUniforms(material: ShaderMaterial | null, clock: SceneClock, scale = 1) {
  if (!material) return
  const { size, brightness, radius, rise } = sceneConfig.pebbles
  const u = material.uniforms
  u.uTime!.value = clock.time
  u.uSize!.value = size * scale
  u.uBrightness!.value = brightness
  u.uRadius!.value = radius
  u.uRise!.value = rise
}

type Props = { clock: SceneClock; focusDistance: number }

/**
 * Small shards of tinted glass (pink, violet, teal, emerald), tumbling and glinting,
 * packed in dense clusters round the spine and in a few small clouds, rising slowly; a
 * rare few large ones. Nothing far from the column. Instanced, moved in the vertex
 * shader: thousands cost one draw call.
 */
export function Pebbles({ clock, focusDistance }: Props) {
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => createPebbles(), [])
  const uniforms = useMemo(() => createUniforms(focusDistance), [focusDistance])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => updateUniforms(material.current, clock))

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
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
  /** Four tints for the grains (default: pink, violet, teal, emerald). */
  palette?: Color[]
}) {
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => createCluster(clusters, count), [clusters, count])
  const uniforms = useMemo(() => createUniforms(focusDistance, palette), [focusDistance, palette])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(() => updateUniforms(material.current, clock, size))
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
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
