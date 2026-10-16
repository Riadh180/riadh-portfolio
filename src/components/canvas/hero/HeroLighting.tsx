import { Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  type Mesh,
  type MeshBasicMaterial,
} from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import type { SceneClock } from '../useSceneClock'
import { type GlassLook, lightKey } from './glassLook'
import { useTier } from '@/stores/tier'

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

type Former = {
  color: keyof typeof sceneConfig.formers
  position: [number, number, number]
  scale: [number, number, number]
}

/**
 * Coloured light-formers, each with its twin turned half round the vertical axis, so the
 * rig still looks the same from either face (see below): teal low on the left, violet on
 * the right, a small amber accent low on the right.
 */
const FORMERS: Former[] = (
  [
    { color: 'teal', position: [-6, -3.5, 4.5], scale: [5, 2.5, 1] },
    { color: 'violet', position: [6.5, 2, 3], scale: [2.5, 5, 1] },
    { color: 'amber', position: [3.5, -5.5, 2], scale: [1.6, 1.6, 1] },
  ] as Former[]
).flatMap((former) => [
  former,
  { ...former, position: [-former.position[0], former.position[1], -former.position[2]] },
])

const FORMER_COLORS: Record<Former['color'], Color> = {
  teal: sceneColors.teal,
  violet: sceneColors.violet,
  amber: sceneColors.warm,
}

/** How long the environment keeps re-rendering after a light change, in seconds. */
const SETTLE = 0.3

/**
 * A dark studio, set by the look: one small key up to the right (the single sparkle), the
 * band of edge light round it, equal soft fills in front and behind for the faces, and at
 * the hero a few coloured formers, so the glass carries colour. Apart from the key, the rig
 * looks the same turned half round the vertical axis, so the emblem's light can follow its
 * turn without a jump as it passes edge-on (see Emblem); the key swaps sides right at
 * edge-on, where the reflections are dimmed and the face hidden.
 *
 * The cube map is baked once and re-renders only while the light changes (the look's blend
 * along the path, the formers fading, Contact's warmth rising). The hero's slow drift to
 * warm copper is a tint in The Core's own material (see glassMaterial), so the idle hero
 * never re-renders it.
 */
type Props = {
  look: GlassLook
  clock: SceneClock
  /** 0..1: how far below the hero the camera is; the coloured formers belong to the hero. */
  calm?: () => number
  /** 0..1: a held warm light (Contact's warm accent). */
  warmHold?: () => number
}

export function HeroLighting({ look, clock, calm, warmHold }: Props) {
  const meshes = useRef<(Mesh | null)[]>([])
  const formers = useRef<(Mesh | null)[]>([])
  const horizonMesh = useRef<Mesh>(null)
  const [live, setLive] = useState(false)
  const liveRef = useRef(false)
  const lastKey = useRef('')
  const lastWarm = useRef(0)
  const settleUntil = useRef(0)
  const horizon = useMemo(() => createHorizon(), [])
  useEffect(() => () => horizon.geometry.dispose(), [horizon])

  useFrame(() => {
    const { warmth } = sceneConfig.light
    const strength = sceneConfig.formers
    const warm = (warmHold?.() ?? 0) * warmth
    // The formers fade out as the camera leaves the hero (in tenths: one re-bake per step).
    const presence = Math.round((1 - (calm?.() ?? 0)) * 10) / 10
    const lite = useTier.getState().tier === 'lite'

    const key = `${lightKey(look)}|${presence}|${lite}`
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

    // Re-render the cube map only while the warmth is changing (Contact's rise): a held
    // warmth is baked once, like the cool light.
    const changing = Math.abs(warm - lastWarm.current) > 0.0005
    lastWarm.current = warm
    if (changing) settleUntil.current = clock.time + SETTLE
    const active = changing || clock.time < settleUntil.current
    if (active !== liveRef.current) {
      liveRef.current = active
      setLive(active)
    }

    const intensities = [look.key, look.face, look.face, look.edge]
    intensities.forEach((intensity, i) => {
      const material = meshes.current[i]?.material as MeshBasicMaterial | undefined
      material?.color.copy(sceneColors.glass).lerp(sceneColors.warm, warm).multiplyScalar(intensity)
    })
    FORMERS.forEach((former, i) => {
      const mesh = formers.current[i]
      if (!mesh) return
      // Lite: a static cool environment; the amber accent is the full tier's.
      const on = presence * (lite && former.color === 'amber' ? 0 : 1)
      mesh.visible = on > 0
      ;(mesh.material as MeshBasicMaterial).color
        .copy(FORMER_COLORS[former.color])
        .multiplyScalar(strength[former.color] * on)
    })
  })

  return (
    <Environment resolution={128} frames={live ? Infinity : 1}>
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
      {FORMERS.map((former, i) => (
        <Lightformer
          key={i}
          ref={(mesh) => {
            formers.current[i] = mesh
          }}
          form="rect"
          scale={former.scale}
          position={former.position}
        />
      ))}
    </Environment>
  )
}
