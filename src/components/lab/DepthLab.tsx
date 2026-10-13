'use client'

// Development only: the Depth environment on its own: under the water surface, looking up
// a little, drifting slowly.

import { StatsGl } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { DepthWorld } from '@/components/canvas/depth/DepthWorld'
import { Effects } from '@/components/canvas/post/Effects'
import { useSceneClock } from '@/components/canvas/useSceneClock'
import { DepthPanel } from '@/components/depth/DepthPanel'
import { sceneColors } from '@/styles/scene'
import { Color } from 'three'

/** The water's own darkness: a deep teal, not the world's charcoal. */
const deep = new Color().copy(sceneColors.teal).multiplyScalar(0.05).lerp(sceneColors.bg, 0.6)

function LabCamera() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime
    camera.position.set(Math.sin(t * 0.05) * 1.5 + 1.5, -1.5 + Math.sin(t * 0.08) * 0.3, 7)
    camera.lookAt(1.5, 1.2, -4)
  })
  return null
}

function DepthScene() {
  const clock = useSceneClock(1)
  return (
    <>
      <primitive attach="background" object={deep} />
      <LabCamera />
      <DepthWorld clock={clock} fog={deep} />
      <Effects reducedMotion={false} />
    </>
  )
}

export default function DepthLab() {
  return (
    <main id="main" className="relative h-dvh bg-bg">
      <h1 className="sr-only">Depth lab</h1>
      <Canvas
        dpr={[1, 2]}
        flat
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ position: [0, -1.5, 7], fov: 50, near: 0.1, far: 80 }}
      >
        <DepthScene />
        <StatsGl className="top-auto! bottom-3! left-3!" />
      </Canvas>
      <div className="absolute bottom-16 left-(--margin) w-[min(30rem,40vw)]">
        <DepthPanel />
      </div>
      <p className="pointer-events-none absolute top-3 left-3 ui text-muted">
        <span className="text-text">Depth lab</span> · beneath the interface
      </p>
    </main>
  )
}
