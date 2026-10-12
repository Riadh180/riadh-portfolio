import { useFrame } from '@react-three/fiber'
import type { Pointer } from './usePointer'

/** Slow, heavy parallax toward the pointer. Disabled for reduced motion. */
export function CameraRig({ pointer, enabled }: { pointer: Pointer; enabled: boolean }) {
  useFrame(({ camera }, delta) => {
    const ease = 1 - Math.exp(-Math.min(delta, 1 / 30) * 1.4)
    const targetX = enabled ? (pointer.uv.x - 0.5) * 0.9 : 0
    const targetY = enabled ? (pointer.uv.y - 0.5) * 0.5 : 0
    camera.position.x += (targetX - camera.position.x) * ease
    camera.position.y += (targetY - camera.position.y) * ease
    camera.lookAt(0, 0, 0)
  }, -3)

  return null
}
