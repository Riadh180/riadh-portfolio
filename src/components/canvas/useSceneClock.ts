import { useFrame } from '@react-three/fiber'
import { useState } from 'react'

/** Scene time in seconds, clamped per frame and scaled (slower for reduced motion). */
export class SceneClock {
  time = 0

  tick(delta: number) {
    this.time += delta
  }
}

export function useSceneClock(timeScale: number) {
  const [clock] = useState(() => new SceneClock())

  useFrame((_, delta) => clock.tick(Math.min(delta, 1 / 30) * timeScale), -2)

  return clock
}
