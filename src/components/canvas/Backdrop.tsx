import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, type ShaderMaterial, Vector2, Vector3 } from 'three'
import { useTier } from '@/stores/tier'
import { depthPalette } from './depth/depthPalette'
import { sceneColors, sceneConfig } from '@/styles/scene'
import { type JourneyState, WORK } from './journey/path'
import fragmentShader from './shaders/backdrop.frag'
import vertexShader from './shaders/backdrop.vert'

/** 0..1: Contact's warm moment, risen with The Core and gone again by the end of the loop. */
export function warmth(journey: JourneyState) {
  // Early: overlaps Depth's exit (bubbles, data dust) instead of following it.
  const rise = Math.min(1, Math.max(0, (journey.toContact - 0.1) / 0.6))
  return rise * rise * (3 - 2 * rise) * (1 - journey.loop)
}

/**
 * The place's accent leaning the haze a little (MOTION.md: one accent per place): teal at
 * Depth, violet at Work (already the haze's own), blue at System.
 */
function accentOf(journey: JourneyState) {
  const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2
  const system = ease(journey.toSystem) * (1 - ease(journey.toDepth))
  const depth = ease(journey.toDepth) * (1 - ease(journey.toContact))
  if (depth > 0.01) return { color: depthPalette.accent, amount: depth * 0.3 }
  if (system > 0.01) return { color: sceneColors.blue, amount: system * 0.3 }
  return null
}

/**
 * Fullscreen backdrop: the world's haze, violet from the lower left and a cool haze from
 * the upper right, the same in every place.
 */
export function Backdrop({ journey }: { journey?: JourneyState }) {
  const material = useRef<ShaderMaterial>(null)
  const axis = useMemo(() => new Vector3(), [])
  const uniforms = useMemo(
    () => ({
      uBackground: { value: sceneColors.bg },
      uLowerLeft: { value: new Color().copy(sceneColors.violet) },
      uUpperRight: { value: new Color().copy(sceneColors.teal) },
      uStrength: { value: 0 },
      uFog: { value: 0 },
      uOctaves: { value: 4 },
      uBacklight: {
        value: new Color().copy(sceneColors.violet).lerp(sceneColors.teal, 0.15).multiplyScalar(0.05),
      },
      uBacklightOuter: { value: new Color().copy(sceneColors.teal).multiplyScalar(0.012) },
      uBacklightAt: { value: new Vector2(0.5, 0.5) },
      // Work's darks: below the world's charcoal, with a trace of teal (the reference's
      // darks measure ~7,13,14).
      uWorkBase: {
        value: new Color()
          .copy(sceneColors.bg)
          .multiplyScalar(0.4)
          .add(new Color().copy(sceneColors.teal).multiplyScalar(0.004)),
      },
      uViolet: { value: 0 },
      uVioletColor: { value: new Color().copy(sceneColors.violet).multiplyScalar(0.16) },
      uTime: { value: 0 },
      uFogColor: {
        value: new Color().copy(sceneColors.teal).lerp(sceneColors.bg, 0.55).multiplyScalar(0.18),
      },
      uAspect: { value: 1 },
    }),
    [],
  )

  useFrame(({ size, camera }) => {
    if (!material.current) return
    const u = material.current.uniforms
    // One world haze for every place (as in the reference): violet from the lower left, a
    // cooler haze from the upper right, at a constant strength. A place may only lean it
    // towards its accent; Contact's warm moment warms it.
    const warm = journey ? warmth(journey) : 0
    const accent = journey ? accentOf(journey) : null
    u.uStrength!.value = sceneConfig.light.corners
    const lowerLeft = u.uLowerLeft!.value as Color
    const upperRight = u.uUpperRight!.value as Color
    lowerLeft.copy(sceneColors.violet)
    // Work: charcoal and dark teal round the frame; the purple is one faint, drifting bleed
    // off the upper-right corner.
    {
      const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2
      const work = journey ? ease(journey.toWork) * (1 - ease(journey.toSystem)) : 0
      lowerLeft.lerp(sceneColors.teal, work * 0.65)
      // Lite tier: the same fog, cheaper (two octaves).
      u.uFog!.value = work
      u.uOctaves!.value = useTier.getState().tier === 'lite' ? 2 : 4
      u.uTime!.value = performance.now() / 1000
      // Portrait: the corner bleed would cover half the frame; much weaker there.
      u.uViolet!.value = work * (size.width < size.height ? 0.05 : 0.1)
      // At Work the corner bleeds step back: the light is behind the column instead.
      u.uStrength!.value *= 1 - work * 0.85
      // The backlight follows the column on screen (phones: centred, further back).
      if (work > 0) {
        axis.set(WORK.x, camera.position.y, size.width < 700 ? -2.4 : 0).project(camera)
        ;(u.uBacklightAt!.value as Vector2).set((axis.x + 1) / 2, (axis.y + 1) / 2)
      }
    }
    upperRight.copy(sceneColors.teal).lerp(sceneColors.glass, 0.35)
    if (accent) upperRight.lerp(accent.color, accent.amount)
    // Contact: one soft warm bleed from the upper right; the violet lower left stays.
    upperRight.lerp(sceneColors.warm, warm * 0.85)
    u.uStrength!.value *= 1 + warm * 0.6
    material.current.uniforms.uAspect!.value = size.width / size.height
  })

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
