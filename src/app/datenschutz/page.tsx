import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import { legalAddress } from '@/content/legal'
import { profile } from '@/content/site'

export const metadata: Metadata = {
  title: `Datenschutz — ${profile.name}`,
  alternates: { canonical: '/datenschutz' },
}

/** Placeholder privacy page: the essentials now, the full text later. */
export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutz">
      <div>
        <h2 className="ui text-text">Verantwortlich</h2>
        <p>
          {legalAddress.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          E-Mail: <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </p>
      </div>
      <p>
        Diese Website setzt keine Cookies und verwendet kein Tracking und keine Analyse-Tools.
        Schriften werden selbst gehostet; es werden keine Inhalte von Drittanbietern geladen.
      </p>
      <p>
        Im Browser werden lediglich zwei technische Einstellungen gespeichert (lokaler Speicher,
        nicht an uns übertragen): ob der Ton eingeschaltet ist und ob die Intro-Animation in dieser
        Sitzung schon gezeigt wurde.
      </p>
      <p>
        Hosting: Vercel Inc. Beim Aufruf der Seite verarbeitet Vercel technisch notwendige
        Server-Logdaten (z. B. IP-Adresse, Zeitpunkt, abgerufene Seite, Browser), um die Seite
        auszuliefern und abzusichern.
      </p>
      <p className="text-text/60">Der vollständige Text folgt.</p>
    </LegalPage>
  )
}
