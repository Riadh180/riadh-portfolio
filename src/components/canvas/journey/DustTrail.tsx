import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, type Color, type Points, type ShaderMaterial } from 'three'
import { syncGrainTier } from '../particles/CursorField'
import { createMotesGeometry, createMotesUniforms, gaussian, grainMotes } from './motes'

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
  /** Narrows to a point at the bottom (the trail streams into the next place's centre). */
  gather?: boolean
}

type Shape = Pick<
  Trail,
  'top' | 'bottom' | 'fromX' | 'toX' | 'width' | 'depth' | 'count' | 'gather'
>

function createTrail({ top, bottom, fromX, toX, width, depth, count, gather }: Shape) {
  return createMotesGeometry(count, (_, out) => {
    const t = Math.random()
    const x = fromX + (toX - fromX) * t * t + Math.sin(t * 5) * width * 0.4
    const narrow = gather ? 1 - t * t * 0.9 : 1
    // Spread in depth towards the camera (z > 0): the camera passes through it.
    out.set(
      x + gaussian() * width * 1.6 * narrow,
      top + (bottom - top) * t,
      (gaussian() * depth * 1.8 + 1.5) * narrow,
    )
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
  gather = false,
}: Trail) {
  const points = useRef<Points>(null)
  const geometry = useMemo(
    () => createTrail({ top, bottom, fromX, toX, width, depth, count, gather }),
    [top, bottom, fromX, toX, width, depth, count, gather],
  )
  const uniforms = useMemo(() => createMotesUniforms(colors, undefined, true), [colors])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ size, viewport, clock }) => {
    const p = points.current
    if (!p) return
    const value = amount()
    p.visible = value > 0.01
    if (!p.visible) return
    syncGrainTier(p.material as ShaderMaterial)
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
        vertexShader={grainMotes.vertexShader}
        fragmentShader={grainMotes.fragmentShader}
        defines={grainMotes.defines}
        uniforms={uniforms}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </points>
  )
}
