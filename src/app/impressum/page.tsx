import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import { profile } from '@/content/site'

export const metadata: Metadata = {
  title: `Impressum — ${profile.name}`,
  alternates: { canonical: '/impressum' },
}

/** Placeholder: the full Impressum text is added later. */
export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <p>Angaben gemäß § 5 DDG.</p>
      <p>
        {profile.name}
        <br />
        Essen, Germany
      </p>
      <p>
        E-Mail: <a href={`mailto:${profile.email}`}>{profile.email}</a>
      </p>
      <p className="text-text/60">Der vollständige Text folgt.</p>
    </LegalPage>
  )
}
