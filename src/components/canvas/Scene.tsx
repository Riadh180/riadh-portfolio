import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { useJourney } from '@/stores/journey'
import type { GlassLook } from './hero/glassLook'
import { sceneColors, sceneConfig } from '@/styles/scene'
import { Backdrop, warmth } from './Backdrop'
import { DepthBackdrop } from './depth/DepthBackdrop'
import { DepthPlace } from './depth/DepthPlace'
import { Deferred, Soon } from './Deferred'
import { CameraRig } from './CameraRig'
import { Emblem } from './hero/Emblem'
import { Drift } from './motion/Drift'
import { DustSheet } from './journey/DustSheet'
import { Atmosphere } from './journey/Atmosphere'
import { ContactGlow } from './journey/ContactGlow'
import { FormMoment } from './journey/FormMoment'
import { GoldCloud } from './journey/GoldCloud'
import { type JourneyState, useJourneyState } from './journey/path'
import { Tagline } from './journey/Tagline'
import { Trails } from './journey/Trails'
import { HeroLighting } from './hero/HeroLighting'
import { HeroAura } from './hero/HeroAura'
import { IntroBurst } from './hero/IntroBurst'
import { Warmup } from './hero/Warmup'
import { ParticleField } from './particles/ParticleField'
import { Effects } from './post/Effects'
import type { Pointer } from './usePointer'
import { useSceneClock } from './useSceneClock'
import { SystemPlace } from './system/SystemPlace'
import { LensShards } from './work/LensShards'
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
function blendLight(look: GlassLook, toWork: number, toSystem: number) {
  const hero = sceneConfig.glass
  const work = sceneConfig.workLight
  // Work's dark rig; back to the hero's light for the gems and The Core at System.
  const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2
  const w = ease(toWork) * (1 - ease(toSystem))
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
  useFrame(() => blendLight(look, journey.toWork, journey.toSystem), -3)
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
      {/* The warm moment is the hero's: gone within the first third of the descent. */}
      <HeroLighting
        look={look}
        clock={clock}
        calm={() => Math.min(1, journey.toWork * 3)}
        warmHold={() => warmth(journey)}
      />
      <CameraRig pointer={pointer} journey={journey} enabled={!reducedMotion} />
      <Backdrop journey={journey} />
      <Drift journey={journey} seed={3} weight={1.3}>
        <Emblem
          look={look}
          pointer={pointer}
          clock={clock}
          reducedMotion={reducedMotion}
          journey={journey}
        />
      </Drift>
      <HeroAura journey={journey} clock={clock} />
      <IntroBurst reducedMotion={reducedMotion} />
      <Warmup />
      {/* Further down the path: built lazily, on engagement (see Deferred). */}
      <Deferred>
        <GoldCloud journey={journey} clock={clock} reducedMotion={reducedMotion} />
        <DustSheet clock={clock} journey={journey} />
        <Drift journey={journey} seed={7} weight={2}>
          <Tagline clock={clock} reducedMotion={reducedMotion} journey={journey} />
        </Drift>
      </Deferred>
      <Deferred>
        <FormMoment journey={journey} simSize={simSize} clock={clock} />
      </Deferred>
      <Deferred>
        <Trails journey={journey} clock={clock} />
      </Deferred>
      <Deferred>
        <WorkPlace journey={journey} clock={clock} />
        <LensShards journey={journey} />
      </Deferred>
      <Deferred>
        <SystemPlace
          journey={journey}
          clock={clock}
          look={look}
          pointer={pointer}
          reducedMotion={reducedMotion}
        />
      </Deferred>
      <Deferred>
        <DepthBackdrop
          opacity={() => {
            const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2
            return ease(journey.toDepth) * (1 - ease(journey.toContact))
          }}
        />
        <DepthPlace journey={journey} clock={clock} />
        <ContactGlow journey={journey} />
      </Deferred>
      <Soon>
        <Atmosphere journey={journey} clock={clock} />
      </Soon>
      <ParticleField
        simSize={simSize}
        clock={clock}
        pointer={pointer}
        timeScale={timeScale}
        cursorStrength={reducedMotion ? 0 : 1}
        // Paused below the hero's world; back for the loop, which becomes the hero again.
        resting={() => journey.toWork > 0.95 && journey.loop < 0.4}
      />
      {/* At Work: no multisampling (heavy mass, capped DPR; see quality.ts). */}
      <Effects reducedMotion={reducedMotion} antialias={!atWork} />
    </>
  )
}
