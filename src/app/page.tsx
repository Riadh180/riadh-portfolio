import { Hero } from '@/components/sections/Hero'
import { SectionShell } from '@/components/sections/SectionShell'
import { about, profile } from '@/content/site'

export default function Home() {
  return (
    <main id="main" className="relative">
      <Hero />

      <SectionShell id="approach" title="Approach">
        <p className="col-span-12 text-lede md:col-span-6 md:col-start-3">{about.body}</p>
        <dl className="col-span-12 grid grid-cols-2 gap-6 md:col-span-3 md:col-start-10 md:grid-cols-1">
          <div>
            <dt className="meta text-muted">Based in</dt>
            <dd className="mt-1">{profile.location}</dd>
          </div>
          <div>
            <dt className="meta text-muted">Languages</dt>
            <dd className="mt-1">{about.languages.join(', ')}</dd>
          </div>
        </dl>
      </SectionShell>

      <SectionShell id="form" title="Form" />
      <SectionShell id="work" title="Work" />
      <SectionShell id="system" title="System" />
      <SectionShell id="depth" title="Depth" />
      <SectionShell id="contact" title="Let’s talk" />
    </main>
  )
}
