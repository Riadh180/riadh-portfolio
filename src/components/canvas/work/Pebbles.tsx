import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Float32BufferAttribute, type ShaderMaterial } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import { gaussian } from '../journey/motes'
import fragmentShader from '../shaders/pebbles.frag'
import vertexShader from '../shaders/pebbles.vert'
import type { SceneClock } from '../useSceneClock'

/** A few small clouds off the column: [x, y, z, spread]. */
const CLOUDS: [number, number, number, number][] = [
  [-1.4, 2.4, 2.2, 0.45],
  [1.6, -1.1, 2.0, 0.38],
  [-1.6, -3.2, -0.4, 0.4],
  [1.7, 3.6, -0.6, 0.32],
]

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
    const loose = Math.random() < 0.25
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
  const geometry = new BufferGeometry()
  // Positions come from the shader; three still needs a position attribute to draw.
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('orbit', new Float32BufferAttribute(orbit, 4))
  geometry.setAttribute('cloud', new Float32BufferAttribute(cloud, 4))
  geometry.setAttribute('seed', new Float32BufferAttribute(seed, 4))
  return geometry
}

function createUniforms(focusDistance: number) {
  return {
    uTime: { value: 0 },
    uSize: { value: 0 },
    uBrightness: { value: 1 },
    uRadius: { value: 1 },
    uRise: { value: 0 },
    uHalfHeight: { value: sceneConfig.spine.height / 2 },
    uAperture: { value: 4 },
    uFocusDistance: { value: focusDistance },
    uViewportHeight: { value: 1 },
    uPalette: {
      value: [sceneColors.pink, sceneColors.violet, sceneColors.teal, sceneColors.emerald],
    },
  }
}

function updateUniforms(
  material: ShaderMaterial | null,
  clock: SceneClock,
  viewportHeight: number,
  scale = 1,
) {
  if (!material) return
  const { size, brightness, radius, rise } = sceneConfig.pebbles
  const u = material.uniforms
  u.uTime!.value = clock.time
  u.uSize!.value = size * scale
  u.uBrightness!.value = brightness
  u.uRadius!.value = radius
  u.uRise!.value = rise
  u.uViewportHeight!.value = viewportHeight
}

type Props = { clock: SceneClock; focusDistance: number }

/**
 * Small chips of tinted glass (pink, violet, teal, emerald), slightly see-through and
 * glinting, packed in dense clusters round the spine and in a few small clouds, rising
 * slowly; a rare few large ones blur out of focus. Nothing far from the column. All motion
 * runs in the vertex shader, so thousands cost only a draw call.
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
}: {
  clusters: [number, number, number, number][]
  count: number
  /** Chip size relative to the spine's chips. */
  size?: number
  clock: SceneClock
  focusDistance: number
}) {
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => createCluster(clusters, count), [clusters, count])
  const uniforms = useMemo(() => createUniforms(focusDistance), [focusDistance])
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
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('orbit', new Float32BufferAttribute(orbit, 4))
  geometry.setAttribute('cloud', new Float32BufferAttribute(cloud, 4))
  geometry.setAttribute('seed', new Float32BufferAttribute(seed, 4))
  return geometry
}
