import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LabLoader } from '@/components/lab/LabLoader'

export const metadata: Metadata = {
  title: 'System lab',
  robots: { index: false, follow: false },
}

/** Development only: the skills graph on its own. 404 in production. */
export default function SystemLabPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <LabLoader lab="system" />
}
