'use client'

// Development only: the Work place's pieces on their own, under the hero's light, tuned
// from leva. Structural values (layer count, spacing, shard count…) rebuild the pieces;
// "copy values" puts the settings on the clipboard as JSON.

import { StatsGl } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { button, useControls } from 'leva'
import { useState } from 'react'
import type { PerspectiveCamera } from 'three'
import { Backdrop } from '@/components/canvas/Backdrop'
import { sliders } from '@/components/canvas/dev/sliders'
import { HeroLighting } from '@/components/canvas/hero/HeroLighting'
import { Effects } from '@/components/canvas/post/Effects'
import { PLACE_MAX_DPR } from '@/components/canvas/quality'
import { useSceneClock } from '@/components/canvas/useSceneClock'
import { Pebbles } from '@/components/canvas/work/Pebbles'
import { Spine } from '@/components/canvas/work/Spine'
import { COLUMN_SPACING } from '@/components/canvas/work/layout'
import { WorkCards } from '@/components/canvas/work/WorkCards'
import { WorkDetail } from '@/components/work/WorkDetail'
import { WorkList } from '@/components/work/WorkList'
import { useWorkUrl } from '@/components/work/useWorkUrl'
import { WorkSwipe } from '@/components/work/WorkSwipe'
import { useWork } from '@/stores/work'
import { sceneColors, sceneConfig } from '@/styles/scene'

type View = 'desktop' | 'phone'

/** In the lab a card's URL is ?open=<slug> (the site uses /work/<slug>). */
const labRoutes = {
  toUrl: (slug: string) => `/lab/work?open=${slug}`,
  base: '/lab/work',
  fromLocation: (location: Location) => new URLSearchParams(location.search).get('open'),
}

/**
 * Where the lab camera sits on desktop: orbit angle round the spine, height, distance.
 * Close: the column overfills the screen height, as in the reference; far enough that
 * the cards orbiting it fit in view.
 */
const view = { angle: 0, height: -2.45, distance: 7.8 }

/** Desktop: the composition sits right of centre, leaving the left column to the HTML list. */
const SHIFT = 0.07

function LabCamera({ mode }: { mode: View }) {
  useFrame(({ camera, size }) => {
    const perspective = camera as PerspectiveCamera
    if (mode === 'phone') perspective.clearViewOffset()
    else {
      const { width, height } = size
      if (perspective.view?.offsetX !== -width * SHIFT || perspective.view?.fullWidth !== width) {
        perspective.setViewOffset(width, height, -width * SHIFT, 0, width, height)
      }
    }
    if (mode === 'phone') {
      // Rides down the column of cards with the swipe, the spine just behind them.
      const y = -useWork.getState().swipe * COLUMN_SPACING
      // Back far enough that a card fits the narrow screen with margin, the next one
      // peeking in below it.
      camera.position.set(0, y - 0.35, 7.2)
      camera.lookAt(0, y - 0.35, 0)
      return
    }
    camera.position.set(
      Math.sin(view.angle) * view.distance,
      view.height,
      Math.cos(view.angle) * view.distance,
    )
    camera.lookAt(0, view.height, 0)
  })
  return null
}

/** The hero's glass look with Work's darker light rig on top (tuned live below). */
const workLook = { ...sceneConfig.glass, ...sceneConfig.workLight }

function WorkScene({ version, mode }: { version: number; mode: View }) {
  const clock = useSceneClock(1)
  return (
    <>
      <primitive attach="background" object={sceneColors.bg} />
      <HeroLighting look={workLook} clock={clock} />
      <LabCamera mode={mode} />
      <Backdrop />
      <Spine key={`spine-${version}`} clock={clock} />
      <Pebbles
        key={`pebbles-${version}`}
        clock={clock}
        focusDistance={mode === 'phone' ? 6 : view.distance}
        layout={mode === 'phone' ? 'column' : 'orbit'}
      />
      <WorkCards layout={mode === 'phone' ? 'column' : 'orbit'} clock={clock} />
      <Effects reducedMotion={false} antialias={false} />
    </>
  )
}

/** Sliders whose change rebuilds the pieces (geometry or instance counts). */
const STRUCTURAL = new Set([
  'layers',
  'spacing',
  'twist',
  'offset',
  'refractive',
  'count',
  'violet',
])

export default function WorkLab() {
  const [version, setVersion] = useState(0)
  useWorkUrl(labRoutes)
  const opened = useWork((state) => state.opened)
  const { mode } = useControls('View', {
    // ?view=phone opens straight into the phone view.
    mode: {
      options: { desktop: 'desktop', phone: 'phone' },
      value:
        new URLSearchParams(window.location.search).get('view') === 'phone' ? 'phone' : 'desktop',
    },
  }) as { mode: View }
  const rebuild = (
    group: Record<string, number>,
    ranges: Record<string, [number, number, number]>,
  ) =>
    Object.fromEntries(
      Object.entries(sliders(group, ranges)).map(([key, slider]) => [
        key,
        {
          ...slider,
          onChange: (value: number) => {
            // leva also calls this on mount: rebuild only on a real change.
            const changed = group[key] !== value
            slider.onChange(value)
            if (changed && STRUCTURAL.has(key)) setVersion((v) => v + 1)
          },
        },
      ]),
    )

  useControls(
    'Spine',
    rebuild(sceneConfig.spine, {
      pieces: [8, 90, 1],
      height: [4, 20, 0.5],
      twist: [0, 1.5, 0.01],
      offset: [0, 0.6, 0.01],
      tilt: [0, 0.8, 0.01],
      fins: [0, 0.6, 0.01],
      bulge: [0, 0.2, 0.005],
      turn: [0, 0.4, 0.005],
      sheen: [0, 1, 0.01],
      gloss: [0, 1, 0.01],
    }),
  )
  useControls(
    'Pebbles',
    rebuild(sceneConfig.pebbles, {
      count: [0, 8000, 100],
      size: [0.01, 0.15, 0.001],
      brightness: [0, 3, 0.05],
      radius: [0.5, 3, 0.01],
      hug: [0, 1, 0.01],
      clouds: [0, 0.8, 0.01],
      rise: [0, 1, 0.01],
    }),
  )
  useControls(
    'Light',
    Object.fromEntries(
      Object.entries(
        sliders(sceneConfig.workLight, {
          key: [0, 1500, 5],
          edge: [0, 20, 0.1],
          face: [0, 4, 0.05],
        }),
      ).map(([key, slider]) => [
        key,
        {
          ...slider,
          // Write through to the look the lighting reads.
          onChange: (value: number) => {
            slider.onChange(value)
            Object.assign(workLook, { [key]: value })
          },
        },
      ]),
    ),
  )
  useControls(
    'Camera',
    sliders(view, {
      angle: [-Math.PI, Math.PI, 0.01],
      height: [-6, 6, 0.05],
      distance: [5, 20, 0.1],
    }),
  )
  useControls('Export', {
    'copy values': button(() => {
      const values = {
        spine: sceneConfig.spine,
        pebbles: sceneConfig.pebbles,
        workLight: sceneConfig.workLight,
      }
      void navigator.clipboard.writeText(JSON.stringify(values, null, 2))
    }),
  })

  const canvas = (
    <Canvas
      dpr={[1, PLACE_MAX_DPR.work]}
      flat
      gl={{ antialias: false, stencil: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 7.5], fov: 40, near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        gl.transmissionResolutionScale = 0.5
      }}
    >
      <WorkScene version={version} mode={mode} />
      <StatsGl className="top-auto! bottom-3! left-3!" />
    </Canvas>
  )

  return (
    <main id="main" className="relative h-dvh bg-bg">
      <h1 className="sr-only">Work lab</h1>
      {mode === 'phone' ? (
        // A phone-sized frame: the swipe overlays the canvas.
        <div className="absolute top-1/2 left-1/2 h-[844px] w-[390px] -translate-1/2 overflow-hidden border border-line">
          {canvas}
          <WorkSwipe />
          {opened && (
            <div className="absolute inset-x-0 bottom-0 flex bg-linear-to-t from-bg via-bg/95 to-transparent px-4 pt-24 pb-8">
              <WorkDetail />
            </div>
          )}
        </div>
      ) : (
        <>
          {canvas}
          <div className="absolute bottom-16 left-(--margin) w-[min(30rem,34vw)]">
            {opened ? <WorkDetail /> : <WorkList />}
          </div>
        </>
      )}
      <p className="pointer-events-none absolute top-3 left-3 ui text-muted">
        <span className="text-text">Work lab</span> · spine, chips, cards ({mode})
      </p>
    </main>
  )
}
