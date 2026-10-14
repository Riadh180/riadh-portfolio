'use client'

import { useEffect, useState } from 'react'
import { SCRAMBLE_DURATION, scrambleText } from '@/lib/scramble'

/**
 * The text, scrambling for ~1.2s each time `active` turns on, the text changes or `run`
 * changes (same timing as the 3D card).
 */
export function useScramble(text: string, active: boolean, run = 0) {
  // Only set from animation frames; null means "show the clean text".
  const [scrambled, setScrambled] = useState<string | null>(null)

  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const start = performance.now()
    let frame = requestAnimationFrame(function step() {
      const elapsed = (performance.now() - start) / 1000
      const done = elapsed >= SCRAMBLE_DURATION
      setScrambled(done ? null : scrambleText(text, elapsed))
      if (!done) frame = requestAnimationFrame(step)
    })
    return () => {
      cancelAnimationFrame(frame)
      setScrambled(null)
    }
  }, [text, active, run])

  return active && scrambled !== null ? scrambled : text
}
