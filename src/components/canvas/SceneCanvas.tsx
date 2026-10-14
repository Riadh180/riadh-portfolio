'use client'

import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useJourney } from '@/stores/journey'
import { useLoading } from '@/stores/loading'
import { useTier } from '@/stores/tier'
import { detectQuality, LITE_MAX_DPR, PLACE_MAX_DPR } from './quality'
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
  // No frames until the first scene's shaders are compiled (asynchronously, see Warmup):
  // the first render would otherwise compile them all in one long blocking task.
  const compiled = useLoading((state) => state.done.shaders)
  const lite = useTier((state) => state.tier === 'lite')

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 transition-opacity duration-1400 ease-signal ${ready ? 'opacity-100' : 'opacity-0'}`}
    >
      <Canvas
        dpr={Math.min(dpr, PLACE_MAX_DPR[place], lite ? LITE_MAX_DPR : Infinity)}
        flat
        frameloop={compiled ? 'always' : 'never'}
        // The canvas sits behind the page: take pointer events from the whole document, so
        // the 3D cards respond to hover and clicks through the HTML layer.
        eventSource={typeof document === 'undefined' ? undefined : document.body}
        eventPrefix="client"
        // The discrete GPU where there is one (dual-GPU laptops): waking it costs ~0.7s at
        // start, but the integrated one can't hold the full tier. Integrated-only machines
        // drop to the lite tier by measurement (PerformanceMonitor below).
        gl={{ antialias: false, stencil: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 10], fov: 40, near: 0.1, far: 60 }}
        onCreated={({ gl }) => {
          // The glass tubes are thin: what they refract doesn't need full resolution.
          gl.transmissionResolutionScale = 0.35
          // Shader error checks read the program log synchronously (a stall per shader):
          // development only.
          gl.debug.checkShaderErrors = process.env.NODE_ENV === 'development'
          setReady(true)
        }}
      >
        {/* Below 55 fps: the lite tier (once, for the visit) and a lower DPR. */}
        <PerformanceMonitor
          bounds={() => [55, 70]}
          flipflops={3}
          onDecline={() => {
            useTier.getState().degrade()
            setDpr((value) => Math.max(1, value - 0.5))
          }}
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
