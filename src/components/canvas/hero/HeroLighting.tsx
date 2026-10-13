import { Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  type Mesh,
  type MeshBasicMaterial,
} from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import type { SceneClock } from '../useSceneClock'
import { type GlassLook, lightKey } from './glassLook'
import { warmPulse } from './motion'

/**
 * A band of light circling the emblem on its own plane. A 45° bevel facing the camera
 * mirrors exactly that horizon, so every bevel, inner and outer, draws a line along the
 * whole outline, as on cut glass. `edgeEven` blends from a brightness that swells and fades
 * round the circle (brighter towards the top) to an even band; it softens towards its edges.
 */
const HORIZON_RADIUS = 8

function createHorizon() {
  // Unit height: the look's spread scales it.
  const geometry = new CylinderGeometry(HORIZON_RADIUS, HORIZON_RADIUS, 1, 96, 8, true)
  const position = geometry.getAttribute('position')
  const swell = new Float32Array(position.count)
  const fade = new Float32Array(position.count)
  for (let i = 0; i < position.count; i++) {
    // Rotated to lie round the Z axis: geometry -z becomes world up.
    const angle = Math.atan2(-position.getZ(i), position.getX(i))
    const wave = (0.5 + 0.5 * Math.sin(angle * 3 + 1)) ** 2
    const top = 0.5 + 0.5 * Math.sin(angle)
    swell[i] = (0.25 + 0.75 * wave) * (0.6 + 0.8 * top)
    fade[i] = 1 - (Math.abs(position.getY(i)) * 2) ** 2
  }
  geometry.setAttribute('color', new Float32BufferAttribute(position.count * 3, 3))
  return { geometry, swell, fade }
}

function paintHorizon({ geometry, swell, fade }: ReturnType<typeof createHorizon>, even: number) {
  const color = geometry.getAttribute('color')
  for (let i = 0; i < color.count; i++) {
    const value = (fade[i] ?? 0) * ((swell[i] ?? 0) * (1 - even) + even)
    color.setXYZ(i, value, value, value)
  }
  color.needsUpdate = true
}

/**
 * The key: small and very bright, up and to the right. It sits off the vertical on
 * purpose: a straight top edge would mirror it along its whole length (a streak), but at
 * this angle only one point on the rounded corner faces it, so it reads as one sparkle.
 */
const KEY_POSITION: [number, number, number] = [3.3, 5.4, 1.4]

/** How long the environment keeps re-rendering after a light change, in seconds. */
const SETTLE = 0.3

/**
 * A dark studio, set by the look: one small key up to the right (the single sparkle), the
 * band of edge light round it, and equal soft fills in front and behind for the faces.
 * Apart from the key, the rig looks the same turned half round the vertical axis, so the
 * emblem's light can follow its turn without a jump as it passes edge-on (see Emblem); the
 * key swaps sides right at edge-on, where the reflections are dimmed and the face hidden.
 *
 * The light drifts to one warm moment per cycle. The cube map only re-renders while that
 * moment is live (~1.5s of every ~9s) or just after the look's light changes; otherwise it
 * stays baked, so the rest of the cycle costs nothing.
 */
type Props = {
  look: GlassLook
  clock: SceneClock
  /** 0..1: how far below the hero the camera is; the warm moment belongs to the hero. */
  calm?: () => number
}

export function HeroLighting({ look, clock, calm }: Props) {
  const meshes = useRef<(Mesh | null)[]>([])
  const horizonMesh = useRef<Mesh>(null)
  const [live, setLive] = useState(false)
  const liveRef = useRef(false)
  const lastKey = useRef('')
  const settleUntil = useRef(0)
  const horizon = useMemo(() => createHorizon(), [])
  useEffect(() => () => horizon.geometry.dispose(), [horizon])

  useFrame(() => {
    const { warmPeriod, warmth } = sceneConfig.light
    const warm = warmPulse(clock.time, warmPeriod) * warmth * (1 - (calm?.() ?? 0))

    const key = lightKey(look)
    if (key !== lastKey.current) {
      lastKey.current = key
      settleUntil.current = clock.time + SETTLE
      paintHorizon(horizon, look.edgeEven)
      horizonMesh.current?.scale.set(
        1,
        2 * HORIZON_RADIUS * Math.tan((look.edgeSpread * Math.PI) / 180),
        1,
      )
    }

    const active = warm > 0.002 || clock.time < settleUntil.current
    if (active !== liveRef.current) {
      liveRef.current = active
      setLive(active)
    }

    const intensities = [look.key, look.face, look.face, look.edge]
    intensities.forEach((intensity, i) => {
      const material = meshes.current[i]?.material as MeshBasicMaterial | undefined
      material?.color.copy(sceneColors.glass).lerp(sceneColors.warm, warm).multiplyScalar(intensity)
    })
  })

  return (
    <Environment resolution={256} frames={live ? Infinity : 1}>
      <Lightformer
        ref={(mesh) => {
          meshes.current[0] = mesh
        }}
        form="rect"
        scale={[0.9, 0.9, 1]}
        position={KEY_POSITION}
      />
      <Lightformer
        ref={(mesh) => {
          meshes.current[1] = mesh
        }}
        form="rect"
        scale={[14, 9, 1]}
        position={[0, 0, 9]}
      />
      <Lightformer
        ref={(mesh) => {
          meshes.current[2] = mesh
        }}
        form="rect"
        scale={[14, 9, 1]}
        position={[0, 0, -9]}
      />
      <mesh
        ref={(mesh) => {
          meshes.current[3] = mesh
          horizonMesh.current = mesh
        }}
        geometry={horizon.geometry}
        rotation-x={Math.PI / 2}
      >
        <meshBasicMaterial side={DoubleSide} toneMapped={false} vertexColors />
      </mesh>
    </Environment>
  )
}
