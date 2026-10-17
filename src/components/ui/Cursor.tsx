'use client'

import { useEffect, useRef, useState } from 'react'
import { MOTION, Spring } from '@/components/canvas/motion/motion'
import { sound } from '@/lib/sound/engine'
import { type SceneCursor, useCursor } from '@/stores/cursor'

type Mode = 'default' | 'link' | Exclude<SceneCursor, null>

/**
 * The HTML element under the pointer decides first (the nearest of a marked area and a link
 * wins: a link inside the opened card's details is a link, the card's own button is
 * "close"); then the 3D scene.
 */
function htmlMode(target: EventTarget | null): Mode | null {
  if (!(target instanceof Element)) return null
  const marked = target.closest<HTMLElement>('[data-cursor]')
  const link = target.closest('a, button, [role="button"], label, summary')
  if (marked?.dataset.cursor && (!link || link.contains(marked))) {
    return marked.dataset.cursor as Mode
  }
  return link ? 'link' : null
}

/**
 * The custom cursor: a small ring following the pointer with a soft lag, around the
 * native cursor (which stays, for accessibility). It grows and reads "OPEN" over a card and
 * "CLOSE" over an opened one or the smoke behind it (one pair), becomes a wider ring on a
 * skill node, shrinks to a dot with an arrow on links, and wobbles over The Core's glass.
 * Only for a fine pointer that can hover; no lag with reduced motion.
 */
export function Cursor() {
  const root = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [html, setHtml] = useState<Mode | null>(null)
  const scene = useCursor((state) => state.scene)

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setEnabled(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const element = root.current
    if (!enabled || !element) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // A soft lag behind the pointer: the shared UI spring.
    const x = new Spring(-100, MOTION.ui)
    const y = new Spring(-100, MOTION.ui)
    const target = { x: -100, y: -100, seen: false }
    let last = performance.now()
    let frame = requestAnimationFrame(function step(now) {
      const delta = Math.min((now - last) / 1000, 1 / 20)
      last = now
      if (calm) {
        x.set(target.x)
        y.set(target.y)
      } else {
        x.step(target.x, delta)
        y.step(target.y, delta)
      }
      element.style.transform = `translate3d(${x.value}px, ${y.value}px, 0)`
      frame = requestAnimationFrame(step)
    })
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      target.x = event.clientX
      target.y = event.clientY
      if (!target.seen) {
        target.seen = true
        x.set(target.x)
        y.set(target.y)
      }
      element.dataset.visible = 'true'
    }
    let previous: Mode | null = null
    const over = (event: PointerEvent) => {
      const next = htmlMode(event.target)
      // A soft tick as the cursor reaches something it can use (sound on only).
      if (next && next !== previous) sound.tick()
      previous = next
      setHtml(next)
    }
    const out = () => {
      element.dataset.visible = 'false'
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    document.documentElement.addEventListener('pointerleave', out)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      document.documentElement.removeEventListener('pointerleave', out)
    }
  }, [enabled])

  if (!enabled) return null
  const mode: Mode = html ?? scene ?? 'default'

  return (
    <div ref={root} aria-hidden className="cursor" data-mode={mode} data-visible="false">
      <span className="cursor-ring" />
      <span className="cursor-label">{mode === 'close' ? 'Close' : 'Open'}</span>
      <span className="cursor-arrow">→</span>
    </div>
  )
}
