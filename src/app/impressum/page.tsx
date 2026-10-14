import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import { legalAddress } from '@/content/legal'
import { profile } from '@/content/site'

export const metadata: Metadata = {
  title: `Impressum — ${profile.name}`,
  alternates: { canonical: '/impressum' },
}

/**
 * The legally required contact details. The phone number appears here only (required by
 * § 5 DDG), nowhere else on the site or the CV.
 */
const PHONE = '+49 176 61666467'

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <p>Angaben gemäß § 5 DDG</p>
      <p>
        {legalAddress.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>
      <div>
        <h2 className="ui text-text">Kontakt</h2>
        <p>
          E-Mail: <a href={`mailto:${profile.email}`}>{profile.email}</a>
          <br />
          Telefon: {PHONE}
        </p>
      </div>
      <div>
        <h2 className="ui text-text">Verantwortlich für den Inhalt</h2>
        <p>{profile.name}, Anschrift wie oben</p>
      </div>
    </LegalPage>
  )
}
