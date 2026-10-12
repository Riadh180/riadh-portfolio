import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer } from '@react-three/postprocessing'
import type { BloomEffect, ChromaticAberrationEffect } from 'postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import { HalfFloatType } from 'three'
import { sceneConfig } from '@/styles/scene'
import { GradeEffect } from './GradeEffect'

/**
 * HDR pipeline: bloom on the brightest cores only, radial chromatic aberration
 * (canvas only, clean center), then the film grade (which also tone-maps highlights).
 */
export function Effects({ reducedMotion }: { reducedMotion: boolean }) {
  const bloom = useRef<BloomEffect>(null)
  const chromatic = useRef<ChromaticAberrationEffect>(null)
  const grade = useMemo(() => new GradeEffect(), [])
  // Thin glass edges alias at 1–1.5 DPR; at ~2 DPR the pixels already supersample.
  const dpr = useThree((state) => state.viewport.dpr)
  const multisampling = dpr < 1.75 ? 2 : 0
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
      <Bloom ref={bloom} mipmapBlur />
      <ChromaticAberration ref={chromatic} radialModulation />
      <primitive object={grade} />
    </EffectComposer>
  )
}
