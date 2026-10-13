import { Approach } from '@/components/sections/Approach'
import { Hero } from '@/components/sections/Hero'
import { SectionShell } from '@/components/sections/SectionShell'
import { WorkSection } from '@/components/work/WorkSection'
import { profile } from '@/content/site'

/** The whole page, one place after another down the camera path. */
export function Home({ work = null }: { work?: string | null }) {
  return (
    <main id="main" className="relative">
      <Hero />
      <Approach />
      {/* The descent from the statement to Work: scroll room for the camera, which passes
          through the dust as it snaps into a UI wireframe and scatters (the "Form" beat). */}
      <div aria-hidden className="h-[220svh]" />
      <WorkSection initial={work} />
      <SectionShell id="system" title="System" />
      <SectionShell id="depth" title="Depth" />
      <SectionShell id="contact" title="Let’s talk">
        <a href={`mailto:${profile.email}`} className="self-start ui text-violet hover:text-text">
          → {profile.email}
        </a>
      </SectionShell>
    </main>
  )
}
