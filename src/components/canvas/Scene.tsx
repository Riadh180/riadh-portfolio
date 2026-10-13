import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { useJourney } from '@/stores/journey'
import type { GlassLook } from './hero/glassLook'
import { sceneColors, sceneConfig } from '@/styles/scene'
import { Backdrop } from './Backdrop'
import { CameraRig } from './CameraRig'
import { Emblem } from './hero/Emblem'
import { DustSheet } from './journey/DustSheet'
import { GoldCloud } from './journey/GoldCloud'
import { type JourneyState, useJourneyState } from './journey/path'
import { Tagline } from './journey/Tagline'
import { HeroLighting } from './hero/HeroLighting'
import { ParticleField } from './particles/ParticleField'
import { Effects } from './post/Effects'
import type { Pointer } from './usePointer'
import { useSceneClock } from './useSceneClock'
import { WorkPlace } from './work/WorkPlace'

type Props = {
  simSize: number
  pointer: Pointer
  reducedMotion: boolean
}

/**
 * The light the glass sees: the hero's look, blending into Work's darker rig (and no
 * light-follow) as the camera arrives at Work.
 */
function blendLight(look: GlassLook, toWork: number) {
  const hero = sceneConfig.glass
  const work = sceneConfig.workLight
  const w = (1 - Math.cos(Math.PI * toWork)) / 2
  // Rounded so the environment only re-bakes when the light visibly changes.
  const mix = (a: number, b: number) => Math.round((a + (b - a) * w) * 100) / 100
  look.key = mix(hero.key, work.key)
  look.edge = mix(hero.edge, work.edge)
  look.face = mix(hero.face, work.face)
  look.follow = mix(hero.follow, 0)
}

/** One mutable look, blended every frame. */
function useLiveLook(journey: JourneyState) {
  const [look] = useState<GlassLook>(() => ({ ...sceneConfig.glass }))
  useFrame(() => blendLight(look, journey.toWork), -3)
  return look
}

export function Scene({ simSize, pointer, reducedMotion }: Props) {
  // Reduced motion keeps the atmosphere but slows it to a near-still drift.
  const timeScale = reducedMotion ? 0.15 : 1
  const clock = useSceneClock(timeScale)
  const journey = useJourneyState(reducedMotion)
  const look = useLiveLook(journey)
  const atWork = useJourney((state) => state.place === 'work')

  return (
    <>
      <primitive attach="background" object={sceneColors.bg} />
      <HeroLighting look={look} clock={clock} calm={() => journey.toWork} />
      <CameraRig pointer={pointer} journey={journey} enabled={!reducedMotion} />
      <Backdrop journey={journey} />
      <Emblem
        look={look}
        pointer={pointer}
        clock={clock}
        reducedMotion={reducedMotion}
        journey={journey}
      />
      <GoldCloud journey={journey} clock={clock} reducedMotion={reducedMotion} />
      <DustSheet clock={clock} journey={journey} />
      <Tagline clock={clock} reducedMotion={reducedMotion} journey={journey} />
      <WorkPlace journey={journey} clock={clock} />
      <ParticleField
        simSize={simSize}
        clock={clock}
        pointer={pointer}
        timeScale={timeScale}
        cursorStrength={reducedMotion ? 0 : 1}
        resting={() => journey.toWork > 0.85}
      />
      {/* At Work: no multisampling (heavy mass, capped DPR; see quality.ts). */}
      <Effects reducedMotion={reducedMotion} antialias={!atWork} />
    </>
  )
}
