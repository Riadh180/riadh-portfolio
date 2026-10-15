import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  type Color,
  type Mesh,
  type ShaderMaterial,
  type Texture,
  Vector3,
} from 'three'
import { sceneColors } from '@/styles/scene'
import fragmentShader from '../shaders/sceneWord.frag'
import vertexShader from '../shaders/tagline.vert'
import type { SceneClock } from '../useSceneClock'
import { createTaglineTexture } from './taglineTexture'

/** Rise-in on arrival (s), and the glitch: one line, ~0.3s, every 1.6–2.6s. */
const RISE = 0.8
const GLITCH = 0.2

type Props = {
  lines: readonly string[]
  /** World height of the whole block, and its centre (in the parent's space). */
  height: number
  position: [number, number, number]
  /** Its ink: off-white, dimmed or tinted per place. */
  color: Color
  /** 0..1, how present the word is now (from the journey). */
  amount: () => number
  clock: SceneClock
  reducedMotion: boolean
  /** Seen through water: wavering, with a caustic shimmer. */
  ripple?: boolean
  /** Share of the visible width it may take at most (it shrinks on narrow screens). */
  fit?: number
  /** The place's accent (a soft glow round the letters). */
  accent?: Color
  /** Always turned to face the camera (for places the camera swings round). */
  billboard?: boolean
}

/**
 * One place's big typographic moment, in the world (decorative: the same words exist as
 * HTML). Additive in the opaque pass, so The Core's glass refracts it and solid forms in
 * front (the spine, chips, gems) break it. Rises in line by line on arrival, glitches
 * rarely, fades with the place.
 */
export function SceneWord({
  lines,
  height,
  position,
  color,
  amount,
  clock,
  reducedMotion,
  ripple = false,
  fit = 0.9,
  billboard = false,
  accent = sceneColors.violet,
}: Props) {
  const mesh = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const [text, setText] = useState<{ texture: Texture; aspect: number } | null>(null)
  const state = useRef({
    shownAt: -1,
    nextGlitch: 0,
    glitchStart: -1,
    glitchLine: -1,
    world: new Vector3(),
  })

  useEffect(() => {
    let disposed = false
    let created: Texture | undefined
    void createTaglineTexture(lines).then((result) => {
      created = result.texture
      if (disposed) result.texture.dispose()
      else setText(result)
    })
    return () => {
      disposed = true
      created?.dispose()
    }
  }, [lines])

  const uniforms = useMemo(
    () => ({
      uMap: { value: null as Texture | null },
      uLines: { value: lines.length },
      uReveal: { value: 0 },
      uGlitchLine: { value: -1 },
      uGlitch: { value: 0 },
      uTime: { value: 0 },
      uRipple: { value: ripple ? 1 : 0 },
      uOpacity: { value: 0 },
      uColor: { value: color },
      uAccent: { value: accent },
    }),
    [lines, ripple, color, accent],
  )

  useFrame(({ camera, viewport }) => {
    const m = mesh.current
    if (!m || !material.current || !text) return
    const value = amount()
    m.visible = value > 0.01
    const s = state.current
    const now = clock.time
    if (!m.visible) {
      s.shownAt = -1
      return
    }
    if (s.shownAt < 0) {
      s.shownAt = now
      // Fully readable for a good while after it arrives; then a rare, brief glitch.
      s.nextGlitch = now + RISE + 0.4
    }

    if (billboard) m.quaternion.copy(camera.quaternion)
    // Fit: never wider than the visible width at its depth.
    m.getWorldPosition(s.world)
    const visible = viewport.getCurrentViewport(camera, s.world).width
    m.scale.setScalar(Math.min(1, (visible * fit) / (height * text.aspect)))

    let glitch = 0
    if (!reducedMotion && now >= s.nextGlitch) {
      s.glitchStart = now
      s.glitchLine = (s.glitchLine + 1) % lines.length
      s.nextGlitch = now + 8 + Math.random() * 4
    }
    if (s.glitchStart >= 0 && now - s.glitchStart < GLITCH) {
      glitch = Math.sin((Math.PI * (now - s.glitchStart)) / GLITCH)
    }

    const u = material.current.uniforms
    u.uMap!.value = text.texture
    u.uReveal!.value = reducedMotion ? 1 : Math.min(1, (now - s.shownAt) / RISE)
    u.uGlitchLine!.value = s.glitchLine
    u.uGlitch!.value = glitch
    u.uTime!.value = now
    u.uOpacity!.value = value
  })

  if (!text) return null

  return (
    <mesh ref={mesh} position={position} visible={false}>
      <planeGeometry args={[height * text.aspect, height]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
