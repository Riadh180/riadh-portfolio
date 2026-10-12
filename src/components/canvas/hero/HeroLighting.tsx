import { Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Mesh, MeshBasicMaterial } from 'three'
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
 * A dark studio with one dominant key: a large, soft panel above the object puts a single
 * strong hot spot on the top of the frame. Broad, dim panels at the sides and two large
 * rings (behind the camera and behind the object) give every tube a soft rim and enough
 * light through its body to read as grey-silver glass.
 */
const panels: Panel[] = [
  { form: 'rect', intensity: 80, scale: [5, 1.5, 1], position: [0, 6, 3] },
  { form: 'rect', intensity: 3, scale: [5, 12, 1], position: [-7, 0, 1] },
  { form: 'rect', intensity: 2.2, scale: [5, 12, 1], position: [7, -1, 1] },
  { form: 'rect', intensity: 5, scale: [14, 9, 1], position: [0, 0, 9] },
  { form: 'ring', intensity: 2, scale: [10, 10, 1], position: [0, 1, -9] },
]

/**
 * The light drifts to one warm moment per cycle. The cube map only re-renders while that
 * moment is live (~1.5s of every ~9s); switching back to a single frame bakes the cool
 * light once more, so the rest of the cycle costs nothing.
 */
export function HeroLighting({ clock }: { clock: SceneClock }) {
  const meshes = useRef<(Mesh | null)[]>([])
  const [live, setLive] = useState(false)
  const liveRef = useRef(false)

  useFrame(() => {
    const { warmPeriod, warmth } = sceneConfig.light
    const warm = warmPulse(clock.time, warmPeriod) * warmth
    const active = warm > 0.002
    if (active !== liveRef.current) {
      liveRef.current = active
      setLive(active)
    }
    panels.forEach((panel, i) => {
      const material = meshes.current[i]?.material as MeshBasicMaterial | undefined
      material?.color
        .copy(sceneColors.glass)
        .lerp(sceneColors.warm, warm)
        .multiplyScalar(panel.intensity)
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
    </Environment>
  )
}
