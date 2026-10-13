'use client'

// Development only: the System place's skills graph on its own, under Work's dark light.

import { StatsGl } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Backdrop } from '@/components/canvas/Backdrop'
import { HeroLighting } from '@/components/canvas/hero/HeroLighting'
import { Effects } from '@/components/canvas/post/Effects'
import { SkillGraph } from '@/components/canvas/system/SkillGraph'
import { useSceneClock } from '@/components/canvas/useSceneClock'
import { SystemList } from '@/components/system/SystemList'
import { sceneColors, sceneConfig } from '@/styles/scene'

const look = { ...sceneConfig.glass, ...sceneConfig.workLight }

/** Circles the graph slowly; the graph sits right of centre (the list takes the left). */
function LabCamera() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime * 0.05
    camera.position.set(Math.sin(t) * 1.2 - 1.6, 0.5, 11)
    camera.lookAt(-1.6, -0.2, 0)
  })
  return null
}

function SystemScene() {
  const clock = useSceneClock(1)
  return (
    <>
      <primitive attach="background" object={sceneColors.bg} />
      <HeroLighting look={look} clock={clock} />
      <LabCamera />
      <Backdrop />
      <SkillGraph clock={clock} />
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
