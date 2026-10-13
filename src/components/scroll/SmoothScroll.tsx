'use client'

import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useJourney } from '@/stores/journey'

/** Scroll positions (px) where the path's progress reaches 0, 1, 1 (end of dwell), 2 and 3. */
type Anchors = [number, number, number, number, number]

/** Reads the anchors from the sections: statement arrival and dwell, Work arrival and end. */
function measure(): Anchors {
  const top = (id: string) => document.getElementById(id)?.offsetTop ?? 0
  const height = (id: string) => document.getElementById(id)?.offsetHeight ?? 0
  const screen = window.innerHeight
  const statement = Math.max(1, top('approach'))
  const dwell = Math.max(statement, statement + height('approach') - screen)
  const work = Math.max(dwell + 1, top('work'))
  const end = Math.max(work + 1, work + height('work') - screen)
  return [0, statement, dwell, work, end]
}

/** Scroll position → path progress (piecewise linear between the anchors). */
function toProgress(scroll: number, [, statement, dwell, work, end]: Anchors) {
  if (scroll <= statement) return scroll / statement
  if (scroll <= dwell) return 1
  if (scroll <= work) return 1 + (scroll - dwell) / (work - dwell)
  return Math.min(3, 2 + (scroll - work) / (end - work))
}

/** Path progress → scroll position (the inverse, for jumps). */
function toScroll(progress: number, [, statement, dwell, work, end]: Anchors) {
  if (progress <= 1) return progress * statement
  if (progress <= 2) return dwell + (progress - 1) * (work - dwell)
  return work + (progress - 2) * (end - work)
}

/**
 * Smooth scroll (Lenis), feeding the camera path. Lenis's damping settles a scroll tick in
 * ~0.7s, as in the reference; the scene adds a slower secondary settle on top. With reduced
 * motion the page keeps native scrolling and only the progress is tracked.
 */
export function SmoothScroll() {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const { setProgress, setJump } = useJourney.getState()
    let anchors = measure()
    const update = (scroll: number) => setProgress(Math.max(0, toProgress(scroll, anchors)))
    const resize = new ResizeObserver(() => {
      anchors = measure()
      update(window.scrollY)
    })
    resize.observe(document.body)

    if (reducedMotion) {
      const onScroll = () => update(window.scrollY)
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      setJump((progress) => window.scrollTo(0, toScroll(progress, anchors)))
      return () => {
        resize.disconnect()
        window.removeEventListener('scroll', onScroll)
      }
    }

    const lenis = new Lenis({ autoRaf: true, lerp: 0.1, anchors: true })
    lenis.on('scroll', () => update(lenis.scroll))
    update(lenis.scroll)
    setJump((progress) => lenis.scrollTo(toScroll(progress, anchors), { immediate: true }))
    return () => {
      resize.disconnect()
      lenis.destroy()
    }
  }, [reducedMotion])

  return null
}
