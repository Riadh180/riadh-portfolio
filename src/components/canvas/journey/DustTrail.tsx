import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, type Points, type ShaderMaterial } from 'three'
import { sceneColors } from '@/styles/scene'
import particlesFragment from '../shaders/particles.frag'
import motesVertex from '../shaders/motes.vert'
import { createMotesGeometry, createMotesUniforms, gaussian } from './motes'
import { DESCENT } from './descent'
import { type JourneyState, PLACES, WORK } from './path'

const COUNT = 1800

/**
 * A faint trail of dust from the wireframe beat down to the top of the spine: after the
 * wireframe scatters, the camera follows it down, so the last stretch of the descent is
 * never empty. A loose, slowly curving column, teal fading to Work's violet.
 */
function createTrail() {
  const top = (PLACES.statement + PLACES.work) / 2
  const bottom = PLACES.work + 2.5
  return createMotesGeometry(COUNT, (_, out) => {
    const t = Math.random()
    const y = top + (bottom - top) * t
    // Drifts towards the spine (right of centre on desktop) on the way down.
    const x = WORK.x * t * t + Math.sin(t * 5) * 0.4
    out.set(x + gaussian() * 0.9, y, gaussian() * 1.4 - 1)
  })
}

type Props = { journey: JourneyState }

export function DustTrail({ journey }: Props) {
  const points = useRef<Points>(null)
  const geometry = useMemo(() => createTrail(), [])
  const uniforms = useMemo(
    () => createMotesUniforms([sceneColors.teal, sceneColors.violet, sceneColors.glow]),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ size, viewport, clock }) => {
    const p = points.current
    if (!p) return
    const { toWork } = journey
    // Fades in as the wireframe goes, out once the spine fills the view.
    const amount =
      Math.min(1, Math.max(0, (toWork - DESCENT.holdTo + 0.05) / 0.1)) *
      Math.min(1, Math.max(0, (1 - toWork) / 0.12))
    p.visible = amount > 0.01
    if (!p.visible) return
    const u = (p.material as ShaderMaterial).uniforms
    u.uTime!.value = clock.elapsedTime
    u.uOpacity!.value = amount * 0.9
    u.uSpread!.value = 0.5
    u.uDrift!.value = 0.12
    u.uViewportHeight!.value = size.height * viewport.dpr
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} visible={false}>
      <shaderMaterial
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
