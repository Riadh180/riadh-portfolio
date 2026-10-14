import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Object3D,
  ShaderMaterial,
} from 'three'
import { sceneColors } from '@/styles/scene'
import fragmentShader from '../shaders/atmosphere.frag'
import vertexShader from '../shaders/atmosphere.vert'
import type { SceneClock } from '../useSceneClock'
import type { JourneyState } from './path'

/**
 * The layers round the subject. Foreground: a few large discs close to the lens, far out
 * of focus, drifting past as the camera moves. Mid: clouds of small, vivid bokeh between
 * the camera and the subject (at_05: clustered, never evenly spread). Background: many
 * tiny motes deep in the haze, so there is always distance behind the subject.
 */
const LAYERS = {
  fore: {
    count: 200,
    box: 7,
    near: 0.9,
    far: 3.6,
    size: 0.02,
    aperture: 9,
    maxSize: 110,
    opacity: 0.8,
    drift: 1,
    clusters: 0,
  },
  mid: {
    count: 1800,
    box: 14,
    near: 2.4,
    far: 7.5,
    size: 0.028,
    aperture: 1.6,
    maxSize: 24,
    opacity: 1.1,
    drift: 1.5,
    clusters: 22,
  },
  back: {
    count: 2600,
    box: 64,
    near: 13,
    far: 34,
    size: 0.05,
    aperture: 0.4,
    maxSize: 6,
    opacity: 1,
    drift: 3,
    clusters: 0,
  },
}

type Layer = (typeof LAYERS)[keyof typeof LAYERS]

/** Seeds in the unit cube: spread evenly, or gathered into `clusters` loose clouds. */
function createGeometry(count: number, clusters: number) {
  const seeds = new Float32Array(count * 4)
  const centres = Array.from({ length: clusters }, () => [
    Math.random(),
    Math.random(),
    Math.random(),
  ])
  for (let i = 0; i < count; i++) {
    const centre = centres[i % Math.max(1, clusters)]
    for (let axis = 0; axis < 3; axis++) {
      // A cloud: a gaussian-ish scatter round its centre (sum of randoms), wrapped.
      const scatter = (Math.random() + Math.random() + Math.random() - 1.5) * 0.07
      seeds[i * 4 + axis] = centre ? ((((centre[axis] ?? 0) + scatter) % 1) + 1) % 1 : Math.random()
    }
    seeds[i * 4 + 3] = clusters ? (i % clusters) / clusters + Math.random() * 0.15 : Math.random()
  }
  const geometry = new BufferGeometry()
  // Positions come from the seeds in the shader; the attribute only sets the count.
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 4))
  return geometry
}

function createMaterial(layer: Layer) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uBox: { value: layer.box },
      uNear: { value: layer.near },
      uFar: { value: layer.far },
      uSize: { value: layer.size },
      uAperture: { value: layer.aperture },
      uFocus: { value: 8 },
      uMaxSize: { value: layer.maxSize },
      uViewportHeight: { value: 900 },
      uOpacity: { value: layer.opacity },
      uDrift: { value: layer.drift },
      uColors: {
        value: [sceneColors.violet, sceneColors.teal, sceneColors.pink, sceneColors.glow],
      },
      uAccent: { value: new Color() },
      uAccentAmount: { value: 0.3 },
      uTextZone: { value: [-0.3, -2] },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2

/**
 * Each place's accent (CLAUDE.md: teal hero, violet Work, blue System, emerald Depth, warm
 * Contact) and how present the foreground is there: sparse at the hero, which stays the
 * calmest frame.
 */
function placeLook(journey: JourneyState, accent: Color) {
  const work = ease(journey.toWork)
  const system = ease(journey.toSystem)
  const depth = ease(journey.toDepth)
  const contact = ease(journey.toContact) * (1 - ease(journey.loop))
  accent
    .copy(sceneColors.teal)
    .lerp(sceneColors.violet, work)
    .lerp(sceneColors.blue, system)
    .lerp(sceneColors.emerald, depth)
    .lerp(sceneColors.warm, contact * 0.6)
  const fore = 0.35 + 0.65 * Math.max(ease(journey.camera), work) * (1 - contact * 0.4)
  return fore
}

/** Foreground and background atmosphere, in every frame of the journey. */
export function Atmosphere({ journey, clock }: { journey: JourneyState; clock: SceneClock }) {
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const layers = useMemo(
    () =>
      (Object.keys(LAYERS) as (keyof typeof LAYERS)[]).map((key) => ({
        key,
        layer: LAYERS[key],
        geometry: createGeometry(LAYERS[key].count, LAYERS[key].clusters),
        material: createMaterial(LAYERS[key]),
      })),
    [],
  )
  useEffect(
    () => () =>
      layers.forEach(({ geometry, material }) => {
        geometry.dispose()
        material.dispose()
      }),
    [layers],
  )

  const points = useRef<(Object3D | null)[]>([])

  useFrame(() => {
    layers.forEach(({ key, layer }, i) => {
      const material = (points.current[i] as { material?: ShaderMaterial } | null)?.material
      if (!material) return
      const u = material.uniforms
      const presence = placeLook(journey, u.uAccent!.value as Color)
      u.uTime!.value = clock.time
      u.uViewportHeight!.value = size.height * dpr
      u.uMaxSize!.value = layer.maxSize * dpr
      // The subject sits at the camera's orbit distance: that's the focus.
      u.uFocus!.value = journey.distance
      // Desktop: the left column; phones: the lower part of the screen.
      u.uTextZone!.value = size.width < 700 ? [-2, -0.15] : [-0.3, -2]
      u.uOpacity!.value = layer.opacity * (key === 'back' ? 1 : presence)
    })
  })

  return (
    <>
      {layers.map(({ key, geometry, material }, i) => (
        <points
          key={key}
          ref={(node) => {
            points.current[i] = node
          }}
          geometry={geometry}
          material={material}
          frustumCulled={false}
        />
      ))}
    </>
  )
}
