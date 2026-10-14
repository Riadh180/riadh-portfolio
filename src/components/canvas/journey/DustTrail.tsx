import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, type Color, type Points, type ShaderMaterial } from 'three'
import particlesFragment from '../shaders/particles.frag'
import motesVertex from '../shaders/motes.vert'
import { createMotesGeometry, createMotesUniforms, gaussian } from './motes'

type Trail = {
  /** World heights the trail runs between (top to bottom). */
  top: number
  bottom: number
  /** Its centre line's x at the top and at the bottom (it drifts across on the way). */
  fromX: number
  toX: number
  /** Loose width round the centre line, and how far it spreads in depth. */
  width: number
  depth: number
  count: number
  colors: [Color, Color, Color]
  /** How strongly the trail shows now (0 hides it): set from the journey. */
  amount: () => number
  brightness?: number
}

type Shape = Pick<Trail, 'top' | 'bottom' | 'fromX' | 'toX' | 'width' | 'depth' | 'count'>

function createTrail({ top, bottom, fromX, toX, width, depth, count }: Shape) {
  return createMotesGeometry(count, (_, out) => {
    const t = Math.random()
    const x = fromX + (toX - fromX) * t * t + Math.sin(t * 5) * width * 0.4
    // Spread in depth towards the camera (z > 0): the camera passes through it.
    out.set(x + gaussian() * width * 1.6, top + (bottom - top) * t, gaussian() * depth * 1.8 + 1.5)
  })
}

/**
 * A faint trail of dust between two places, so a transition always passes through
 * something: the camera follows it down. A loose, slowly curving column of motes.
 */
export function DustTrail({
  top,
  bottom,
  fromX,
  toX,
  width,
  depth,
  count,
  colors,
  amount,
  brightness = 1.6,
}: Trail) {
  const points = useRef<Points>(null)
  const geometry = useMemo(
    () => createTrail({ top, bottom, fromX, toX, width, depth, count }),
    [top, bottom, fromX, toX, width, depth, count],
  )
  const uniforms = useMemo(() => createMotesUniforms(colors), [colors])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ size, viewport, clock }) => {
    const p = points.current
    if (!p) return
    const value = amount()
    p.visible = value > 0.01
    if (!p.visible) return
    const u = (p.material as ShaderMaterial).uniforms
    u.uTime!.value = clock.elapsedTime
    u.uOpacity!.value = value * brightness
    u.uSpread!.value = 0.5
    u.uDrift!.value = 0.12
    u.uSize!.value = 0.03
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
