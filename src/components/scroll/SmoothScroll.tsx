'use client'

import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useJourney } from '@/stores/journey'

/**
 * Smooth scroll (Lenis), feeding the camera path. Lenis's damping settles a scroll tick in
 * ~0.7s, as in the reference; the scene adds a slower secondary settle on top. With reduced
 * motion the page keeps native scrolling and only the progress is tracked.
 */
export function SmoothScroll() {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const { setProgress } = useJourney.getState()
    // Hero → statement: progress reaches 1 when the statement section fills the screen.
    let distance = 1
    const measure = () => {
      distance = Math.max(1, document.getElementById('approach')?.offsetTop ?? 1)
    }
    const update = (scroll: number) => setProgress(Math.min(1, Math.max(0, scroll / distance)))
    measure()
    const resize = new ResizeObserver(() => {
      measure()
      update(window.scrollY)
    })
    resize.observe(document.body)

    if (reducedMotion) {
      const onScroll = () => update(window.scrollY)
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => {
        resize.disconnect()
        window.removeEventListener('scroll', onScroll)
      }
    }

    const lenis = new Lenis({ autoRaf: true, lerp: 0.1, anchors: true })
    lenis.on('scroll', () => update(lenis.scroll))
    update(lenis.scroll)
    return () => {
      resize.disconnect()
      lenis.destroy()
    }
  }, [reducedMotion])

  return null
}
