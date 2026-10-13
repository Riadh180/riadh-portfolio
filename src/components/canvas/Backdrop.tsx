import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { ShaderMaterial } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import type { JourneyState } from './journey/path'
import fragmentShader from './shaders/backdrop.frag'
import vertexShader from './shaders/backdrop.vert'

/**
 * Fullscreen backdrop: teal bleeding in from the lower left, violet from the upper right.
 * The glows belong to the hero: they fade almost to black as the camera descends to the
 * statement, so the type and the glass stand out there.
 */
export function Backdrop({ journey }: { journey?: JourneyState }) {
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
    const descent = journey?.camera ?? 0
    material.current.uniforms.uStrength!.value = sceneConfig.light.corners * (1 - 0.88 * descent)
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
