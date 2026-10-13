'use client'

import { sections } from '@/content/site'
import { useJourney } from '@/stores/journey'

/** Current place in the world, following the camera path. */
export function SectionIndicator() {
  const place = useJourney((state) => state.place)
  const current =
    sections.find((s) => s.id === { hero: 'signal', statement: 'approach', work: 'work' }[place]) ??
    sections[0]
  return (
    <p className="ui text-muted" aria-live="polite">
      <span className="text-text">{current.index}</span> / {current.label}
    </p>
  )
}
