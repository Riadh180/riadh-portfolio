'use client'

// Development only: the Work place's pieces on their own, under the hero's light, tuned
// from leva. Structural values (layer count, spacing, shard count…) rebuild the pieces;
// "copy values" puts the settings on the clipboard as JSON.

import { StatsGl } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { button, useControls } from 'leva'
import { useState } from 'react'
import { Backdrop } from '@/components/canvas/Backdrop'
import { sliders } from '@/components/canvas/dev/sliders'
import { HeroLighting } from '@/components/canvas/hero/HeroLighting'
import { Effects } from '@/components/canvas/post/Effects'
import { PLACE_MAX_DPR } from '@/components/canvas/quality'
import { useSceneClock } from '@/components/canvas/useSceneClock'
import { Pebbles } from '@/components/canvas/work/Pebbles'
import { Spine } from '@/components/canvas/work/Spine'
import { sceneColors, sceneConfig } from '@/styles/scene'

/** Where the lab camera sits: orbit angle round the spine, height, distance. */
// Close: the column overfills the screen height, as in the reference.
const view = { angle: 0.35, height: 0, distance: 5.2 }

function LabCamera() {
  useFrame(({ camera }) => {
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

function WorkScene({ version }: { version: number }) {
  const clock = useSceneClock(1)
  return (
    <>
      <primitive attach="background" object={sceneColors.bg} />
      <HeroLighting look={workLook} clock={clock} />
      <LabCamera />
      <Backdrop />
      <Spine key={`spine-${version}`} clock={clock} />
      <Pebbles key={`pebbles-${version}`} clock={clock} focusDistance={view.distance} />
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

  return (
    <main id="main" className="h-dvh bg-bg">
      <h1 className="sr-only">Work lab</h1>
      <Canvas
        dpr={[1, PLACE_MAX_DPR.work]}
        flat
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ position: [0, 0, 12], fov: 40, near: 0.1, far: 60 }}
        onCreated={({ gl }) => {
          gl.transmissionResolutionScale = 0.5
        }}
      >
        <WorkScene version={version} />
        <StatsGl className="top-auto! bottom-3! left-3!" />
      </Canvas>
      <p className="pointer-events-none absolute top-3 left-3 ui text-muted">
        <span className="text-text">Work lab</span> · spine + pebbles
      </p>
    </main>
  )
}
