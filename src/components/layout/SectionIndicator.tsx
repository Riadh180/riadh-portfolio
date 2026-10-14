'use client'

import { Scramble } from '@/components/ui/Scramble'
import { sections } from '@/content/site'
import { type Place, useJourney } from '@/stores/journey'

const SECTION: Record<Place, string> = {
  hero: 'signal',
  statement: 'approach',
  work: 'work',
  system: 'system',
  depth: 'depth',
  contact: 'contact',
}

/** Current place in the world, following the camera path. */
export function SectionIndicator() {
  const place = useJourney((state) => state.place)
  const current = sections.find((s) => s.id === SECTION[place]) ?? sections[0]
  return (
    <p className="ui text-muted" aria-live="polite">
      <span className="text-text">{current.index}</span> /{' '}
      <Scramble text={current.label} hover={false} />
    </p>
  )
}
