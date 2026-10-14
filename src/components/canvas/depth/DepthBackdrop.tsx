import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  Color,
  CustomBlending,
  type Mesh,
  OneMinusSrcAlphaFactor,
  type ShaderMaterial,
  SrcAlphaFactor,
} from 'three'
import { sceneColors } from '@/styles/scene'
import fragmentShader from '../shaders/depthBackdrop.frag'
import vertexShader from '../shaders/depthBackdrop.vert'

/** The colours of Depth's darkness, from the tokens. */
export const DEPTH_TOP = new Color()
  .copy(sceneColors.teal)
  .multiplyScalar(0.07)
  .lerp(sceneColors.bg, 0.8)
export const DEPTH_BOTTOM = new Color().copy(sceneColors.bg).multiplyScalar(0.8)
/** What the far water fades into (about the middle of the gradient). */
export const DEPTH_FOG = new Color().copy(DEPTH_TOP).lerp(DEPTH_BOTTOM, 0.35)

/** Fullscreen gradient + vignette behind Depth, blended in by `opacity()`. */
export function DepthBackdrop({ opacity }: { opacity: () => number }) {
  const mesh = useRef<Mesh>(null)
  const uniforms = useMemo(
    () => ({
      uTop: { value: DEPTH_TOP },
      uBottom: { value: DEPTH_BOTTOM },
      uOpacity: { value: 0 },
      uAspect: { value: 1 },
    }),
    [],
  )
  useFrame(({ size }) => {
    if (!mesh.current) return
    const value = opacity()
    mesh.current.visible = value > 0.005
    const u = (mesh.current.material as ShaderMaterial).uniforms
    u.uOpacity!.value = value
    u.uAspect!.value = size.width / size.height
  })
  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        // Drawn first in the opaque pass (renderOrder -1), still blended by its opacity: as
        // a transparent object it would draw after, and over, the opaque scene.
        blending={CustomBlending}
        blendSrc={SrcAlphaFactor}
        blendDst={OneMinusSrcAlphaFactor}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
