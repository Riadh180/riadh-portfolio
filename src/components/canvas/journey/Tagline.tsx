import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Mesh,
  type ShaderMaterial,
  type Texture,
} from 'three'
import { statementLines } from '@/content/site'
import { useJourney } from '@/stores/journey'
import dustFragment from '../shaders/taglineDust.frag'
import dustVertex from '../shaders/taglineDust.vert'
import fragmentShader from '../shaders/tagline.frag'
import vertexShader from '../shaders/tagline.vert'
import type { SceneClock } from '../useSceneClock'
import { type JourneyState, PLACES, statementLift } from './path'
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

type Props = { clock: SceneClock; reducedMotion: boolean; journey: JourneyState }

/** Dust motes sampled on the letters (from the tagline texture's own pixels). */
function createDust({ texture, aspect }: { texture: Texture; aspect: number }) {
  const canvas = texture.image as HTMLCanvasElement
  const context = canvas.getContext('2d')
  const positions: number[] = []
  const rows: number[] = []
  const seeds: number[] = []
  if (context) {
    const { width, height } = canvas
    const data = context.getImageData(0, 0, width, height).data
    const width3d = HEIGHT * aspect
    for (let tries = 0; tries < 60000 && rows.length < 5000; tries++) {
      const x = Math.floor(Math.random() * width)
      const y = Math.floor(Math.random() * height)
      if ((data[(y * width + x) * 4] ?? 0) < 128) continue
      positions.push((x / width - 0.5) * width3d, (0.5 - y / height) * HEIGHT, 0)
      rows.push(Math.min(2, Math.floor((y / height) * 3)))
      seeds.push(Math.random(), Math.random(), Math.random())
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('row', new Float32BufferAttribute(rows, 1))
  geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 3))
  return geometry
}

/**
 * The statement tagline as large type in the world. It is drawn additively in the opaque
 * pass, so The Core's transmission sees it and bends it as the glass passes in front.
 * The lines rise in on arrival, and now and then one line glitches ("error → recovery").
 */
export function Tagline({ clock, reducedMotion, journey }: Props) {
  const material = useRef<ShaderMaterial>(null)
  const mesh = useRef<Mesh>(null)
  const [text, setText] = useState<{ texture: Texture; aspect: number } | null>(null)
  const dustMaterial = useRef<ShaderMaterial>(null)
  const dust = useMemo(() => (text ? createDust(text) : null), [text])
  useEffect(() => () => dust?.dispose(), [dust])
  const dustUniforms = useMemo(
    () => ({
      uExit: { value: 0 },
      uFall: { value: 0 },
      uSize: { value: 1 },
      uColor: { value: INK },
    }),
    [],
  )
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
      uExit: { value: 0 },
      uColor: { value: INK },
    }),
    [],
  )

  useFrame(({ camera, viewport, size }, rawDelta) => {
    if (!material.current || !mesh.current || !text) return
    // Out of sight down at Work.
    mesh.current.visible = journey.toWork < 0.85
    if (!mesh.current.visible) return

    // Fit: never wider than the visible width, left edge inside the frame.
    const halfWidth = viewport.getCurrentViewport(camera, [0, camera.position.y, 0]).width / 2
    const width = HEIGHT * text.aspect
    const scale = Math.min(1, (halfWidth * 2 * FIT) / width)
    const left = Math.max(LEFT, -halfWidth * FIT)
    const textLeft = (TAGLINE_PAD / (1 + 2 * TAGLINE_PAD)) * width * scale
    mesh.current.scale.setScalar(scale)
    mesh.current.position.set(
      left - textLeft + (width * scale) / 2,
      CENTER_Y + statementLift(size.width, size.height),
      0,
    )

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
    // Leaving the statement: the lines dissolve and fall as dust with the camera.
    const exit = Math.min(1, Math.max(0, journey.toWork / 0.3))
    u.uExit!.value = exit
    const dust = dustMaterial.current
    if (dust) {
      dust.uniforms.uExit!.value = exit
      dust.uniforms.uFall!.value = (CENTER_Y - journey.y) / mesh.current.scale.y
      dust.uniforms.uSize!.value = 0.03 * size.height * viewport.dpr
    }
  })

  if (!text) return null

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[HEIGHT * text.aspect, HEIGHT]} />
      {dust && (
        <points geometry={dust} frustumCulled={false}>
          <shaderMaterial
            ref={dustMaterial}
            vertexShader={dustVertex}
            fragmentShader={dustFragment}
            uniforms={dustUniforms}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
          />
        </points>
      )}
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
