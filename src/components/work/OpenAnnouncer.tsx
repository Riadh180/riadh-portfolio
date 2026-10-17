'use client'

import { useEffect, useRef, useState } from 'react'
import { capstone, jobs } from '@/content/site'
import { useWork } from '@/stores/work'

/** What a screen reader hears a card called: the company, or the capstone's name. */
function nameOf(slug: string) {
  if (slug === capstone.slug) return `${capstone.company} capstone`
  return jobs.find((job) => job.slug === slug)?.company ?? slug
}

/**
 * Tells screen readers when a card (or the capstone) opens or closes, however it happened (a
 * click on the card, the backdrop, Close, Esc), in a polite live region that stays mounted.
 */
export function OpenAnnouncer() {
  const opened = useWork((state) => state.opened)
  const previous = useRef<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const before = previous.current
    previous.current = opened
    if (opened && opened !== before) setMessage(`${nameOf(opened)} opened`)
    else if (!opened && before) setMessage(`${nameOf(before)} closed`)
  }, [opened])

  return (
    <p className="sr-only" aria-live="polite">
      {message}
    </p>
  )
}
