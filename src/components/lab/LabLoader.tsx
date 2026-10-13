'use client'

import dynamic from 'next/dynamic'

// Client-only (no server render: WebGL and leva live in the browser), and compiled out of
// production builds entirely (the pages also 404 there).
const labs =
  process.env.NODE_ENV === 'development'
    ? {
        glass: dynamic(() => import('./GlassLab'), { ssr: false }),
        work: dynamic(() => import('./WorkLab'), { ssr: false }),
        system: dynamic(() => import('./SystemLab'), { ssr: false }),
      }
    : null

export function LabLoader({ lab }: { lab: 'glass' | 'work' | 'system' }) {
  const Lab = labs?.[lab]
  return Lab ? <Lab /> : null
}
