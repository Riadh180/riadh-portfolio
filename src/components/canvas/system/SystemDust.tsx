import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, type ShaderMaterial, Vector4 } from 'three'
import { useSystem } from '@/stores/system'
import { sceneColors } from '@/styles/scene'
import { createCluster, createGlitterUniforms, GLITTER_SHADERS, updateGlitter } from '../work/Pebbles'
import type { SceneClock } from '../useSceneClock'
import { isRelated, layoutGraph } from './graph'

/** Loose clouds through the constellation, at several depths: [x, y, z, spread] (graph space). */
const CLOUDS: [number, number, number, number][] = [
  [0, 0, -2.5, 2.4],
  [-3.2, 1.6, -1.2, 1.5],
  [3.1, 1.2, 0.8, 1.5],
  [-2.2, -1.8, 1.4, 1.3],
  [2.4, -2.2, -1.6, 1.4],
  [0.4, 3.0, -0.6, 1.6],
  [-4.2, -0.2, -3.2, 1.8],
  [4.4, -0.6, -3.4, 1.8],
  [0, -3.6, 0.4, 1.4],
]

/**
 * Phones: the graph sits in the upper part of the frame (the text comes in below), so more
 * clouds hang below it, where the phone's frame would otherwise stay dark. Listed four
 * times: each gets four clouds' share of the grains (50 a share, as the graph's own).
 */
const PHONE_CLOUDS: [number, number, number, number][] = [
  [-1.2, -6.4, 0.6, 2.2],
  [1.4, -9.2, -0.8, 2.4],
  [-0.4, -12, 0.2, 2.6],
]

/** Fine, cool glass: silver-blue, blue, a little violet and aqua. */
const PALETTE = [
  sceneColors.glass.clone().lerp(sceneColors.blue, 0.35),
  sceneColors.blue.clone().lerp(sceneColors.violet, 0.3),
  sceneColors.teal.clone().lerp(sceneColors.glow, 0.3),
  sceneColors.violet.clone(),
]

type Props = { clock: SceneClock }

/**
 * System's air: fine glass dust drifting through the constellation at several depths (the
 * world's glass grains), brighter near the filaments: a little near every thread (their
 * pulses), much more along the threads lit on hover. Lives in the graph's own space.
 */
export function SystemDust({ clock }: Props) {
  const material = useRef<ShaderMaterial>(null)
  const phone = useThree((state) => state.size.width < 700)
  const nodes = useMemo(() => layoutGraph(), [])
  const edges = useMemo(() => nodes.flatMap((node, i) => (node.parent >= 0 ? [i] : [])), [nodes])
  const geometry = useMemo(
    () =>
      phone
        ? createCluster([...CLOUDS, ...Array.from({ length: 4 }, () => PHONE_CLOUDS).flat()], 1050)
        : createCluster(CLOUDS, 1100),
    [phone],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  const uniforms = useMemo(
    () => ({
      ...createGlitterUniforms(16, PALETTE, 1, 0.7),
      uFilamentA: {
        value: edges.map((i) => new Vector4(...nodes[nodes[i]!.parent]!.position.toArray(), 0.25)),
      },
      uFilamentB: { value: edges.map((i) => new Vector4(...nodes[i]!.position.toArray(), 0)) },
    }),
    [edges, nodes],
  )
  const defines = useMemo(() => ({ FILAMENTS: String(edges.length) }), [edges])
  const activity = useRef(new Float32Array(edges.length).fill(0.25))

  useFrame(({ size, viewport }, delta) => {
    const m = material.current
    if (!m) return
    updateGlitter(m, clock, size.height * viewport.dpr, 1.4)
    // A thread is active when both its ends are lit by the focused node (hover); every
    // thread keeps a little, for its travelling pulses.
    const focused = useSystem.getState().focused
    const ease = 1 - Math.exp(-Math.min(delta, 1 / 30) * 4)
    const filaments = m.uniforms.uFilamentA!.value as Vector4[]
    edges.forEach((i, k) => {
      const lit = isRelated(nodes, i, focused) && isRelated(nodes, nodes[i]!.parent, focused)
      const now = activity.current
      now[k] = (now[k] ?? 0.25) + ((lit ? 1 : 0.25) - (now[k] ?? 0.25)) * ease
      filaments[k]!.w = now[k]!
    })
  })

  return (
    <points geometry={geometry} frustumCulled={false} raycast={() => null}>
      <shaderMaterial
        ref={material}
        vertexShader={GLITTER_SHADERS.vertexShader}
        fragmentShader={GLITTER_SHADERS.fragmentShader}
        defines={defines}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
