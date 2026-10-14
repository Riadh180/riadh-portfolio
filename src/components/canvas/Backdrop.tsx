import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, type ShaderMaterial } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import type { JourneyState } from './journey/path'
import fragmentShader from './shaders/backdrop.frag'
import vertexShader from './shaders/backdrop.vert'

/** 0..1: Contact's warm moment, risen with The Core and gone again by the end of the loop. */
export function warmth(journey: JourneyState) {
  const rise = Math.min(1, Math.max(0, (journey.toContact - 0.3) / 0.7))
  return rise * rise * (3 - 2 * rise) * (1 - journey.loop)
}

/**
 * Fullscreen backdrop: teal bleeding in from the lower left, violet from the upper right.
 * The glows belong to the hero: they fade almost to black as the camera descends to the
 * statement, so the type and the glass stand out there; they return, warm, at Contact.
 */
export function Backdrop({ journey }: { journey?: JourneyState }) {
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uBackground: { value: sceneColors.bg },
      uLowerLeft: { value: new Color().copy(sceneColors.teal) },
      uUpperRight: { value: new Color().copy(sceneColors.violet) },
      uStrength: { value: 0 },
      uAspect: { value: 1 },
    }),
    [],
  )

  useFrame(({ size }) => {
    if (!material.current) return
    const u = material.current.uniforms
    // Contact's warm accent: the glows rise again in ember and gold, then the loop turns
    // them back into the hero's teal and violet.
    const warm = journey ? warmth(journey) : 0
    const back = journey ? journey.loop : 0
    const descent = (journey?.camera ?? 0) * (1 - Math.max(warm, back))
    u.uStrength!.value = sceneConfig.light.corners * (1 - 0.88 * descent)
    ;(u.uLowerLeft!.value as Color).copy(sceneColors.teal).lerp(sceneColors.ember, warm)
    ;(u.uUpperRight!.value as Color).copy(sceneColors.violet).lerp(sceneColors.warm, warm)
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
