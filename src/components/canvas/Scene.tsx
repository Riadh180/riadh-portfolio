import { Backdrop } from './Backdrop'
import { CameraRig } from './CameraRig'
import { ParticleField } from './particles/ParticleField'
import { Effects } from './post/Effects'
import { useLightRig } from './useLightRig'
import type { Pointer } from './usePointer'

type Props = {
  simSize: number
  pointer: Pointer
  reducedMotion: boolean
}

export function Scene({ simSize, pointer, reducedMotion }: Props) {
  // Reduced motion keeps the atmosphere but slows it to a near-still drift.
  const timeScale = reducedMotion ? 0.15 : 1
  const rig = useLightRig(timeScale)

  return (
    <>
      <CameraRig pointer={pointer} enabled={!reducedMotion} />
      <Backdrop rig={rig} />
      <ParticleField
        simSize={simSize}
        rig={rig}
        pointer={pointer}
        timeScale={timeScale}
        cursorStrength={reducedMotion ? 0 : 1}
        warmUp={reducedMotion}
      />
      <Effects reducedMotion={reducedMotion} />
    </>
  )
}
