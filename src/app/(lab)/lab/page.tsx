import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LabLoader } from '@/components/lab/LabLoader'

export const metadata: Metadata = {
  title: 'Glass lab',
  robots: { index: false, follow: false },
}

/** Development only: compare glass looks for the emblem side by side. 404 in production. */
export default function LabPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <LabLoader lab="glass" />
}
