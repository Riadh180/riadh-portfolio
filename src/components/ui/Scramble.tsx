'use client'

import { useEffect, useRef, useState } from 'react'
import { useScramble } from '@/hooks/useScramble'

/**
 * A label that scrambles (letters flicker and resolve left to right, ~1.2s): when it first
 * appears, whenever its text changes, and each time its link or button is hovered or
 * focused. The one text reveal used across the UI. Screen readers get the clean text.
 */
export function Scramble({ text, hover = true }: { text: string; hover?: boolean }) {
  const span = useRef<HTMLSpanElement>(null)
  const [run, setRun] = useState(0)
  const shown = useScramble(text, true, run)

  useEffect(() => {
    const target = span.current?.closest<HTMLElement>('a, button') ?? null
    if (!hover || !target) return
    const again = () => setRun((n) => n + 1)
    target.addEventListener('pointerenter', again)
    target.addEventListener('focus', again)
    return () => {
      target.removeEventListener('pointerenter', again)
      target.removeEventListener('focus', again)
    }
  }, [hover])

  return (
    <span ref={span}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{shown}</span>
    </span>
  )
}
