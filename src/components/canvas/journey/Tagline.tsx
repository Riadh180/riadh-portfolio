import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AdditiveBlending, Color, type Mesh, type ShaderMaterial, type Texture } from 'three'
import { statementLines } from '@/content/site'
import { useJourney } from '@/stores/journey'
import fragmentShader from '../shaders/tagline.frag'
import vertexShader from '../shaders/tagline.vert'
import type { SceneClock } from '../useSceneClock'
import { PLACES } from './path'
import { createTaglineTexture, TAGLINE_PAD } from './taglineTexture'

/**
 * World height of the three lines, and where the text's left edge and centre sit. On narrow
 * screens it shrinks to fit the visible width.
 */
const HEIGHT = 2.35
const LEFT = -5
const CENTER_Y = PLACES.statement - 0.9
/** Share of the visible width the text may take at most. */
const FIT = 0.86

/** Off-white, kept just under the bloom threshold so the type stays crisp. */
const INK = new Color(0.58, 0.6, 0.6)

/** Line reveal: each line rises over 0.9s, 0.12s after the one above; hides in 0.4s. */
const RISE = 0.9
const STAGGER = 0.12
const HIDE = 0.4

/** Glitch: one line at a time, ~0.3s, every 1.5–2s. */
const GLITCH = 0.3

const expoOut = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x))

type Props = { clock: SceneClock; reducedMotion: boolean }

/**
 * The statement tagline as large type in the world. It is drawn additively in the opaque
 * pass, so The Core's transmission sees it and bends it as the glass passes in front.
 * The lines rise in on arrival, and now and then one line glitches ("error → recovery").
 */
export function Tagline({ clock, reducedMotion }: Props) {
  const material = useRef<ShaderMaterial>(null)
  const mesh = useRef<Mesh>(null)
  const [text, setText] = useState<{ texture: Texture; aspect: number } | null>(null)
  const state = useRef({
    shownAt: -1,
    reveal: [0, 0, 0],
    nextGlitch: 0,
    glitchStart: -1,
    glitchLine: -1,
  })

  useEffect(() => {
    let disposed = false
    let created: Texture | undefined
    void createTaglineTexture(statementLines).then((result) => {
      created = result.texture
      if (disposed) result.texture.dispose()
      else setText(result)
    })
    return () => {
      disposed = true
      created?.dispose()
    }
  }, [])

  const uniforms = useMemo(
    () => ({
      uMap: { value: null as Texture | null },
      uReveal: { value: [0, 0, 0] },
      uGlitchLine: { value: -1 },
      uGlitch: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: INK },
    }),
    [],
  )

  useFrame(({ camera, viewport }, rawDelta) => {
    if (!material.current || !mesh.current || !text) return

    // Fit: never wider than the visible width, left edge inside the frame.
    const halfWidth = viewport.getCurrentViewport(camera, [0, camera.position.y, 0]).width / 2
    const width = HEIGHT * text.aspect
    const scale = Math.min(1, (halfWidth * 2 * FIT) / width)
    const left = Math.max(LEFT, -halfWidth * FIT)
    const textLeft = (TAGLINE_PAD / (1 + 2 * TAGLINE_PAD)) * width * scale
    mesh.current.scale.setScalar(scale)
    mesh.current.position.set(left - textLeft + (width * scale) / 2, CENTER_Y, 0)

    const now = clock.time
    const delta = Math.min(rawDelta, 1 / 30)
    const s = state.current
    const shown = useJourney.getState().statement

    if (shown && s.shownAt < 0) {
      s.shownAt = now
      s.nextGlitch = now + RISE + 1.2
    }
    if (!shown) s.shownAt = -1

    s.reveal = s.reveal.map((value, i) => {
      if (reducedMotion) return shown ? 1 : 0
      if (shown) return Math.max(value, expoOut((now - s.shownAt - i * STAGGER) / RISE))
      return Math.max(0, value - delta / HIDE)
    })

    // Rare glitch on one line at a time, only once the text has settled.
    let glitch = 0
    if (!reducedMotion && shown && now >= s.nextGlitch) {
      s.glitchStart = now
      s.glitchLine = (s.glitchLine + 1 + Math.floor(Math.random() * 2)) % 3
      s.nextGlitch = now + 1.5 + Math.random() * 0.5
    }
    if (s.glitchStart >= 0 && now - s.glitchStart < GLITCH) {
      glitch = Math.sin((Math.PI * (now - s.glitchStart)) / GLITCH)
    }

    const u = material.current.uniforms
    u.uMap!.value = text.texture
    u.uReveal!.value = s.reveal
    u.uGlitchLine!.value = s.glitchLine
    u.uGlitch!.value = glitch
    u.uTime!.value = now
  })

  if (!text) return null

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[HEIGHT * text.aspect, HEIGHT]} />
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
