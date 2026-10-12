import { sceneColors, sceneConfig } from '@/styles/scene'
import { Backdrop } from './Backdrop'
import { CameraRig } from './CameraRig'
import { Emblem } from './hero/Emblem'
import { HeroLighting } from './hero/HeroLighting'
import { ParticleField } from './particles/ParticleField'
import { Effects } from './post/Effects'
import type { Pointer } from './usePointer'
import { useSceneClock } from './useSceneClock'

type Props = {
  simSize: number
  pointer: Pointer
  reducedMotion: boolean
}

export function Scene({ simSize, pointer, reducedMotion }: Props) {
  // Reduced motion keeps the atmosphere but slows it to a near-still drift.
  const timeScale = reducedMotion ? 0.15 : 1
  const clock = useSceneClock(timeScale)

  return (
    <>
      <primitive attach="background" object={sceneColors.bg} />
      <HeroLighting look={sceneConfig.glass} clock={clock} />
      <CameraRig pointer={pointer} enabled={!reducedMotion} />
      <Backdrop />
      <Emblem
        look={sceneConfig.glass}
        pointer={pointer}
        clock={clock}
        reducedMotion={reducedMotion}
      />
      <ParticleField
        simSize={simSize}
        clock={clock}
        pointer={pointer}
        timeScale={timeScale}
        cursorStrength={reducedMotion ? 0 : 1}
      />
      <Effects reducedMotion={reducedMotion} />
    </>
  )
}
