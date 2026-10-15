'use client'

import { type CSSProperties, useEffect, useState } from 'react'

/**
 * Arrival: the correct word with a few slices offset, settling (0.45s); then a rare 0.2s
 * glitch every 8–12s. Large type never shows a random state.
 */
const GLITCH = { arrival: 450, length: 200, calm: 8000, jitter: 4000 }

type Slice = { top: number; bottom: number; shift: number }

const roll = (): [Slice, Slice] => {
  const top = 10 + Math.random() * 30
  return [
    { top, bottom: 100 - top - 10 - Math.random() * 18, shift: -(0.05 + Math.random() * 0.06) },
    {
      top: 55 + Math.random() * 20,
      bottom: 5 + Math.random() * 15,
      shift: 0.06 + Math.random() * 0.07,
    },
  ]
}

/**
 * Display text that arrives as itself with a few slices offset, then glitches now and then:
 * two horizontal slices of it slip sideways for a moment (letters double), in the text's
 * own colour (no chromatic split on HTML). Screen readers get the clean text only.
 */
export function GlitchText({ text, active }: { text: string; active: boolean }) {
  const [slices, setSlices] = useState<[Slice, Slice] | null>(null)

  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    const next = (delay: number, length: number) => {
      timer = window.setTimeout(() => {
        setSlices(roll())
        timer = window.setTimeout(() => {
          setSlices(null)
          next(GLITCH.calm + Math.random() * GLITCH.jitter, GLITCH.length)
        }, length)
      }, delay)
    }
    next(0, GLITCH.arrival)
    return () => {
      window.clearTimeout(timer)
      setSlices(null)
    }
  }, [active])

  return (
    <span className="relative inline-block">
      <span className="sr-only">{text}</span>
      <span aria-hidden>{text}</span>
      {slices?.map((slice, i) => (
        <span
          key={i}
          aria-hidden
          className="glitch-slice"
          style={
            {
              '--top': `${slice.top}%`,
              '--bottom': `${slice.bottom}%`,
              '--shift': `${slice.shift}em`,
            } as CSSProperties
          }
        >
          {text}
        </span>
      ))}
    </span>
  )
}
