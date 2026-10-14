import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  type Points,
  type ShaderMaterial,
} from 'three'
import { revealed, useLoading } from '@/stores/loading'
import { sceneColors } from '@/styles/scene'
import fragmentShader from '../shaders/introBurst.frag'
import vertexShader from '../shaders/introBurst.vert'

const COUNT = 2200
/** The Core's outline on screen at the hero (world units), and its centre. */
const OUTLINE = { side: 1.5, radius: 0.42, y: 0.15 }
/** Seconds the condensing takes. */
export const BURST = 1.3

/** A point on a rounded square's outline, `u` 0..1 round it. */
function outline(u: number): [number, number] {
  const half = OUTLINE.side / 2
  const straight = OUTLINE.side - OUTLINE.radius * 2
  const arc = (Math.PI / 2) * OUTLINE.radius
  const perimeter = 4 * (straight + arc)
  let d = u * perimeter
  for (let side = 0; side < 4; side++) {
    const angle = (side * Math.PI) / 2
    const rotate = ([x, y]: [number, number]): [number, number] => [
      x * Math.cos(angle) - y * Math.sin(angle),
      x * Math.sin(angle) + y * Math.cos(angle),
    ]
    if (d < straight) return rotate([half, -straight / 2 + d])
    d -= straight
    if (d < arc) {
      const a = d / OUTLINE.radius
      return rotate([
        half - OUTLINE.radius + Math.cos(a) * OUTLINE.radius,
        straight / 2 + Math.sin(a) * OUTLINE.radius,
      ])
    }
    d -= arc
  }
  return [half, 0]
}

function createBurst() {
  const start = new Float32Array(COUNT * 3)
  const target = new Float32Array(COUNT * 3)
  const seeds = new Float32Array(COUNT * 4)
  for (let i = 0; i < COUNT; i++) {
    // From anywhere in the dark round it…
    const r = 2 + Math.random() * 6
    const a = Math.random() * Math.PI * 2
    const b = Math.acos(Math.random() * 2 - 1)
    start.set(
      [
        Math.sin(b) * Math.cos(a) * r,
        Math.cos(b) * r * 0.6 + OUTLINE.y,
        Math.sin(b) * Math.sin(a) * r,
      ],
      i * 3,
    )
    // …onto the outline, a little spread round it (inner ring for a quarter of them).
    const inner = Math.random() < 0.25
    const [x, y] = outline(Math.random())
    const k = inner ? 0.42 : 1
    const jitter = () => (Math.random() - 0.5) * 0.06
    target.set([x * k + jitter(), y * k + OUTLINE.y + jitter(), jitter() * 2], i * 3)
    seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(start, 3))
  geometry.setAttribute('target', new Float32BufferAttribute(target, 3))
  geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 4))
  return geometry
}

/** The preloader's payoff: sparse dust condenses into The Core, which resolves in its place. */
export function IntroBurst({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<Points>(null)
  const geometry = useMemo(() => createBurst(), [])
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uSize: { value: 0.035 },
      uViewportHeight: { value: 900 },
      uColors: { value: [sceneColors.glow, sceneColors.teal, sceneColors.violet] },
    }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    const p = points.current
    if (!p) return
    const skipped = useLoading.getState().revealAt === -Infinity
    const progress = reducedMotion || skipped ? 1 : revealed(BURST)
    // Linear progress for the shader (it eases per mote); `revealed` eases, so undo roughly.
    p.visible =
      !skipped && !reducedMotion && useLoading.getState().revealAt !== null && progress < 1
    if (!p.visible) return
    const u = (p.material as ShaderMaterial).uniforms
    const at = useLoading.getState().revealAt ?? 0
    u.uProgress!.value = Math.min(1, (performance.now() / 1000 - at) / BURST)
    u.uViewportHeight!.value = size.height * dpr
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} visible={false}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </points>
  )
}
