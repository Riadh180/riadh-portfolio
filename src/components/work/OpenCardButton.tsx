'use client'

import { type PointerEvent, useEffect, useRef } from 'react'
import { CLOSE, openView } from '@/components/canvas/work/openView'
import { useWork } from '@/stores/work'

/**
 * The opened card (or the capstone) itself, as a button: it lies over the card in 3D,
 * following it on screen, and a click or tap closes it, as "Close" does (the same close
 * transition); Enter or Space too. Not while the card is still flying in, and not at the end
 * of a drag. The cursor reads "CLOSE" over it; focused, it outlines the card.
 */
export function OpenCardButton({ label }: { label: string }) {
  const button = useRef<HTMLButtonElement>(null)
  const down = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    let frame = requestAnimationFrame(function place() {
      const element = button.current
      if (element) {
        const { amount, rect } = openView
        const shown = amount > 0.001 && rect.z > rect.x
        element.style.visibility = shown ? 'visible' : 'hidden'
        if (shown) {
          const width = window.innerWidth
          const height = window.innerHeight
          element.style.left = `${((rect.x + 1) / 2) * width}px`
          element.style.top = `${((1 - rect.w) / 2) * height}px`
          element.style.width = `${((rect.z - rect.x) / 2) * width}px`
          element.style.height = `${((rect.w - rect.y) / 2) * height}px`
        }
      }
      frame = requestAnimationFrame(place)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const press = (event: PointerEvent) => {
    down.current = { x: event.clientX, y: event.clientY }
  }

  return (
    <button
      ref={button}
      type="button"
      aria-label={label}
      data-cursor="close"
      onPointerDown={press}
      onClick={(event) => {
        const { openedAt, close } = useWork.getState()
        // Enter / Space: always.
        if (event.detail === 0) return close()
        const start = down.current
        const moved = start ? Math.hypot(event.clientX - start.x, event.clientY - start.y) : 0
        if (moved > CLOSE.drag || performance.now() - openedAt < CLOSE.settle) return
        close()
      }}
      style={{ visibility: 'hidden' }}
      className="fixed rounded-[1.6%/2.4%] outline-offset-4 focus-visible:outline-2 focus-visible:outline-violet"
    />
  )
}
