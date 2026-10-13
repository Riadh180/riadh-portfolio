import type { Metadata } from 'next'
import { Suspense } from 'react'
import { jobs, profile } from '@/content/site'
import { Home } from '@/components/sections/Home'

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
 * A job's own page: shareable, indexable. It is the whole site, scrolled to the Work place
 * with this job's card open in 3D; its details are in the server HTML. Closing the card
 * returns to /, still at Work.
 */
export default function WorkPage({ params }: { params: Promise<Params> }) {
  // Reading the slug suspends; every slug is prerendered, so the page is still static.
  return (
    <Suspense fallback={<Home />}>
      <WorkHome params={params} />
    </Suspense>
  )
}

async function WorkHome({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  return <Home work={jobs.some((job) => job.slug === slug) ? slug : null} />
}
