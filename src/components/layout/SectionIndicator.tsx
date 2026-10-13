'use client'

import { sections } from '@/content/site'
import { useJourney } from '@/stores/journey'

/** Current place in the world, following the camera path. */
export function SectionIndicator() {
  const statement = useJourney((state) => state.statement)
  const current = sections[statement ? 1 : 0]
  return (
    <p className="ui text-muted" aria-live="polite">
      <span className="text-text">{current.index}</span> / {current.label}
    </p>
  )
}
