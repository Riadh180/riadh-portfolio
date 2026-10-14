import type { Metadata } from 'next'
import { ogImage } from '@/lib/ogImage'
import Link from 'next/link'
import { about, capstone, cv, depth, jobs, profile, skillGraph } from '@/content/site'

export const metadata: Metadata = {
  title: `CV — ${profile.name}`,
  description: `${profile.role}. ${profile.summary}`,
  alternates: { canonical: '/cv' },
  openGraph: {
    type: 'profile',
    title: `CV — ${profile.name}`,
    description: `${profile.role}. ${profile.summary}`,
    url: '/cv',
    images: [ogImage],
  },
}

/** The PDF version, generated from this page at build time (scripts/cv-pdf.mjs). */
const PDF = '/cv/riadh-souissi-cv.pdf'

/**
 * The CV as a clean, printable HTML page, built from the same content as the site (no
 * phone number). Light on screen and in print; the site's 3D layer is not loaded here.
 */
export default function CvPage() {
  return (
    <>
      {/* The CV's own page colours, screen and print (only on this route). */}
      <style>{`
        html { color-scheme: light; }
        html, body { background: #e9ebe8; }
        @media print {
          @page { size: A4; margin: 16mm 16mm 18mm; }
          html, body { background: #fff; }
        }
      `}</style>
      <main
        id="main"
        className="cv mx-auto max-w-[52rem] bg-[#f6f7f5] px-[clamp(1.25rem,5vw,3.5rem)] py-12 font-text text-[0.82rem] leading-relaxed text-[#14171c] print:max-w-none print:bg-white print:p-0"
      >
        <nav className="mb-10 flex justify-between font-ui text-[0.7rem] tracking-wider uppercase print:hidden">
          <Link href="/" className="underline-offset-4 hover:underline">
            ← {profile.name}
          </Link>
          <a href={PDF} download className="underline-offset-4 hover:underline">
            Download PDF ↓
          </a>
        </nav>

        <header className="mb-8 border-b border-[#14171c]/20 pb-6">
          <h1 className="font-ui text-[2rem] leading-tight tracking-wide uppercase">
            {profile.name}
          </h1>
          <p className="font-ui text-[0.95rem] tracking-wide uppercase">{profile.role}</p>
          <p className="mt-3">
            {profile.location} · {profile.availability} · Permanent residency, no sponsorship needed
          </p>
          <p className="mt-1">
            <a href={`mailto:${profile.email}`}>{profile.email}</a> ·{' '}
            <a href={profile.linkedin}>linkedin.com/in/riadh-souissi</a> ·{' '}
            <a href={profile.github}>github.com/Riadh180</a>
          </p>
        </header>

        <section className="mb-8" aria-labelledby="cv-profile">
          <h2 id="cv-profile" className="cv-h2">
            Profile
          </h2>
          <p>{about.body}</p>
          <p className="mt-1">
            Languages:{' '}
            {cv.languages.map((language) => `${language.name} ${language.level}`).join(' · ')}
          </p>
        </section>

        <section className="mb-8" aria-labelledby="cv-experience">
          <h2 id="cv-experience" className="cv-h2">
            Experience
          </h2>
          <ol className="flex flex-col gap-5">
            {jobs.map((job) => (
              <li key={job.slug} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-ui text-[0.9rem] tracking-wide uppercase">
                    {job.company} — {job.role}
                  </h3>
                  <span className="font-ui text-[0.75rem] tracking-wider">
                    {job.dates} · {job.location}
                  </span>
                </div>
                <p className="mt-1">{job.cvSummary ?? job.summary}</p>
                {job.details && (
                  <ul className="mt-1 list-disc pl-5">
                    {job.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-[#14171c]/70">{job.stack.join(' · ')}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-8 break-inside-avoid" aria-labelledby="cv-skills">
          <h2 id="cv-skills" className="cv-h2">
            Skills
          </h2>
          <p className="mb-2">
            <strong className="font-ui tracking-wide uppercase">Core:</strong>{' '}
            {skillGraph.core.name}
          </p>
          <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-1">
            {skillGraph.branches.map((branch) => (
              <div key={branch.id} className="contents">
                <dt className="font-ui tracking-wide uppercase">{branch.label}</dt>
                <dd>{branch.skills.map((skill) => skill.name).join(', ')}</dd>
              </div>
            ))}
            {cv.moreSkills.map((group) => (
              <div key={group.label} className="contents">
                <dt className="font-ui tracking-wide uppercase">{group.label}</dt>
                <dd>{group.skills.join(', ')}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="break-inside-avoid" aria-labelledby="cv-education">
          <h2 id="cv-education" className="cv-h2">
            Education
          </h2>
          <p className="font-ui tracking-wide uppercase">{depth.programme}</p>
          <p>{depth.details}</p>
          <p className="mt-1 text-[#14171c]/70">{depth.stack.join(' · ')}</p>
          <p className="mt-2">
            <strong className="font-ui tracking-wide uppercase">
              Capstone: {capstone.company}
            </strong>{' '}
            — {capstone.summary}
          </p>
          <p className="mt-1 text-[#14171c]/70">
            {capstone.stack.join(' · ')} ·{' '}
            <a href={capstone.repo}>github.com/Riadh180/data-engineering-capstone</a>
          </p>
          {cv.education.map((item) => (
            <div key={item.title} className="mt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="font-ui tracking-wide uppercase">{item.title}</p>
                <span className="font-ui text-[0.75rem] tracking-wider">{item.dates}</span>
              </div>
              <p>{item.place}</p>
            </div>
          ))}
        </section>
      </main>
    </>
  )
}
