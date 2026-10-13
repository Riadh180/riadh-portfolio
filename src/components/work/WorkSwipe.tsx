'use client'

import { useEffect, useRef } from 'react'
import { jobs } from '@/content/site'
import { useWork } from '@/stores/work'

/**
 * Phones: a vertical swipe through the cards instead of the orbit. Each card gets a
 * full-height snap section holding its real HTML title; the scroll position drives the 3D
 * camera down the column of cards (work store `swipe`), and the card in view takes focus (and scrambles).
 */
export function WorkSwipe() {
  const scroller = useRef<HTMLDivElement>(null)
  const focus = useWork((state) => state.focus)
  const setSwipe = useWork((state) => state.setSwipe)

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const onScroll = () => {
      const at = element.scrollTop / element.clientHeight
      setSwipe(at)
      const current = jobs[Math.round(at)]
      if (current) focus(current.slug)
    }
    onScroll()
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => element.removeEventListener('scroll', onScroll)
  }, [focus, setSwipe])

  return (
    <div
      ref={scroller}
      className="absolute inset-0 snap-y snap-mandatory [scrollbar-width:none] overflow-y-auto overscroll-contain"
    >
      {jobs.map((job, i) => (
        <section
          key={job.slug}
          aria-label={job.company}
          className="flex h-full snap-center flex-col justify-end"
        >
          {/* A dark fade under the title, so it never sits on the next card's face. */}
          <div className="flex flex-col gap-1 bg-linear-to-t from-bg via-bg/90 to-transparent px-4 pt-20 pb-10">
            <p className="ui text-muted">
              <span className="text-text">{String(i + 1).padStart(2, '0')}</span> / {jobs.length} ·{' '}
              {job.years}
            </p>
            <button
              type="button"
              className="text-left ui-lg text-text"
              onFocus={() => focus(job.slug)}
            >
              {job.company} · {job.metric}
            </button>
            <p className="ui text-muted">{job.role}</p>
          </div>
        </section>
      ))}
    </div>
  )
}
