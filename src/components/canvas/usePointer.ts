import { useEffect, useMemo } from 'react'
import { Vector2 } from 'three'

export type Pointer = {
  /** Pointer position in screen uv (0..1, origin bottom-left). */
  uv: Vector2
  active: boolean
  /**
   * The last quick tap of a finger (down and up again within 250 ms, moved under 10 px):
   * where (NDC) and when (performance.now(); 0 = none yet).
   */
  tap: { ndc: Vector2; at: number }
  /** When a finger last came down (performance.now()): the pointer jumped there, it didn't move. */
  down: number
}

/** A tap, not a drag: a short touch that barely moves. */
const TAP = { time: 250, move: 10 }

/**
 * Tracks the pointer on window: the canvas sits behind the page and receives no events. A
 * finger counts too, all the way through a drag: once the browser takes a touch over for
 * scrolling it stops sending pointer moves (pointercancel), but touch moves keep coming.
 */
export function usePointer(): Pointer {
  const pointer = useMemo<Pointer>(
    () => ({
      uv: new Vector2(0.5, 0.5),
      active: false,
      tap: { ndc: new Vector2(), at: 0 },
      down: 0,
    }),
    [],
  )

  useEffect(() => {
    const at = (x: number, y: number) => {
      pointer.uv.set(x / window.innerWidth, 1 - y / window.innerHeight)
      pointer.active = true
    }
    let down = { x: 0, y: 0, time: -Infinity }
    const onMove = (event: PointerEvent) => at(event.clientX, event.clientY)
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (touch) at(touch.clientX, touch.clientY)
    }
    const onTouchStart = (event: TouchEvent) => {
      onTouch(event)
      const touch = event.touches[0]
      if (!touch) return
      down = { x: touch.clientX, y: touch.clientY, time: performance.now() }
      pointer.down = down.time
    }
    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      const now = performance.now()
      if (!touch || now - down.time > TAP.time) return
      if (Math.hypot(touch.clientX - down.x, touch.clientY - down.y) > TAP.move) return
      pointer.tap.ndc.set(
        (touch.clientX / window.innerWidth) * 2 - 1,
        1 - (touch.clientY / window.innerHeight) * 2,
      )
      pointer.tap.at = now
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [pointer])

  return pointer
}
