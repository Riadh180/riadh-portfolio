import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Points,
  type ShaderMaterial,
} from 'three'
import { sceneColors } from '@/styles/scene'
import { warmth } from '../Backdrop'
import { grainMotion, grainUniforms, syncGrainTier } from '../particles/CursorField'
import bubbleVertex from '../shaders/bubble.vert'
import glassGrain from '../shaders/glassGrain.glsl'
import risingFragment from '../shaders/risingGrain.frag'
import type { SceneClock } from '../useSceneClock'
import { contactRest, type JourneyState } from './path'

const COUNT = 110
const vertexShader = `${grainMotion}\n${bubbleVertex}`
const fragmentShader = `${glassGrain}\n${risingFragment}`
const DEFINES = { GRAIN: '' }

/**
 * Warm glass embers: most round The Core (closer in, at its sides and behind it), the rest
 * spread wide behind it and behind the headline's place (they fade over the text itself).
 */
function createEmbers() {
  const positions = new Float32Array(COUNT * 3)
  const seeds = new Float32Array(COUNT * 4)
  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2
    const close = i < COUNT * 0.6
    const r = close ? 0.6 + Math.random() * 1.8 : 1.5 + Math.random() * 3.5
    const z = close ? Math.sin(a) * r * 0.6 : -0.6 - Math.random() * 2.4
    positions.set([Math.cos(a) * r, Math.random() * 5, z], i * 3)
    seeds.set([Math.random() * 0.4, Math.random(), Math.random(), Math.random() * 0.6], i * 4)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 4))
  return geometry
}

/**
 * Warm glass embers rising round The Core at Contact (the warm moment, arriving home): the
 * world's glass grains, parting round the cursor; they fade over "LET'S TALK" and the links.
 */
export function ContactEmbers({ journey, clock }: { journey: JourneyState; clock: SceneClock }) {
  const points = useRef<Points>(null)
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const geometry = useMemo(() => createEmbers(), [])
  const uniforms = useMemo(
    () => ({
      ...grainUniforms,
      // Where the HTML text sits (clip space): below y (and, desktop, left of x).
      uTextZone: { value: [-0.3, 0.3] },
      uTime: { value: 0 },
      uHeight: { value: 5 },
      uSize: { value: 1 },
      uColor: { value: new Color().copy(sceneColors.warm).lerp(sceneColors.ember, 0.3) },
    }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    const p = points.current
    if (!p) return
    const value = warmth(journey)
    p.visible = value > 0.02
    if (!p.visible) return
    syncGrainTier(p.material as ShaderMaterial)
    // Rising round The Core's resting place, riding down with it into Contact.
    p.position.y = contactRest(journey) - 1.6
    const u = (p.material as ShaderMaterial).uniforms
    u.uTime!.value = clock.time
    u.uTextZone!.value = size.width < 700 ? [-0.05, 1.1] : [-0.3, 0.3]
    u.uSize!.value = 0.05 * size.height * dpr * value
  })

  return (
    <points
      ref={points}
      geometry={geometry}
      position={[0, 0, 0.4]}
      frustumCulled={false}
      visible={false}
    >
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        defines={DEFINES}
        uniforms={uniforms}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </points>
  )
}
