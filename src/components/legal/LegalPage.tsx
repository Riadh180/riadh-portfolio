import Link from 'next/link'
import type { ReactNode } from 'react'
import { StaticWorld } from '@/components/canvas/StaticWorld'

/** A quiet text page in the site's style (Impressum, Datenschutz): the static world, mono type. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <StaticWorld />
      <main id="main" className="relative page-grid min-h-svh py-(--margin)">
        <div className="col-span-12 flex max-w-[46ch] flex-col gap-5 sm:col-span-8 lg:col-span-6">
          <Link
            href="/"
            className="self-start ui text-violet transition-colors duration-(--motion-duration-ui) hover:text-text"
          >
            ← Back to the signal
          </Link>
          <h1 className="font-ui text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] text-text uppercase">
            {title}
          </h1>
          <div className="flex copy flex-col gap-4 text-sm leading-relaxed text-text/85">
            {children}
          </div>
        </div>
      </main>
    </>
  )
}
