import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LabLoader } from '@/components/lab/LabLoader'

export const metadata: Metadata = {
  title: 'Depth lab',
  robots: { index: false, follow: false },
}

/** Development only: the Depth environment on its own. 404 in production. */
export default function DepthLabPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <LabLoader lab="depth" />
}
