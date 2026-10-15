import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Points,
  type ShaderMaterial,
} from 'three'
import { sceneColors } from '@/styles/scene'
import { warmth } from '../Backdrop'
import fragmentShader from '../shaders/ember.frag'
import vertexShader from '../shaders/bubble.vert'
import type { SceneClock } from '../useSceneClock'
import { type JourneyState, PLACES } from './path'

const COUNT = 40

function createEmbers() {
  const positions = new Float32Array(COUNT * 3)
  const seeds = new Float32Array(COUNT * 4)
  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 0.6 + Math.random() * 1.8
    positions.set([Math.cos(a) * r, Math.random() * 5, Math.sin(a) * r * 0.6], i * 3)
    seeds.set([Math.random() * 0.4, Math.random(), Math.random(), Math.random() * 0.6], i * 4)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 4))
  return geometry
}

/** A few embers rising round The Core at Contact: the warm moment, arriving home. */
export function ContactEmbers({ journey, clock }: { journey: JourneyState; clock: SceneClock }) {
  const points = useRef<Points>(null)
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const geometry = useMemo(() => createEmbers(), [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: 5 },
      uSize: { value: 1 },
      uColor: { value: new Color().copy(sceneColors.warm).lerp(sceneColors.ember, 0.3) },
    }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    const p = points.current
    if (!p) return
    const value = warmth(journey)
    p.visible = value > 0.02
    if (!p.visible) return
    const u = (p.material as ShaderMaterial).uniforms
    u.uTime!.value = clock.time
    u.uSize!.value = 0.05 * size.height * dpr * value
  })

  return (
    <points
      ref={points}
      geometry={geometry}
      position={[0, PLACES.contact - 1.6, 0.4]}
      frustumCulled={false}
      visible={false}
    >
      <shaderMaterial
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
