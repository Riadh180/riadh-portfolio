import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LabLoader } from '@/components/lab/LabLoader'

export const metadata: Metadata = {
  title: 'Work lab',
  robots: { index: false, follow: false },
}

/** Development only: the Work spine, shards and cards on their own. 404 in production. */
export default function WorkLabPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <LabLoader lab="work" />
}
