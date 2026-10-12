import { useEffect, useMemo } from 'react'
import { Vector2 } from 'three'

export type Pointer = {
  /** Pointer position in screen uv (0..1, origin bottom-left). */
  uv: Vector2
  active: boolean
}

/** Tracks the pointer on window: the canvas sits behind the page and receives no events. */
export function usePointer(): Pointer {
  const pointer = useMemo<Pointer>(() => ({ uv: new Vector2(0.5, 0.5), active: false }), [])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.uv.set(event.clientX / window.innerWidth, 1 - event.clientY / window.innerHeight)
      pointer.active = true
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [pointer])

  return pointer
}
