import type { MetadataRoute } from 'next'
import { jobs } from '@/content/site'
import { siteUrl } from '@/lib/siteUrl'

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, siteUrl).toString()
  return [
    { url: url('/'), changeFrequency: 'monthly', priority: 1 },
    { url: url('/cv'), changeFrequency: 'monthly', priority: 0.8 },
    ...jobs.map((job) => ({
      url: url(`/work/${job.slug}`),
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ]
}
