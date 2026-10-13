'use client'

import { useEffect, useState } from 'react'
import { jobs, sections } from '@/content/site'
import { useJourney } from '@/stores/journey'
import { useWork } from '@/stores/work'
import { useWorkUrl } from './useWorkUrl'
import { WorkDetail } from './WorkDetail'
import { WorkList } from './WorkList'

const section = sections.find((s) => s.id === 'work')

/** On the site a card's URL is /work/<slug>; arriving there scrolls down to its card. */
const siteRoutes = {
  toUrl: (slug: string) => `/work/${slug}`,
  base: '/',
  fromLocation: (location: Location) => /^\/work\/([^/]+)/.exec(location.pathname)?.[1] ?? null,
  onArrive: (slug: string) => {
    const index = jobs.findIndex((job) => job.slug === slug)
    // After layout, so the section anchors are measured.
    requestAnimationFrame(() => useJourney.getState().jump(2 + index / (jobs.length - 1)))
  },
}

/** The card the camera is at, from the scroll (phones show its title). */
function useCurrentCard() {
  const [index, setIndex] = useState(0)
  useEffect(
    () =>
      useJourney.subscribe((state) => {
        const at = Math.round(Math.min(1, Math.max(0, state.progress - 2)) * (jobs.length - 1))
        setIndex(at)
      }),
    [],
  )
  return index
}

/**
 * The Work place as real HTML. Taller than the screen: scrolling through it walks the
 * camera down the spine card by card, while its contents hold still at the bottom-left:
 * the filter and list (desktop) or the current card's title (phones), and the details of
 * an opened card. `initial` pre-opens a card (its /work/<slug> page), so the details are in
 * the server HTML.
 */
export function WorkSection({ initial = null }: { initial?: string | null }) {
  useWorkUrl(siteRoutes)
  const here = useJourney((state) => state.place === 'work')
  const opened = useWork((state) => state.opened)
  const routed = useWork((state) => state.routed)
  const shown = routed ? opened : initial
  const current = jobs[useCurrentCard()]
  const open = useWork((state) => state.open)

  return (
    <section id="work" aria-labelledby="work-heading" className="relative h-[560svh]">
      <div
        data-here={here || !!shown}
        className="sticky top-0 page-grid h-svh content-end pb-(--margin) opacity-0 transition-opacity duration-700 ease-signal data-[here=true]:opacity-100"
      >
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
          <h2 id="work-heading" className="sr-only">
            <span className="text-text">{section?.index}</span> / {section?.label}
          </h2>
          {shown ? (
            <div className="bg-linear-to-t from-bg via-bg/90 to-transparent pt-16 lg:bg-none lg:pt-0">
              <WorkDetail slug={shown} />
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <WorkList />
              </div>
              {current && (
                <div className="-mx-(--margin) flex flex-col gap-1 bg-linear-to-t from-bg via-bg/90 to-transparent px-(--margin) pt-16 lg:hidden">
                  <p className="ui text-muted">
                    <span className="text-text">
                      {String(jobs.indexOf(current) + 1).padStart(2, '0')}
                    </span>{' '}
                    / {jobs.length} · {current.years}
                  </p>
                  <button
                    type="button"
                    className="text-left ui-lg text-text"
                    onClick={() => open(current.slug)}
                    data-work={current.slug}
                  >
                    {current.company} · {current.metric}
                  </button>
                  <p className="ui text-muted">{current.role}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
