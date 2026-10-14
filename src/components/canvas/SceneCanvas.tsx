'use client'

import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useJourney } from '@/stores/journey'
import { detectQuality, PLACE_MAX_DPR } from './quality'
import { Scene } from './Scene'
import { usePointer } from './usePointer'

const DevTools =
  process.env.NODE_ENV === 'development' ? lazy(() => import('./dev/DevTools')) : null

/** Fixed WebGL layer behind the page. Decorative only: all content lives in the HTML. */
export default function SceneCanvas() {
  const reducedMotion = useReducedMotion()
  const pointer = usePointer()
  const [quality] = useState(detectQuality)
  const [dpr, setDpr] = useState(quality.maxDpr)
  const [ready, setReady] = useState(false)
  // Each place renders at most at its measured DPR ceiling (see PLACE_MAX_DPR).
  const place = useJourney((state) => state.place)

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 transition-opacity duration-1400 ease-signal ${ready ? 'opacity-100' : 'opacity-0'}`}
    >
      <Canvas
        dpr={Math.min(dpr, PLACE_MAX_DPR[place])}
        flat
        // The canvas sits behind the page: take pointer events from the whole document, so
        // the 3D cards respond to hover and clicks through the HTML layer.
        eventSource={typeof document === 'undefined' ? undefined : document.body}
        eventPrefix="client"
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ position: [0, 0, 10], fov: 40, near: 0.1, far: 60 }}
        onCreated={({ gl }) => {
          // The glass tubes are thin: what they refract doesn't need full resolution.
          gl.transmissionResolutionScale = 0.5
          // Shader error checks read the program log synchronously (a stall per shader):
          // development only.
          gl.debug.checkShaderErrors = process.env.NODE_ENV === 'development'
          setReady(true)
        }}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr((value) => Math.max(1, value - 0.5))}
          onIncline={() => setDpr((value) => Math.min(quality.maxDpr, value + 0.5))}
          onFallback={() => setDpr(1)}
        />
        <Scene simSize={quality.simSize} pointer={pointer} reducedMotion={reducedMotion} />
        {DevTools && (
          <Suspense fallback={null}>
            <DevTools />
          </Suspense>
        )}
      </Canvas>
    </div>
  )
}
