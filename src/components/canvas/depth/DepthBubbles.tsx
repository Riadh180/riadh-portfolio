import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  type ShaderMaterial,
} from 'three'
import { sceneColors } from '@/styles/scene'
import fragmentShader from '../shaders/bubble.frag'
import vertexShader from '../shaders/bubble.vert'
import type { SceneClock } from '../useSceneClock'

const COUNT = 70
const BOX = { width: 9, height: 13, depth: 5 }

function createBubbles() {
  const positions = new Float32Array(COUNT * 3)
  const seeds = new Float32Array(COUNT * 4)
  for (let i = 0; i < COUNT; i++) {
    positions.set(
      [
        (Math.random() - 0.4) * BOX.width,
        Math.random() * BOX.height,
        -Math.random() * BOX.depth + 1,
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

/** A few larger bubbles drifting up through Depth: under water, going deeper. */
export function DepthBubbles({ clock }: { clock: SceneClock }) {
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => createBubbles(), [])
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: BOX.height },
      uSize: { value: 1 },
      uColor: { value: sceneColors.glow },
    }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(() => {
    const m = material.current
    if (!m) return
    m.uniforms.uTime!.value = clock.time
    m.uniforms.uSize!.value = 0.07 * size.height * dpr
  })
  return (
    <points geometry={geometry} frustumCulled={false} position={[0, 0.5, 0]}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </points>
  )
}
