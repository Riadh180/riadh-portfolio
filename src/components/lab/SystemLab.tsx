'use client'

// Development only: the System place's skills graph on its own, under Work's dark light.

import { StatsGl } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Backdrop } from '@/components/canvas/Backdrop'
import { HeroLighting } from '@/components/canvas/hero/HeroLighting'
import { Effects } from '@/components/canvas/post/Effects'
import { SkillGraph } from '@/components/canvas/system/SkillGraph'
import { type Pointer, usePointer } from '@/components/canvas/usePointer'
import { useSceneClock } from '@/components/canvas/useSceneClock'
import { useRef } from 'react'
import type { PerspectiveCamera } from 'three'
import { SystemList } from '@/components/system/SystemList'
import { sceneColors, sceneConfig } from '@/styles/scene'

/** The Core needs the hero's glass light; the gems read well under it too. */
const look = sceneConfig.glass

/**
 * A slow orbit round the graph (swinging ±35°), with a heavy cursor parallax on top; the
 * graph sits right of centre (the list takes the left).
 */
function LabCamera({ pointer }: { pointer: Pointer }) {
  const parallax = useRef({ x: 0, y: 0 })
  useFrame(({ camera, clock, size }, delta) => {
    const p = parallax.current
    const ease = 1 - Math.exp(-Math.min(delta, 1 / 30) * 1.4)
    p.x += ((pointer.uv.x - 0.5) * 1.2 - p.x) * ease
    p.y += ((pointer.uv.y - 0.5) * 0.8 - p.y) * ease
    const angle = Math.sin(clock.elapsedTime * 0.07) * 0.6
    const distance = 14
    camera.position.set(Math.sin(angle) * distance + p.x, 0.4 + p.y, Math.cos(angle) * distance)
    camera.lookAt(0, -0.3, 0)
    const perspective = camera as PerspectiveCamera
    if (perspective.view?.offsetX !== -size.width * 0.12) {
      perspective.setViewOffset(
        size.width,
        size.height,
        -size.width * 0.12,
        0,
        size.width,
        size.height,
      )
    }
  })
  return null
}

function SystemScene() {
  const clock = useSceneClock(1)
  const pointer = usePointer()
  return (
    <>
      <primitive attach="background" object={sceneColors.bg} />
      <HeroLighting look={look} clock={clock} />
      <LabCamera pointer={pointer} />
      <Backdrop />
      <SkillGraph clock={clock} look={look} pointer={pointer} reducedMotion={false} />
      <Effects reducedMotion={false} />
    </>
  )
}

export default function SystemLab() {
  return (
    <main id="main" className="relative h-dvh bg-bg">
      <h1 className="sr-only">System lab</h1>
      <Canvas
        dpr={[1, 2]}
        flat
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ position: [0, 0, 11], fov: 40, near: 0.1, far: 60 }}
        eventSource={typeof document === 'undefined' ? undefined : document.body}
        eventPrefix="client"
      >
        <SystemScene />
        <StatsGl className="top-auto! bottom-3! left-3!" />
      </Canvas>
      <div className="absolute bottom-16 left-(--margin) w-[min(28rem,34vw)]">
        <SystemList />
      </div>
      <p className="pointer-events-none absolute top-3 left-3 ui text-muted">
        <span className="text-text">System lab</span> · skills graph
      </p>
    </main>
  )
}
