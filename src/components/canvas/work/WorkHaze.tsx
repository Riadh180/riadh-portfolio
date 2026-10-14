import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type Mesh, type ShaderMaterial } from 'three'
import { sceneColors } from '@/styles/scene'
import { type JourneyState, PLACES } from '../journey/path'
import fragmentShader from '../shaders/glow.frag'
import vertexShader from '../shaders/glow.vert'

/**
 * Work's mid-tone lift: a tall, soft violet haze just behind the column, following the
 * camera down, so the mass sits in purple light like the reference (an accent light in the
 * world, not a change to the shared grade).
 */
export function WorkHaze({ journey }: { journey: JourneyState }) {
  const mesh = useRef<Mesh>(null)
  const color = useMemo(() => new Color().copy(sceneColors.violet).lerp(sceneColors.pink, 0.2), [])
  const uniforms = useMemo(() => ({ uColor: { value: color }, uOpacity: { value: 0 } }), [color])

  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2
    const amount = ease((journey.toWork - 0.6) / 0.4) * (1 - ease(journey.toSystem * 1.5))
    m.visible = amount > 0.01
    m.position.y = journey.y - PLACES.work
    ;(m.material as ShaderMaterial).uniforms.uOpacity!.value = amount * 0.22
  })

  return (
    <mesh ref={mesh} position={[0, 0, -2.4]} scale={[10, 14, 1]} visible={false}>
      <planeGeometry args={[1, 1]} />
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
