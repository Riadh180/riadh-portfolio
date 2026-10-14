import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticWorld } from '@/components/canvas/StaticWorld'
import { GlitchText } from '@/components/ui/GlitchText'
import { profile } from '@/content/site'

export const metadata: Metadata = {
  title: `Signal lost — ${profile.name}`,
  robots: { index: false, follow: true },
}

/** 404 in the site's style: the static world, a small glitching line, the way back. */
export default function NotFound() {
  return (
    <>
      <StaticWorld />
      <main id="main" className="relative page-grid min-h-svh content-end pb-(--margin)">
        <div className="col-span-12 flex flex-col gap-4 sm:col-span-6 lg:col-span-4">
          <p className="ui text-muted">
            <span className="text-text">404</span> / Not found
          </p>
          <h1 className="font-ui text-[clamp(2.5rem,7vw,5rem)] leading-[0.9] text-text uppercase">
            <GlitchText text="Signal lost" active />
          </h1>
          <p className="copy text-sm text-text/80">This place isn’t on the path.</p>
          <Link
            href="/"
            className="self-start ui text-violet transition-colors duration-(--motion-duration-ui) hover:text-text"
          >
            ← Back to the signal
          </Link>
        </div>
      </main>
    </>
  )
}
