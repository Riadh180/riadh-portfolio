'use client'

import { CapstoneDetail } from '@/components/depth/CapstoneDetail'
import { DepthPanel } from '@/components/depth/DepthPanel'
import { capstone } from '@/content/site'
import { isShown, useJourney } from '@/stores/journey'
import { useWork } from '@/stores/work'

/**
 * Depth as real HTML (inside System's numbering: 03): held still at the bottom-left while
 * the camera looks up through the water at the capstone panel; the capstone's details when
 * its panel is open (`initial`: its /work/capstone page, so they are in the server HTML).
 */
export function DepthSection({ initial = null }: { initial?: string | null }) {
  const here = useJourney((state) => isShown(state.progress, 'depth'))
  const opened = useWork((state) => state.opened)
  const routed = useWork((state) => state.routed)
  const open = (routed ? opened : initial) === capstone.slug
  return (
    <section id="depth" aria-label="Depth: data engineering" className="relative h-[160svh]">
      <div
        data-here={here || open}
        className="sticky top-0 page-grid h-svh content-end pb-(--margin) opacity-0 transition-opacity duration-700 ease-signal data-[here=true]:opacity-100"
      >
        <div
          data-keep-clear
          className="col-span-12 -mx-(--margin) bg-linear-to-t from-bg from-70% to-transparent px-(--margin) pt-16 sm:col-span-8 lg:col-span-4 lg:mx-0 lg:bg-none lg:px-0 lg:pt-0"
        >
          {open ? <CapstoneDetail /> : <DepthPanel />}
        </div>
      </div>
    </section>
  )
}
