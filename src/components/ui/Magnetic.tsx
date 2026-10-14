'use client'

import { type ReactNode, useEffect, useRef } from 'react'

/**
 * Pulls its child towards the cursor while the cursor is near (a soft magnet), and
 * springs back when it leaves. Off for touch and reduced motion.
 */
export function Magnetic({
  children,
  strength = 0.35,
}: {
  children: ReactNode
  strength?: number
}) {
  const wrap = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = wrap.current
    if (!element) return
    const fine = window.matchMedia('(pointer: fine)').matches
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || calm) return
    let frame = 0
    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    const tick = () => {
      current.x += (target.x - current.x) * 0.15
      current.y += (target.y - current.y) * 0.15
      element.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`
      if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.1) {
        frame = requestAnimationFrame(tick)
      }
    }
    const onMove = (event: PointerEvent) => {
      const box = element.getBoundingClientRect()
      const dx = event.clientX - (box.left + box.width / 2)
      const dy = event.clientY - (box.top + box.height / 2)
      const reach = Math.max(box.width, box.height) * 0.9
      const near = Math.hypot(dx, dy) < reach
      target.x = near ? dx * strength : 0
      target.y = near ? dy * strength : 0
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [strength])

  return (
    <span ref={wrap} className="inline-block will-change-transform">
      {children}
    </span>
  )
}
