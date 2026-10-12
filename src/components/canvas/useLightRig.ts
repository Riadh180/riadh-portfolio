import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { type Camera, type Color, Vector2, Vector3 } from 'three'
import { sceneColors } from '@/styles/scene'

const projected = new Vector3()

/** Three slow colored lights orbiting near the frame edges: blue, teal, emerald. */
export class LightRig {
  /** Scene time in seconds, already scaled for reduced motion. */
  time = 0
  readonly positions = [new Vector3(), new Vector3(), new Vector3()]
  readonly colors: Color[] = [sceneColors.blue, sceneColors.teal, sceneColors.emerald]
  /** Light positions projected to screen uv, for the backdrop pools. */
  readonly screen = [new Vector2(), new Vector2(), new Vector2()]

  update(camera: Camera, delta: number) {
    this.time += delta
    const t = this.time

    this.positions.forEach((light, i) => {
      const phase = i * 2.1
      light.set(
        Math.cos(t * 0.05 + phase) * 7.5,
        Math.sin(t * 0.037 + phase * 1.3) * 4.2,
        -3 + Math.sin(t * 0.05 + phase) * 2,
      )
      projected.copy(light).project(camera)
      this.screen[i]?.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5)
    })
  }
}

export function useLightRig(timeScale: number) {
  const [rig] = useState(() => new LightRig())

  useFrame(({ camera }, delta) => rig.update(camera, Math.min(delta, 1 / 30) * timeScale), -2)

  return rig
}
