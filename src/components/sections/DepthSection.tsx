'use client'

import { DepthPanel } from '@/components/depth/DepthPanel'
import { isShown, useJourney } from '@/stores/journey'

/**
 * Depth as real HTML (inside System's numbering: 03): held still at the bottom-left while
 * the camera looks up through the water at the capstone panel.
 */
export function DepthSection() {
  const here = useJourney((state) => isShown(state.progress, 'depth'))
  return (
    <section id="depth" aria-label="Depth: data engineering" className="relative h-[160svh]">
      <div
        data-here={here}
        className="sticky top-0 page-grid h-svh content-end pb-(--margin) opacity-0 transition-opacity duration-700 ease-signal data-[here=true]:opacity-100"
      >
        <div className="col-span-12 -mx-(--margin) bg-linear-to-t from-bg from-70% to-transparent px-(--margin) pt-16 sm:col-span-8 lg:col-span-4 lg:mx-0 lg:bg-none lg:px-0 lg:pt-0">
          <DepthPanel />
        </div>
      </div>
    </section>
  )
}
