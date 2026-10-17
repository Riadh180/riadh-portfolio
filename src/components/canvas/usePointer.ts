import { useEffect, useMemo } from 'react'
import { Vector2 } from 'three'

export type Pointer = {
  /** Pointer position in screen uv (0..1, origin bottom-left). */
  uv: Vector2
  active: boolean
}

/**
 * Tracks the pointer on window: the canvas sits behind the page and receives no events. A
 * finger counts too, all the way through a drag: once the browser takes a touch over for
 * scrolling it stops sending pointer moves (pointercancel), but touch moves keep coming.
 */
export function usePointer(): Pointer {
  const pointer = useMemo<Pointer>(() => ({ uv: new Vector2(0.5, 0.5), active: false }), [])

  useEffect(() => {
    const at = (x: number, y: number) => {
      pointer.uv.set(x / window.innerWidth, 1 - y / window.innerHeight)
      pointer.active = true
    }
    const onMove = (event: PointerEvent) => at(event.clientX, event.clientY)
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (touch) at(touch.clientX, touch.clientY)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('touchmove', onTouch)
    }
  }, [pointer])

  return pointer
}
