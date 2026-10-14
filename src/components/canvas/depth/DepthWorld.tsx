import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  type Group,
  type ShaderMaterial,
  Vector3,
} from 'three'
import { sceneColors } from '@/styles/scene'
import { createMotesGeometry, createMotesUniforms, gaussian } from '../journey/motes'
import particlesFragment from '../shaders/particles.frag'
import motesVertex from '../shaders/motes.vert'
import noise from '../shaders/noise.glsl'
import shaftFragment from '../shaders/shaft.frag'
import shaftVertex from '../shaders/shaft.vert'
import edgeFragment from '../shaders/skillEdge.frag'
import edgeVertex from '../shaders/skillEdge.vert'
import waterFragment from '../shaders/water.frag'
import waterVertex from '../shaders/water.vert'
import type { SceneClock } from '../useSceneClock'
import { CapstonePanel, PANEL } from './CapstonePanel'

/** The surface's height above the place's origin. */
export const SURFACE = 4

/** Shafts of light: [x, z, width, height, lean, seed]. */
const SHAFTS: [number, number, number, number, number, number][] = [
  [-3.5, -3, 1.6, 9, 0.12, 0.2],
  [1.2, -5, 2.4, 11, -0.08, 0.7],
  [4.2, -2, 1.2, 8, 0.15, 1.3],
  [-0.8, -8, 3, 12, 0.05, 2.1],
  [6.5, -7, 2, 10, -0.1, 2.9],
]

/** Glowing data roots hanging from the surface into the deep: wandering curves. */
function createRoots(count: number) {
  const positions: number[] = []
  const along: number[] = []
  const colors: number[] = []
  const phases: number[] = []
  const lit: number[] = []
  const color = new Color().copy(sceneColors.emerald)
  for (let r = 0; r < count; r++) {
    // Right of the text column.
    const x0 = (r / (count - 1)) * 9 - 1.5 + gaussian() * 0.4
    const z0 = -2 - Math.random() * 6
    // From the surface down, wandering, converging on the capstone panel's edges.
    const end = PANEL.clone().add(
      new Vector3((r / (count - 1) - 0.5) * 2.2, 0.75, (Math.random() - 0.5) * 0.3),
    )
    const start = new Vector3(x0, SURFACE, z0)
    const points = Array.from({ length: 6 }, (_, k) => {
      const t = k / 5
      return start
        .clone()
        .lerp(end, t * t * (3 - 2 * t))
        .add(
          new Vector3(Math.sin(k * 1.3 + r) * 0.7, 0, Math.cos(k + r) * 0.5).multiplyScalar(
            Math.sin(Math.PI * t),
          ),
        )
    })
    const curve = new CatmullRomCurve3(points)
    const steps = 60
    for (let k = 0; k < steps; k++) {
      for (const t of [k / steps, (k + 1) / steps]) {
        positions.push(...curve.getPoint(t).toArray())
        along.push(t)
        colors.push(...color.toArray())
        phases.push((r * 0.29) % 1)
        lit.push(0.2)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('along', new Float32BufferAttribute(along, 1))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setAttribute('phase', new Float32BufferAttribute(phases, 1))
  geometry.setAttribute('lit', new Float32BufferAttribute(lit, 1))
  return geometry
}

/** Plankton: slow, sparse motes through the water. */
function createPlankton() {
  return createMotesGeometry(1400, (_, out) => {
    out.set((Math.random() - 0.5) * 22, SURFACE - Math.random() * 12, -Math.random() * 14 + 3)
  })
}

type Props = {
  clock: SceneClock
  /** The colour the far water fades into. */
  fog: Color
}

/**
 * Depth: beneath the interface. Seen from under a water surface: a bright window of light
 * overhead with a shifting web of caustics, soft shafts of light falling into the deep,
 * slow plankton, and glowing data roots running down from the surface with signal pulses,
 * converging on the focal object: the capstone project's glass panel in its data lattice.
 */
export function DepthWorld({ clock, fog }: Props) {
  const group = useRef<Group>(null)
  const water = useRef<ShaderMaterial>(null)
  const shafts = useRef<(ShaderMaterial | null)[]>([])
  const plankton = useRef<ShaderMaterial>(null)
  const rootsMaterial = useRef<ShaderMaterial>(null)
  const roots = useMemo(() => createRoots(7), [])
  const planktonGeometry = useMemo(() => createPlankton(), [])
  const uniforms = useMemo(
    () => ({
      water: {
        uTime: { value: 0 },
        uCameraPosition: { value: new Vector3() },
        uDeep: { value: new Color().copy(sceneColors.teal).multiplyScalar(0.07) },
        uShallow: {
          value: new Color()
            .copy(sceneColors.teal)
            .lerp(sceneColors.emerald, 0.4)
            .lerp(sceneColors.glass, 0.3)
            .multiplyScalar(0.24),
        },
        // Caustic light: the glow colour, softened towards white so it isn't neon.
        uGlow: {
          value: new Color()
            .copy(sceneColors.glow)
            .lerp(sceneColors.glass, 0.45)
            .multiplyScalar(0.7),
        },
        uIntensity: { value: 1 },
        uFog: { value: fog },
      },
      shafts: SHAFTS.map(([, , , , , seed]) => ({
        uTime: { value: 0 },
        uSeed: { value: seed },
        uOpacity: { value: 0.08 },
        uColor: { value: sceneColors.glow },
      })),
      plankton: createMotesUniforms([sceneColors.emerald, sceneColors.teal, sceneColors.glow]),
      roots: { uTime: { value: 0 } },
    }),
    [fog],
  )
  useEffect(
    () => () => {
      roots.dispose()
      planktonGeometry.dispose()
    },
    [roots, planktonGeometry],
  )

  useFrame(({ camera, size, viewport }) => {
    const t = clock.time
    if (water.current) {
      water.current.uniforms.uTime!.value = t
      water.current.uniforms.uCameraPosition!.value.copy(camera.position)
    }
    shafts.current.forEach((material) => {
      if (material) material.uniforms.uTime!.value = t
    })
    if (plankton.current) {
      const u = plankton.current.uniforms
      u.uTime!.value = t
      u.uOpacity!.value = 0.9
      u.uDrift!.value = 0.25
      u.uSpread!.value = 0.6
      u.uViewportHeight!.value = size.height * viewport.dpr
    }
    // Data flows down the roots: the pulse runs from the surface into the deep.
    if (rootsMaterial.current) rootsMaterial.current.uniforms.uTime!.value = t
  })

  return (
    <group ref={group}>
      {/* The surface, seen from below. */}
      <mesh position-y={SURFACE} rotation-x={Math.PI / 2}>
        <planeGeometry args={[80, 80]} />
        <shaderMaterial
          ref={water}
          vertexShader={waterVertex}
          fragmentShader={`${noise}\n${waterFragment}`}
          uniforms={uniforms.water}
          side={2}
          transparent
          depthWrite={false}
        />
      </mesh>
      {SHAFTS.map(([x, z, width, height, lean], i) => (
        <mesh key={i} position={[x, SURFACE - height / 2, z]} rotation-z={lean}>
          <planeGeometry args={[width, height]} />
          <shaderMaterial
            ref={(material) => {
              shafts.current[i] = material
            }}
            vertexShader={shaftVertex}
            fragmentShader={`${noise}\n${shaftFragment}`}
            uniforms={uniforms.shafts[i]}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
      <lineSegments geometry={roots} frustumCulled={false}>
        <shaderMaterial
          ref={rootsMaterial}
          vertexShader={edgeVertex}
          fragmentShader={edgeFragment}
          uniforms={uniforms.roots}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </lineSegments>
      <CapstonePanel clock={clock} />
      <points geometry={planktonGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={plankton}
          vertexShader={motesVertex}
          fragmentShader={particlesFragment}
          uniforms={uniforms.plankton}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  )
}
