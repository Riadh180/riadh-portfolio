'use client'

import { lazy, Suspense } from 'react'

// Compiled out of production builds entirely (the page also 404s there).
const GlassLab = process.env.NODE_ENV === 'development' ? lazy(() => import('./GlassLab')) : null

export function LabLoader() {
  if (!GlassLab) return null
  return (
    <Suspense fallback={null}>
      <GlassLab />
    </Suspense>
  )
}
