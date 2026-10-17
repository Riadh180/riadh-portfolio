'use client'

import { useEffect, useRef } from 'react'
import { jobs } from '@/content/site'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useWork } from '@/stores/work'
import { JobDetail } from './JobDetail'

/** The details appear once the card has flown in and begun to dissolve (ms). */
const APPEAR_DELAY = 1100

/**
 * The opened card's details, in small mono at the left over the scene: a modal view. Focus
 * moves in when it opens, stays inside while it is open, and goes back to the card's button
 * when it closes; Esc closes; previous / next walk through the jobs without closing.
 */
export function WorkDetail({ slug }: { slug?: string | null }) {
  const opened = useWork((state) => state.opened)
  const open = useWork((state) => state.open)
  const close = useWork((state) => state.close)
  const panel = useRef<HTMLDivElement>(null)
  // `slug` overrides the store (a /work/<slug> page shows its card before the URL is read).
  const job = jobs.find((item) => item.slug === (slug === undefined ? opened : slug))
  const index = job ? jobs.indexOf(job) : -1
  useFocusTrap(panel, !!job)

  useEffect(() => {
    if (!opened) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    // Move focus in once the details have appeared.
    const timer = window.setTimeout(() => panel.current?.focus(), APPEAR_DELAY)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(timer)
      // Back to the card's own button in the list.
      document.querySelector<HTMLButtonElement>(`[data-work="${opened}"]`)?.focus()
    }
  }, [opened, close])

  if (!job) return null
  const previous = jobs[(index - 1 + jobs.length) % jobs.length]
  const next = jobs[(index + 1) % jobs.length]

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="work-detail-title"
      tabIndex={-1}
      key={job.slug}
      // Phones: at most half the screen (it scrolls), so the opened card above stays clear.
      className="detail-in flex max-h-[50svh] w-full max-w-[46ch] flex-col gap-4 overflow-y-auto outline-none lg:max-h-none lg:overflow-visible"
    >
      <JobDetail job={job} headingId="work-detail-title" />
      <nav aria-label="More work" className="flex gap-4 ui text-xs">
        {previous && (
          <button
            type="button"
            className="text-text/70 hover:text-text"
            onClick={() => open(previous.slug)}
          >
            ← {previous.company}
          </button>
        )}
        {next && (
          <button
            type="button"
            className="text-text/70 hover:text-text"
            onClick={() => open(next.slug)}
          >
            {next.company} →
          </button>
        )}
      </nav>
      <button
        type="button"
        onClick={close}
        className="self-start ui text-xs text-violet hover:text-text"
      >
        × Close <span className="text-muted">(Esc)</span>
      </button>
    </div>
  )
}
