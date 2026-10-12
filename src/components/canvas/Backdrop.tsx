import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { ShaderMaterial } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import fragmentShader from './shaders/backdrop.frag'
import vertexShader from './shaders/backdrop.vert'
import type { LightRig } from './useLightRig'

/** Fullscreen deep-space backdrop with light pools tied to the scene lights. */
export function Backdrop({ rig }: { rig: LightRig }) {
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uBackground: { value: sceneColors.bg },
      uPools: { value: rig.screen },
      uPoolColors: { value: rig.colors },
      uPoolStrength: { value: 0 },
      uAspect: { value: 1 },
    }),
    [rig],
  )

  useFrame(({ size }) => {
    if (!material.current) return
    material.current.uniforms.uPoolStrength!.value = sceneConfig.light.pools
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
