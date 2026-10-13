'use client'

import { sections } from '@/content/site'
import { useJourney } from '@/stores/journey'
import { SystemList } from '@/components/system/SystemList'

const section = sections.find((s) => s.id === 'system')

/**
 * The System place as real HTML: the skills as a nested list, held still at the
 * bottom-left while the camera swings round the graph.
 */
export function SystemSection() {
  const here = useJourney((state) => state.place === 'system')
  return (
    <section id="system" aria-labelledby="system-heading" className="relative h-[200svh]">
      <div
        data-here={here}
        className="sticky top-0 page-grid h-svh content-end pb-(--margin) opacity-0 transition-opacity duration-700 ease-signal data-[here=true]:opacity-100"
      >
        <div className="col-span-12 flex flex-col gap-4 sm:col-span-8 lg:col-span-4">
          <h2 id="system-heading" className="ui text-muted">
            <span className="text-text">{section?.index}</span> / {section?.label}
          </h2>
          <SystemList />
        </div>
      </div>
    </section>
  )
}
