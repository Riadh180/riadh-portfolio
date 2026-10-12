import { Hero } from '@/components/sections/Hero'
import { SectionShell } from '@/components/sections/SectionShell'
import { about, profile } from '@/content/site'

export default function Home() {
  return (
    <main id="main" className="relative">
      <Hero />

      <SectionShell id="approach" title={profile.tagline}>
        <p className="copy text-muted">{about.body}</p>
        <p className="ui text-muted">Languages: {about.languages.join(' · ')}</p>
      </SectionShell>

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
