import { Approach } from '@/components/sections/Approach'
import { ContactSection } from '@/components/sections/ContactSection'
import { DepthSection } from '@/components/sections/DepthSection'
import { Hero } from '@/components/sections/Hero'
import { SystemSection } from '@/components/sections/SystemSection'
import { WorkSection } from '@/components/work/WorkSection'

/** The whole page, one place after another down the camera path. */
export function Home({ work = null }: { work?: string | null }) {
  return (
    <main id="main" className="relative">
      <Hero />
      <Approach />
      {/* The descent from the statement to Work: scroll room for the camera, which passes
          through the dust as it snaps into a UI wireframe and scatters (the "Form" beat). */}
      <div aria-hidden className="h-[150svh]" />
      <WorkSection initial={work} />
      <SystemSection />
      <DepthSection initial={work} />
      <ContactSection />
      {/* The visual loop: scroll room for the camera to pull back until the view is the
          hero's, then the page returns to the top. Not part of the page's content. */}
      <div id="loop" aria-hidden className="h-[110svh]" />
    </main>
  )
}
