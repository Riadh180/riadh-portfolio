import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { ShaderMaterial } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import fragmentShader from './shaders/backdrop.frag'
import vertexShader from './shaders/backdrop.vert'

/** Fullscreen backdrop: teal bleeding in from the lower left, violet from the upper right. */
export function Backdrop() {
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uBackground: { value: sceneColors.bg },
      uLowerLeft: { value: sceneColors.teal },
      uUpperRight: { value: sceneColors.violet },
      uStrength: { value: 0 },
      uAspect: { value: 1 },
    }),
    [],
  )

  useFrame(({ size }) => {
    if (!material.current) return
    material.current.uniforms.uStrength!.value = sceneConfig.light.corners
    material.current.uniforms.uAspect!.value = size.width / size.height
  })

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
