import type { Metadata } from 'next'
import { ogImage } from '@/lib/ogImage'
import { Suspense } from 'react'
import { capstone, jobs, profile } from '@/content/site'
import { Home } from '@/components/sections/Home'

type Params = { slug: string }

/** Every job, and the capstone (opened in Depth). */
const work = [...jobs, capstone]

export function generateStaticParams(): Params[] {
  return work.map((job) => ({ slug: job.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const job = work.find((item) => item.slug === slug)
  if (!job) return {}
  const title = `${job.company} · ${job.metric} — ${profile.name}`
  return {
    title,
    description: job.summary,
    alternates: { canonical: `/work/${job.slug}` },
    openGraph: {
      title,
      description: job.summary,
      type: 'article',
      url: `/work/${job.slug}`,
      images: [ogImage],
    },
  }
}

/**
 * A job's own page (and the capstone's): shareable, indexable. It is the whole site, scrolled
 * to the Work place with this job's card open in 3D (the capstone: to Depth, its panel open);
 * its details are in the server HTML. Closing returns to /, still at the same place.
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
  return <Home work={work.some((job) => job.slug === slug) ? slug : null} />
}
