import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type Mesh, type ShaderMaterial } from 'three'
import { sceneColors } from '@/styles/scene'
import { warmth } from '../Backdrop'
import fragmentShader from '../shaders/glow.frag'
import vertexShader from '../shaders/glow.vert'
import { type JourneyState, PLACES } from './path'

/**
 * Contact's warm moment, concentrated on The Core: a soft warm glow just behind it, rising
 * with it. The rest of the frame stays in the shared grade (no full-screen wash).
 */
export function ContactGlow({ journey }: { journey: JourneyState }) {
  const mesh = useRef<Mesh>(null)
  const color = useMemo(() => new Color().copy(sceneColors.warm).lerp(sceneColors.ember, 0.35), [])
  const uniforms = useMemo(() => ({ uColor: { value: color }, uOpacity: { value: 0 } }), [color])

  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const value = warmth(journey)
    m.visible = value > 0.01
    ;(m.material as ShaderMaterial).uniforms.uOpacity!.value = value * 0.2
  })

  return (
    <mesh ref={mesh} position={[0, PLACES.contact + 0.15, -1.6]} visible={false}>
      <planeGeometry args={[9, 9]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
