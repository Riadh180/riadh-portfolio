import { type ReactNode, useEffect, useState } from 'react'
import { useJourney } from '@/stores/journey'

/**
 * Lazy places: the hero renders at load; the places further down the path are built only
 * once the visitor engages (first scroll, key, touch or pointer move), one per idle moment
 * in path order, so a visitor who only reads the hero never pays for them and building
 * never blocks the page in one long task. Everything mounts at once as soon as the
 * visitor leaves the hero (a scroll or a nav flight).
 */
const queue: (() => void)[] = []
let scheduled = false

function idle(callback: () => void) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback, { timeout: 400 })
    return
  }
  window.setTimeout(callback, 60)
}

function pump() {
  if (scheduled) return
  scheduled = true
  idle(() => {
    scheduled = false
    queue.shift()?.()
    if (queue.length) pump()
  })
}

/** Resolves on the visitor's first sign of engagement. */
const engaged =
  typeof window === 'undefined'
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const events = ['wheel', 'keydown', 'touchstart', 'pointermove', 'scroll'] as const
        const go = () => {
          events.forEach((name) => window.removeEventListener(name, go))
          resolve()
        }
        events.forEach((name) => window.addEventListener(name, go, { passive: true }))
      })

function flush() {
  while (queue.length) queue.shift()?.()
}

export function Deferred({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let done = false
    const mount = () => {
      if (done) return
      done = true
      setReady(true)
    }
    queue.push(mount)
    engaged.then(pump)
    // Moving down the path: no more waiting.
    const off = useJourney.subscribe((state) => {
      if (state.progress > 0.15) flush()
    })
    return () => {
      done = true
      off()
      const index = queue.indexOf(mount)
      if (index >= 0) queue.splice(index, 1)
    }
  }, [])

  return ready ? children : null
}

/**
 * Mounts its children in the first idle moment after the canvas starts (no engagement
 * needed): for parts of the hero that can arrive a beat later, so the hero's own mount is
 * not one long task.
 */
export function Soon({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let done = false
    idle(() => {
      if (!done) setReady(true)
    })
    return () => {
      done = true
    }
  }, [])
  return ready ? children : null
}
