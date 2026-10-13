import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, type ShaderMaterial } from 'three'
import { sceneColors } from '@/styles/scene'
import particlesFragment from '../shaders/particles.frag'
import motesVertex from '../shaders/motes.vert'
import type { SceneClock } from '../useSceneClock'
import { createMotesGeometry, createMotesUniforms, gaussian } from './motes'
import { PLACES } from './path'

const COUNT = 22000
/** Extent of the sheet: wide, deep enough to fill the view from below, and reaching past the camera so it flies through. */
const HALF = { x: 16, zNear: 9.5, zFar: -8 }

/**
 * Mostly a thin layer, with a loose haze either side of it, denser towards its far edge so
 * that edge reads crisply from below: the diagonal line across the top of the frame.
 */
function createSheet() {
  return createMotesGeometry(COUNT, (_, out) => {
    const loose = Math.random() < 0.1
    const depth = 1 - Math.random() ** 1.6
    out.set(
      (Math.random() * 2 - 1) * HALF.x,
      gaussian() * (loose ? 0.6 : 0.08),
      HALF.zNear + (HALF.zFar - HALF.zNear) * depth,
    )
  })
}

/**
 * The scene change: a thin, slanted sheet of dust between the hero and the statement. The
 * camera passes through it on the way down (the wipe), and from below it stays as a dusty
 * ceiling with a diagonal edge at the top of the frame. Its hue drifts teal → gold → pink.
 */
export function DustSheet({ clock }: { clock: SceneClock }) {
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => createSheet(), [])
  const uniforms = useMemo(
    () => createMotesUniforms([sceneColors.teal, sceneColors.warm, sceneColors.pink]),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ size, viewport }) => {
    if (!material.current) return
    const u = material.current.uniforms
    u.uTime!.value = clock.time
    u.uOpacity!.value = 1.3
    // Flying through, the nearest motes stay fine sparks instead of big discs.
    u.uAperture!.value = 0.45
    u.uMaxSize!.value = 14
    // Little fog: the far edge stays crisp.
    u.uFogFar!.value = 60
    u.uCycle!.value = clock.time * 0.05
    u.uViewportHeight!.value = size.height * viewport.dpr
  })

  return (
    // Just above the statement, tilted so its edge reads as a diagonal rising to the right.
    <points
      geometry={geometry}
      position={[0, PLACES.statement + 2.7, 0]}
      rotation={[0.07, 0, 0.17]}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={material}
        vertexShader={motesVertex}
        fragmentShader={particlesFragment}
        uniforms={uniforms}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </points>
  )
}
