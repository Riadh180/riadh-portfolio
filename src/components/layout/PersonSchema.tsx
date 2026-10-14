import { about, profile } from '@/content/site'
import { siteUrl } from '@/lib/siteUrl'

/** Structured data for search engines: who this site is about (schema.org Person). */
export function PersonSchema() {
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role,
    description: profile.summary,
    email: `mailto:${profile.email}`,
    url: siteUrl.toString(),
    sameAs: [profile.linkedin, profile.github],
    address: { '@type': 'PostalAddress', addressLocality: 'Essen', addressCountry: 'DE' },
    knowsLanguage: about.languages,
    knowsAbout: [
      'React',
      'React Native',
      'TypeScript',
      'Next.js',
      'Three.js',
      'WebGL',
      'Data engineering',
    ],
  }
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be inline; the content is our own static data.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, '\\u003c') }}
    />
  )
}
