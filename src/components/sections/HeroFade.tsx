'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import { useJourney } from '@/stores/journey'

/**
 * Holds the hero's small UI fixed at the bottom-left and fades it out in place as the
 * camera leaves the hero, instead of letting it scroll up through the scene. Faded out, it
 * is inert (no focus, no clicks) until the visitor comes back.
 */
export function HeroFade({ children }: { children: ReactNode }) {
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const apply = (progress: number) => {
      const element = layer.current
      if (!element) return
      const t = Math.min(1, Math.max(0, (progress - 0.02) / 0.16))
      const opacity = 1 - t * t * (3 - 2 * t)
      element.style.opacity = String(opacity)
      element.inert = opacity < 0.01
    }
    apply(useJourney.getState().progress)
    return useJourney.subscribe((state) => apply(state.progress))
  }, [])

  return (
    <div
      ref={layer}
      className="pointer-events-none fixed inset-x-0 bottom-0 page-grid pb-(--margin)"
    >
      {children}
    </div>
  )
}
