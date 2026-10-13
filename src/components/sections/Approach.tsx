'use client'

import { about, profile, sections } from '@/content/site'
import { useJourney } from '@/stores/journey'

const section = sections.find((s) => s.id === 'approach')

/**
 * The statement place. The tagline itself is set large in the 3D scene (refracted and
 * glitched there); here it stays as the real heading for screen readers and search. The
 * short mono paragraph appears ~0.5s after the tagline has started to rise.
 */
export function Approach() {
  const shown = useJourney((state) => state.statement)

  return (
    // Taller than the screen: the text holds still (sticky) while the camera dwells at the
    // statement, so the paragraph stays beside the 3D tagline.
    <section id="approach" aria-labelledby="approach-title" className="relative h-[180svh]">
      <div className="sticky top-0 page-grid h-svh content-end pb-(--margin) lg:content-start lg:pt-[47svh]">
        <h2 id="approach-title" className="sr-only">
          {profile.tagline}
        </h2>
        <div
          data-shown={shown}
          className="col-span-12 flex flex-col gap-3 opacity-0 transition-[opacity,translate] duration-300 ease-signal data-[shown=true]:translate-y-0 data-[shown=true]:opacity-100 data-[shown=true]:delay-500 data-[shown=true]:duration-900 motion-safe:translate-y-3 sm:col-span-7 lg:col-span-3 lg:col-start-9"
        >
          <p className="ui text-muted">
            <span className="text-text">{section?.index}</span> / {section?.label}
          </p>
          <p className="copy text-muted">{about.body}</p>
          <p className="ui text-muted">Languages: {about.languages.join(' · ')}</p>
        </div>
      </div>
    </section>
  )
}
