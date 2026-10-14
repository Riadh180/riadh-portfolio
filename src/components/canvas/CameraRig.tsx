import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { PerspectiveCamera } from 'three'
import type { JourneyState } from './journey/path'
import { drift, MOTION, Spring } from './motion/motion'
import { FIELD } from './particles/simulation'
import type { Pointer } from './usePointer'

type Props = { pointer: Pointer; journey: JourneyState; enabled: boolean }

/** A jump this large (world units) is a teleport (the loop back to the top), not a flight. */
const TELEPORT = 20

/**
 * The camera rides the scroll path through the shared motion system: its height, distance,
 * orbit and gaze follow the path through springs, so it arrives with a slight overshoot and
 * settles, and a slow idle drift keeps it from ever standing still. A heavy pointer
 * parallax rides on top. It publishes its speed (`journey.velocity`) so places can trail
 * it. Reduced motion: no springs, drift or parallax. The dust field follows the camera.
 */
export function CameraRig({ pointer, journey, enabled }: Props) {
  const springs = useRef({
    y: new Spring(journey.y, MOTION.camera),
    distance: new Spring(journey.distance, MOTION.camera),
    angle: new Spring(journey.angle, MOTION.camera),
    lookUp: new Spring(journey.lookUp, MOTION.camera),
    px: new Spring(0, MOTION.pointer),
    py: new Spring(0, MOTION.pointer),
  })

  useFrame(({ camera, size, clock }, delta) => {
    const s = springs.current
    const dt = Math.min(delta, 1 / 30)
    if (!enabled || Math.abs(journey.y - s.y.value) > TELEPORT) {
      s.y.set(journey.y)
      s.distance.set(journey.distance)
      s.angle.set(journey.angle)
      s.lookUp.set(journey.lookUp)
    } else {
      s.y.step(journey.y, dt)
      s.distance.step(journey.distance, dt)
      s.angle.step(journey.angle, dt)
      s.lookUp.step(journey.lookUp, dt)
    }
    journey.setVelocity(enabled ? s.y.velocity : 0)

    s.px.step(enabled ? (pointer.uv.x - 0.5) * 0.9 : 0, dt)
    s.py.step(enabled ? (pointer.uv.y - 0.5) * 0.5 : 0, dt)
    const t = clock.elapsedTime
    const idle = enabled ? MOTION.idle.position : 0
    const px = s.px.value + drift(t, 1) * idle
    const py = s.py.value + drift(t, 2) * idle * 0.7

    const angle = s.angle.value
    const distance = s.distance.value
    const y = s.y.value
    camera.position.set(
      Math.sin(angle) * distance + px * Math.cos(angle),
      y + py,
      Math.cos(angle) * distance - px * Math.sin(angle),
    )
    camera.lookAt(0, y + s.lookUp.value, 0)
    // A whisper of roll, so the frame never feels locked off.
    camera.rotation.z += enabled ? drift(t, 3) * MOTION.idle.rotation * 0.3 : 0

    // Phones: shift the picture up so the subject clears the text at the bottom.
    const perspective = camera as PerspectiveCamera
    const shift = Math.round(journey.screenShift * size.height)
    if (shift > 0) {
      if (perspective.view?.offsetY !== shift || perspective.view.fullHeight !== size.height) {
        perspective.setViewOffset(size.width, size.height, 0, shift, size.width, size.height)
      }
    } else if (perspective.view?.enabled) {
      perspective.clearViewOffset()
    }
    FIELD.center.y = y
    // Development only: the camera's height, for motion traces.
    if (process.env.NODE_ENV === 'development') {
      ;(window as unknown as { __cameraY?: number }).__cameraY = camera.position.y
    }
  }, -3)

  return null
}
