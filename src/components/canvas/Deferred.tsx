import { type ReactNode, useEffect, useState } from 'react'
import { useJourney } from '@/stores/journey'

/**
 * Staged mounting: the hero renders first; the places further down the path mount one per
 * idle moment afterwards, in path order, so building the world never blocks the page in
 * one long task. Everything mounts at once as soon as the visitor leaves the hero.
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
    pump()
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
