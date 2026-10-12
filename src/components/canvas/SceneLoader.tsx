'use client'

import dynamic from 'next/dynamic'

// Client-only and lazy: the HTML (and the hero text) paints before any WebGL loads.
const SceneCanvas = dynamic(() => import('./SceneCanvas'), { ssr: false })

export function SceneLoader() {
  return <SceneCanvas />
}
