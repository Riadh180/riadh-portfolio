'use client'

// Development only: four live emblems, each with its own light rig and glass, tuned from
// its own leva folder. "copy values" puts that variant's look on the clipboard as JSON.

import { Canvas } from '@react-three/fiber'
import { button, useControls } from 'leva'
import { useState } from 'react'
import { Vector2 } from 'three'
import { Backdrop } from '@/components/canvas/Backdrop'
import { sliders } from '@/components/canvas/dev/sliders'
import { Emblem } from '@/components/canvas/hero/Emblem'
import { type GlassLook, lookRanges } from '@/components/canvas/hero/glassLook'
import { HeroLighting } from '@/components/canvas/hero/HeroLighting'
import { Effects } from '@/components/canvas/post/Effects'
import type { Pointer } from '@/components/canvas/usePointer'
import { useSceneClock } from '@/components/canvas/useSceneClock'
import { sceneColors } from '@/styles/scene'
import { type Variant, variants } from './variants'

/** The lab emblems ignore the cursor, so the variants turn in step. */
const still: Pointer = {
  uv: new Vector2(0.5, 0.5),
  active: false,
  tap: { ndc: new Vector2(), at: 0 },
}

function LabScene({ look }: { look: GlassLook }) {
  const clock = useSceneClock(1)
  return (
    <>
      <primitive attach="background" object={sceneColors.bg} />
      <HeroLighting look={look} clock={clock} />
      <Backdrop />
      <Emblem look={look} pointer={still} clock={clock} reducedMotion={false} />
      <Effects reducedMotion={false} />
    </>
  )
}

function LabVariant({ variant, index }: { variant: Variant; index: number }) {
  // Each variant tunes its own copy of the look.
  const [look] = useState(() => ({ ...variant.look }))
  useControls(
    `${variant.id} · ${variant.name}`,
    {
      ...sliders(look, lookRanges),
      'copy values': button(() => {
        const values = JSON.stringify({ variant: variant.name, glass: look }, null, 2)
        void navigator.clipboard.writeText(values)
      }),
    },
    { collapsed: index > 0 },
  )

  return (
    <figure className="relative m-0 min-h-0 border border-line">
      <Canvas
        dpr={1.5}
        flat
        gl={{ antialias: false, stencil: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 10], fov: 22, near: 0.1, far: 60 }}
        onCreated={({ gl }) => {
          gl.transmissionResolutionScale = 0.5
        }}
      >
        <LabScene look={look} />
      </Canvas>
      <figcaption className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1 ui">
        <span className="text-text">
          {variant.id} · {variant.name}
        </span>
        <span className="text-muted">{variant.note}</span>
      </figcaption>
    </figure>
  )
}

export default function GlassLab() {
  return (
    <main id="main" className="grid h-dvh grid-cols-2 grid-rows-2 bg-bg">
      <h1 className="sr-only">Glass lab</h1>
      {variants.map((variant, index) => (
        <LabVariant key={variant.id} variant={variant} index={index} />
      ))}
    </main>
  )
}
