import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { JourneyState } from './journey/path'
import { FIELD } from './particles/simulation'
import type { Pointer } from './usePointer'

type Props = { pointer: Pointer; journey: JourneyState; enabled: boolean }

/**
 * The camera rides the scroll path down through the world, orbiting the path's axis at the
 * Work place; a slow, heavy parallax toward the pointer rides on top (disabled for reduced
 * motion). The dust field's centre follows, so the dust wraps round the camera instead of
 * running out.
 */
export function CameraRig({ pointer, journey, enabled }: Props) {
  const parallax = useRef({ x: 0, y: 0 })

  useFrame(({ camera }, delta) => {
    const ease = 1 - Math.exp(-Math.min(delta, 1 / 30) * 1.4)
    const p = parallax.current
    p.x += ((enabled ? (pointer.uv.x - 0.5) * 0.9 : 0) - p.x) * ease
    p.y += ((enabled ? (pointer.uv.y - 0.5) * 0.5 : 0) - p.y) * ease
    const { angle, distance, y } = journey
    camera.position.set(
      Math.sin(angle) * distance + p.x * Math.cos(angle),
      y + p.y,
      Math.cos(angle) * distance - p.x * Math.sin(angle),
    )
    camera.lookAt(0, y, 0)
    FIELD.center.y = y
  }, -3)

  return null
}
