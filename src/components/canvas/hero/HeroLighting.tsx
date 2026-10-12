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
import { warmPulse } from './motion'

type Panel = {
  form: 'rect' | 'ring'
  intensity: number
  scale: [number, number, number]
  position: [number, number, number]
}

/**
 * A dark studio with one dominant key: a soft panel above the object puts a single strong
 * hot spot on the top of the frame. A dim fill behind the camera keeps the flat faces dark
 * and see-through, just enough for smudges to catch it.
 */
const panels: Panel[] = [
  { form: 'rect', intensity: 80, scale: [5, 1.5, 1], position: [0, 6, 3] },
  { form: 'rect', intensity: 0.3, scale: [14, 9, 1], position: [0, 0, 9] },
  { form: 'ring', intensity: 1.5, scale: [10, 10, 1], position: [0, 1, -9] },
]

/**
 * A band of light circling the object on its own plane. A 45° bevel facing the camera
 * mirrors exactly that horizon, so every bevel, inner and outer, draws a continuous crisp
 * line, as on cut glass. Its brightness swells and fades round the circle (brighter
 * towards the top) and softens towards its edges, so the lines catch light unevenly.
 */
const HORIZON = { intensity: 6, radius: 8, height: 10 }

function createHorizon() {
  const { radius, height } = HORIZON
  const geometry = new CylinderGeometry(radius, radius, height, 96, 8, true)
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    // Rotated to lie round the Z axis: geometry -z becomes world up.
    const angle = Math.atan2(-position.getZ(i), position.getX(i))
    const swell = (0.5 + 0.5 * Math.sin(angle * 3 + 1)) ** 2
    const top = 0.5 + 0.5 * Math.sin(angle)
    const edge = 1 - (Math.abs(position.getY(i)) / (height / 2)) ** 2
    colors.fill(edge * (0.25 + 0.75 * swell) * (0.6 + 0.8 * top), i * 3, i * 3 + 3)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return geometry
}

/**
 * The light drifts to one warm moment per cycle. The cube map only re-renders while that
 * moment is live (~1.5s of every ~9s); switching back to a single frame bakes the cool
 * light once more, so the rest of the cycle costs nothing.
 */
export function HeroLighting({ clock }: { clock: SceneClock }) {
  const meshes = useRef<(Mesh | null)[]>([])
  const [live, setLive] = useState(false)
  const liveRef = useRef(false)
  const horizon = useMemo(() => createHorizon(), [])
  useEffect(() => () => horizon.dispose(), [horizon])

  useFrame(() => {
    const { warmPeriod, warmth } = sceneConfig.light
    const warm = warmPulse(clock.time, warmPeriod) * warmth
    const active = warm > 0.002
    if (active !== liveRef.current) {
      liveRef.current = active
      setLive(active)
    }
    const intensities = [...panels.map((panel) => panel.intensity), HORIZON.intensity]
    intensities.forEach((intensity, i) => {
      const material = meshes.current[i]?.material as MeshBasicMaterial | undefined
      material?.color.copy(sceneColors.glass).lerp(sceneColors.warm, warm).multiplyScalar(intensity)
    })
  })

  return (
    <Environment resolution={256} frames={live ? Infinity : 1}>
      {panels.map((panel, i) => (
        <Lightformer
          key={i}
          ref={(mesh) => {
            meshes.current[i] = mesh
          }}
          form={panel.form}
          intensity={panel.intensity}
          color={sceneColors.glass}
          scale={panel.scale}
          position={panel.position}
        />
      ))}
      <mesh
        ref={(mesh) => {
          meshes.current[panels.length] = mesh
        }}
        geometry={horizon}
        rotation-x={Math.PI / 2}
      >
        <meshBasicMaterial side={DoubleSide} toneMapped={false} vertexColors />
      </mesh>
    </Environment>
  )
}
