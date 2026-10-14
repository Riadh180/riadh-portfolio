import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer } from '@react-three/postprocessing'
import type { BloomEffect, ChromaticAberrationEffect } from 'postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { HalfFloatType } from 'three'
import { useTier } from '@/stores/tier'
import { sceneConfig } from '@/styles/scene'
import { GradeEffect } from './GradeEffect'

/**
 * HDR pipeline: bloom on the brightest cores only, radial chromatic aberration
 * (canvas only, clean center), then the film grade (which also tone-maps highlights).
 */
type Props = {
  reducedMotion: boolean
  /**
   * Off where it costs more than it gives: the Work spine is a heavy mass, not thin glass
   * edges, and at its capped DPR multisampling would eat the savings.
   */
  antialias?: boolean
}

export function Effects({ reducedMotion, antialias = true }: Props) {
  const bloom = useRef<BloomEffect>(null)
  const chromatic = useRef<ChromaticAberrationEffect>(null)
  const grade = useMemo(() => new GradeEffect(), [])
  // Only on coarse (~1×) screens, judged by the device, not the live DPR: when the
  // performance monitor lowers a Retina screen's DPR, multisampling must not switch on
  // and cost back the frames it just won.
  const [coarse] = useState(() => window.devicePixelRatio < 1.25)
  const multisampling = antialias && coarse ? 2 : 0
  const lite = useTier((state) => state.tier === 'lite')
  useEffect(() => () => grade.dispose(), [grade])

  useFrame(() => {
    const { bloom: bloomConfig, chromatic: chromaticConfig } = sceneConfig

    if (bloom.current) {
      bloom.current.intensity = bloomConfig.intensity
      bloom.current.luminanceMaterial.threshold = bloomConfig.threshold
      bloom.current.luminanceMaterial.smoothing = bloomConfig.smoothing
      bloom.current.mipmapBlurPass.radius = bloomConfig.radius
    }

    if (chromatic.current) {
      const offset = reducedMotion ? 0 : chromaticConfig.offset
      chromatic.current.offset.set(offset, offset)
      chromatic.current.modulationOffset = chromaticConfig.modulationOffset
    }
  })

  return (
    <EffectComposer multisampling={multisampling} frameBufferType={HalfFloatType}>
      {/* Bloom at half resolution (a quarter in the lite tier): it only blurs the cores. */}
      <Bloom ref={bloom} mipmapBlur resolutionScale={lite ? 0.25 : 0.5} levels={lite ? 4 : 8} />
      <ChromaticAberration ref={chromatic} radialModulation />
      <primitive object={grade} />
    </EffectComposer>
  )
}
