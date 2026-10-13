import { Approach } from '@/components/sections/Approach'
import { Hero } from '@/components/sections/Hero'
import { SectionShell } from '@/components/sections/SectionShell'
import { profile } from '@/content/site'

export default function Home() {
  return (
    <main id="main" className="relative">
      <Hero />

      <Approach />

      <SectionShell id="form" title="Form" />
      <SectionShell id="work" title="Work" />
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
