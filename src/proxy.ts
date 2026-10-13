import { type NextRequest, NextResponse } from 'next/server'
import { jobs } from '@/content/site'

/**
 * Unknown /work/<slug> paths get a real 404 before the page renders (under Cache
 * Components the page's static shell would otherwise start streaming with a 200).
 */
export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split('/')[2]
  if (jobs.some((job) => job.slug === slug)) return NextResponse.next()
  return NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 })
}

export const config = { matcher: '/work/:slug' }
