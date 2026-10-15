import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type Group, type Mesh, type ShaderMaterial } from 'three'
import { sceneColors } from '@/styles/scene'
import { revealed } from '@/stores/loading'
import { ChipCluster } from '../work/Pebbles'
import type { JourneyState } from '../journey/path'
import fragmentShader from '../shaders/glow.frag'
import vertexShader from '../shaders/glow.vert'
import type { SceneClock } from '../useSceneClock'

/** Where The Core floats at the hero (matches Emblem's hero pose). */
const CENTRE: [number, number, number] = [0, 0.45, 0]
/** A sparse ring of chips round it: [x, y, z, spread]. */
const ORBIT: [number, number, number, number][] = [[0, 0.45, 0, 1.9]]

/**
 * The hero's mystery: a soft halo of light behind The Core that breathes (one slow pulse
 * every ~6s), and a sparse drift of tiny glass chips circling it at different depths,
 * catching the light as they turn. Only at the hero (and as the loop returns to it).
 */
export function HeroAura({ journey, clock }: { journey: JourneyState; clock: SceneClock }) {
  const group = useRef<Group>(null)
  const halo = useRef<Mesh>(null)
  const color = useMemo(() => new Color().copy(sceneColors.teal).lerp(sceneColors.glow, 0.4), [])
  const uniforms = useMemo(() => ({ uColor: { value: color }, uOpacity: { value: 0 } }), [color])

  useFrame(() => {
    const g = group.current
    const m = halo.current
    if (!g || !m) return
    const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2
    // Present at the hero, gone a third of the way to the statement; back with the loop.
    const here = Math.max(1 - ease(journey.camera * 2.5), ease((journey.loop - 0.5) * 2))
    const amount = here * revealed(1.6, 0.6)
    g.visible = amount > 0.01
    if (!g.visible) return
    const breath = 0.5 + 0.5 * Math.sin((clock.time / 6) * Math.PI * 2)
    ;(m.material as ShaderMaterial).uniforms.uOpacity!.value = amount * (0.1 + 0.07 * breath)
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={halo} position={[CENTRE[0], CENTRE[1], -1.8]}>
        <planeGeometry args={[8, 8]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
      <ChipCluster clusters={ORBIT} count={90} size={2.4} clock={clock} focusDistance={10} />
    </group>
  )
}
