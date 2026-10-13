import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { jobs, profile } from '@/content/site'
import { JobDetail } from '@/components/work/JobDetail'

type Params = { slug: string }

export function generateStaticParams(): Params[] {
  return jobs.map((job) => ({ slug: job.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const job = jobs.find((item) => item.slug === slug)
  if (!job) return {}
  const title = `${job.company} · ${job.metric} — ${profile.name}`
  return {
    title,
    description: job.summary,
    alternates: { canonical: `/work/${job.slug}` },
    openGraph: { title, description: job.summary, type: 'article' },
  }
}

/**
 * A job's own page: shareable, indexable, real HTML. Over the scene it reads like an
 * opened card (details in small mono at the left). Once the Work place is on the camera
 * path, this URL also opens its card in 3D; back returns to the Work place.
 */
export default function WorkPage({ params }: { params: Promise<Params> }) {
  return (
    <main id="main" className="relative page-grid min-h-svh content-end pb-(--margin)">
      {/* Reading the slug suspends; every slug is prerendered, so the article is still in
          the static HTML, and the page shell stays instant on navigation. */}
      <Suspense fallback={null}>
        <WorkArticle params={params} />
      </Suspense>
    </main>
  )
}

async function WorkArticle({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const job = jobs.find((item) => item.slug === slug)
  if (!job) notFound()

  return (
    <article
      aria-labelledby="work-title"
      className="col-span-12 flex flex-col gap-4 sm:col-span-7 lg:col-span-4"
    >
      <JobDetail job={job} headingId="work-title" as="h1" />
      <Link href="/#work" className="self-start ui text-violet hover:text-text">
        ← All work
      </Link>
    </article>
  )
}
