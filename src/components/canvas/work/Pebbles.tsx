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
  const uniforms = useMemo(
    () => ({
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
    }),
    [focusDistance],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ size, viewport }) => {
    if (!material.current) return
    const { size: pebbleSize, brightness, radius, rise } = sceneConfig.pebbles
    const u = material.current.uniforms
    u.uTime!.value = clock.time
    u.uSize!.value = pebbleSize
    u.uBrightness!.value = brightness
    u.uRadius!.value = radius
    u.uRise!.value = rise
    u.uViewportHeight!.value = size.height * viewport.dpr
  })

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
