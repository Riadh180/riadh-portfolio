'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import { MOTION, Spring } from '@/components/canvas/motion/motion'

/**
 * Pulls its child towards the cursor while the cursor is near (a soft magnet), and
 * springs back when it leaves (the shared UI spring). Off for touch and reduced motion.
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
    let last = 0
    const target = { x: 0, y: 0 }
    const x = new Spring(0, MOTION.ui)
    const y = new Spring(0, MOTION.ui)
    const tick = (now: number) => {
      const delta = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60
      last = now
      x.step(target.x, delta)
      y.step(target.y, delta)
      element.style.transform = `translate3d(${x.value}px, ${y.value}px, 0)`
      const moving = Math.abs(x.velocity) + Math.abs(y.velocity) > 0.05
      if (moving || Math.abs(target.x - x.value) + Math.abs(target.y - y.value) > 0.1) {
        frame = requestAnimationFrame(tick)
      } else last = 0
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
