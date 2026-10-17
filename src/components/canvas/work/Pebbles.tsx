import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  type Color,
  type ShaderMaterial,
  Vector3,
} from 'three'
import { useTier } from '@/stores/tier'
import { sceneColors, sceneConfig } from '@/styles/scene'
import { jobs } from '@/content/site'
import { WORK } from '../journey/path'
import { hash } from '../noise'
import { ORBIT_FIRST, ORBIT_SPACING, orbitPose, SPIRAL } from './layout'
import { grainMotion, grainUniforms, syncGrainTier } from '../particles/CursorField'
import glitterFragment from '../shaders/glitter.frag'
import glitterVertex from '../shaders/glitter.vert'
import glassGrain from '../shaders/glassGrain.glsl'
import type { SceneClock } from '../useSceneClock'

/** The glass grains' shaders: the shared grain look and motion round the glitter's own. */
export const GLITTER_SHADERS = {
  vertexShader: `${grainMotion}\n${glitterVertex}`,
  fragmentShader: `${glassGrain}\n${glitterFragment}`,
}
const { vertexShader, fragmentShader } = GLITTER_SHADERS

/**
 * Glitter points: per-grain orbit / cloud / seed (positions come from the shader), and the
 * pocket beads' own colours (`tint`, the pockets only).
 */
function chipGeometry(
  orbit: Float32Array,
  cloud: Float32Array,
  seed: Float32Array,
  count: number,
  tint?: Float32Array,
) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('orbit', new Float32BufferAttribute(orbit, 4))
  geometry.setAttribute('cloud', new Float32BufferAttribute(cloud, 4))
  geometry.setAttribute('seed', new Float32BufferAttribute(seed, 4))
  if (tint) geometry.setAttribute('tint', new Float32BufferAttribute(tint, 3))
  return geometry
}

/** One pocket of grains: centre, spread and its mix of hues (an index into MIXES). */
type Pocket = { x: number; y: number; z: number; spread: number; mix: number }

/** A hue at about the same luminance as the others, so no hue outshines the rest. */
const evened = (color: Color) => {
  const luminance = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b
  return color.clone().multiplyScalar(Math.sqrt(0.3 / luminance))
}
/**
 * The pockets' hues; the violet leans a touch towards pink and the pink towards violet (the
 * reference's beads are blue-violet and purple, rarely magenta).
 */
const POCKET_HUES = {
  teal: evened(sceneColors.teal),
  blue: evened(sceneColors.blue),
  violet: evened(sceneColors.violet.clone().lerp(sceneColors.pink, 0.15)),
  pink: evened(sceneColors.pink.clone().lerp(sceneColors.violet, 0.35)),
  gold: evened(sceneColors.warm),
}
type Hue = keyof typeof POCKET_HUES
/**
 * The pockets' mixes, as in the reference's clouds (several hues side by side in each): 3–4
 * hues in uneven shares, the first dominant (~50%) so the pockets still differ; leaning
 * violet / blue, a little gold.
 */
const MIXES: Partial<Record<Hue, number>>[] = [
  { violet: 0.5, blue: 0.25, pink: 0.15, teal: 0.1 },
  { blue: 0.5, violet: 0.3, teal: 0.15, gold: 0.05 },
  { teal: 0.5, violet: 0.25, blue: 0.2, gold: 0.05 },
  { violet: 0.5, teal: 0.2, blue: 0.2, pink: 0.1 },
  { pink: 0.45, violet: 0.3, blue: 0.2, gold: 0.05 },
  { violet: 0.5, blue: 0.3, teal: 0.15, gold: 0.05 },
]

/** A pocket bead's colour: one of its pocket's hues, by their shares. */
function pocketHue(mix: number) {
  const shares = Object.entries(MIXES[mix % MIXES.length]!) as [Hue, number][]
  let r = Math.random()
  for (const [hue, share] of shares) {
    r -= share
    if (r < 0) return POCKET_HUES[hue]
  }
  return POCKET_HUES[shares[0]![0]]
}

/** Camera angle round the column at Work height `y` (the stops are spread down the spiral). */
const cameraAngle = (y: number) =>
  Math.min(1, Math.max(0, (ORBIT_FIRST - y) / (ORBIT_SPACING * (jobs.length - 1)))) * SPIRAL

/** Distance from point p to the segment a–b. */
function toSegment(p: Vector3, a: Vector3, b: Vector3) {
  const ab = b.clone().sub(a)
  const t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq()))
  return p.distanceTo(a.clone().addScaledVector(ab, t))
}

/**
 * Desktop: 20 foam pockets, 2–3× the old ones. Most wrap the column at every height and
 * side (on its surface and just off it, so the camera sees some in front of it and some
 * behind as it turns); a few hang between the camera and the column between the stops (out
 * of focus there). None sits between a card and the camera at the card's stop: candidates
 * that would cover a card's face are pushed round the column.
 */
function orbitPockets(): Pocket[] {
  const pockets: Pocket[] = []
  const eye = new Vector3()
  const card = new Vector3()
  const at = new Vector3()
  const clearsCards = (pocket: Pocket) => {
    at.set(pocket.x, pocket.y, pocket.z)
    for (let i = 0; i < jobs.length; i++) {
      const pose = orbitPose(i, jobs.length)
      const stop = (i / (jobs.length - 1)) * SPIRAL
      const distance = WORK.distance - WORK.dolly
      eye.set(Math.sin(stop) * distance, pose.y, Math.cos(stop) * distance)
      card.set(Math.sin(pose.angle) * pose.radius, pose.y, Math.cos(pose.angle) * pose.radius)
      if (toSegment(at, card, eye) < pocket.spread + 1.1) return false
    }
    return true
  }
  const place = (y: number, angle: number, reach: number, spread: number, mix: number) => {
    for (let tries = 0; tries < 12; tries++) {
      const a = angle + tries * 0.55
      const pocket = { x: Math.sin(a) * reach, y, z: Math.cos(a) * reach, spread, mix }
      if (clearsCards(pocket)) {
        pockets.push(pocket)
        return
      }
    }
  }
  // Wrapping the column: 16, every ~0.9 units down, alternating sides and depths.
  for (let k = 0; k < 16; k++) {
    const y = 4.2 - k * 0.92 + (hash(k, 31, 3) - 0.5) * 0.5
    const side = k * 2.4 + hash(k, 32, 3) * 1.2
    const reach = 1.25 + hash(k, 33, 3) * 0.6
    place(y, cameraAngle(y) + side, reach, 0.8 + hash(k, 34, 3) * 0.4, k)
  }
  // In front, between the stops: the camera passes through them (bokeh on full).
  for (let k = 0; k < 4; k++) {
    const y = ORBIT_FIRST - (k + 0.5) * ORBIT_SPACING * 1.25
    place(y, cameraAngle(y) + (k % 2 ? 0.35 : -0.35), 3.3, 0.9, k + 2)
  }
  return pockets
}

/** Phones: three pockets round the column, between the cards (column space, see WorkPlace). */
const COLUMN_POCKETS: Pocket[] = [
  { x: 1.3, y: 0.3, z: 0.4, spread: 0.8, mix: 0 },
  { x: -1.3, y: -4.5, z: 0.4, spread: 0.8, mix: 1 },
  { x: 1.2, y: -9.3, z: 0.4, spread: 0.8, mix: 2 },
]

/**
 * ~90% of the grains in the pockets (dense at the core, thinning out, a few strays trailing
 * into wisps), ~10% as a sparse silver dust: half round the column, half spread wide between
 * the cards, so no flat empty band shows between the stops. Each grain gets its orbit (angle,
 * reach, start height, speed), its pocket (or none), a seed and, in a pocket, one of the
 * pocket's hues. Phones get fewer grains (three pockets).
 */
function createPebbles(layout: Layout) {
  const count =
    layout === 'column' ? Math.round(sceneConfig.pebbles.count * 0.25) : sceneConfig.pebbles.count
  const halfHeight = sceneConfig.spine.height / 2
  const pockets = layout === 'column' ? COLUMN_POCKETS : orbitPockets()
  const orbit = new Float32Array(count * 4)
  const cloud = new Float32Array(count * 4)
  const seed = new Float32Array(count * 4)
  const tint = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const inPocket = Math.random() < 0.9
    const pocket = pockets[i % pockets.length]
    if (inPocket && pocket) {
      // Dense at the core, thinning towards the edge; 6% stray further out (the wisps, see
      // glitter.vert), so the dark between pockets stays clean.
      const stray = Math.random() < 0.06
      orbit.set(
        [
          Math.random() * Math.PI * 2,
          stray ? 0.8 + Math.random() * 0.9 : Math.random() ** 1.4,
          Math.random() * 6,
          0.5 + Math.random() * 0.5,
        ],
        i * 4,
      )
      cloud.set([pocket.x, pocket.y, pocket.z, pocket.spread], i * 4)
      seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
      const hue = pocketHue(pocket.mix)
      tint.set([hue.r, hue.g, hue.b], i * 3)
    } else {
      // Sparse silver dust: half round the column, half wide between the cards.
      const wide = Math.random() < 0.5
      orbit.set(
        [
          Math.random() * Math.PI * 2,
          wide ? 1.4 + Math.random() * 1.6 : 0.9 + Math.random() ** 2 * 0.6,
          (Math.random() * 2 - 1) * halfHeight,
          0.9 + Math.random() * 0.2,
        ],
        i * 4,
      )
      cloud.set([0, 0, 0, 0], i * 4)
      seed.set([Math.random(), Math.random() * 0.6, Math.random(), Math.random()], i * 4)
    }
  }
  return chipGeometry(orbit, cloud, seed, count, tint)
}

/** Muted glitter: silver-lilac dust, violet/pink, teal and a little gold (the column dust). */
const GLITTER = [
  sceneColors.glass.clone().lerp(sceneColors.violet, 0.45),
  sceneColors.violet.clone().lerp(sceneColors.pink, 0.4),
  sceneColors.teal.clone(),
  sceneColors.emerald.clone().lerp(sceneColors.warm, 0.6),
]

/** World size of a tiny grain at the focus (1–2 px at 1×). */
const GRAIN = 0.011
/**
 * Pocket grains: a touch larger than the column dust (they sit close to the camera's path),
 * so a pocket holds many tiny points, small glass chips and a few larger ones.
 */
const POCKET_SCALE = 2.1

/**
 * `cloudScale`: how much bigger the pocket grains are than the column dust (the spine's
 * foam reads as visible discs); `saturation`: how much colour the grains keep.
 */
export function createGlitterUniforms(
  focusDistance: number,
  palette?: Color[],
  cloudScale = 1,
  saturation = 0.55,
) {
  return {
    ...grainUniforms,
    uCloudScale: { value: cloudScale },
    uSaturation: { value: saturation },
    uTime: { value: 0 },
    uSize: { value: 0 },
    uViewportHeight: { value: 900 },
    uBokeh: { value: 1 },
    uBrightness: { value: 1 },
    uRadius: { value: 1 },
    uRise: { value: 0 },
    uHalfHeight: { value: sceneConfig.spine.height / 2 },
    uFocusDistance: { value: focusDistance },
    uPalette: { value: palette ?? GLITTER },
  }
}

export function updateGlitter(
  material: ShaderMaterial | null,
  clock: SceneClock,
  viewportHeight: number,
  scale = 1,
) {
  if (!material) return
  syncGrainTier(material)
  const { brightness, radius, rise } = sceneConfig.pebbles
  const u = material.uniforms
  u.uTime!.value = clock.time
  u.uSize!.value = GRAIN * scale
  u.uViewportHeight!.value = viewportHeight
  // Bokeh on the full tier only.
  u.uBokeh!.value = useTier.getState().tier === 'lite' ? 0 : 1
  u.uBrightness!.value = brightness
  u.uRadius!.value = radius
  u.uRise!.value = rise
}

type Layout = 'orbit' | 'column'
const POCKET_DEFINES = { POCKET_HUES: '' }
type Props = { clock: SceneClock; focusDistance: number; layout?: Layout }

/**
 * Glitter round the spine: mostly tiny, dim, muted grains that twinkle now and then, a
 * few small and medium ones, a handful of faceted sparks; in loose layered clouds dense at
 * the spine and wispy outside. Points moved in the vertex shader: one draw call.
 */
export function Pebbles({ clock, focusDistance, layout = 'orbit' }: Props) {
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => createPebbles(layout), [layout])
  const uniforms = useMemo(
    () => createGlitterUniforms(focusDistance, undefined, POCKET_SCALE, 1),
    [focusDistance],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ size, viewport }) => {
    updateGlitter(material.current, clock, size.height * viewport.dpr)
    // Lite tier: half the grains (every pocket keeps its share).
    const lite = useTier.getState().tier === 'lite'
    geometry.setDrawRange(0, lite ? Math.floor(geometry.getAttribute('seed').count / 2) : Infinity)
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        defines={POCKET_DEFINES}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

/**
 * A few chips clustered round a job card's edges, in the card's own space (so they move
 * with it): small clouds at the given points, [x, y, z, spread]. Same chips as round the
 * spine, same shader.
 */
export function ChipCluster({
  clusters,
  count,
  size = 1,
  clock,
  focusDistance,
  palette,
}: {
  clusters: [number, number, number, number][]
  count: number
  /** Chip size relative to the spine's chips. */
  size?: number
  clock: SceneClock
  focusDistance: number
  /** Four tints (default: silver-lilac, violet/pink, teal, gold). */
  palette?: Color[]
}) {
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => createCluster(clusters, count), [clusters, count])
  const uniforms = useMemo(
    () => createGlitterUniforms(focusDistance, palette),
    [focusDistance, palette],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame((state) =>
    updateGlitter(material.current, clock, state.size.height * state.viewport.dpr, size),
  )
  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

export function createCluster(clusters: [number, number, number, number][], count: number) {
  const orbit = new Float32Array(count * 4)
  const cloud = new Float32Array(count * 4)
  const seed = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    orbit.set(
      [
        Math.random() * Math.PI * 2,
        0.15 + Math.random(),
        Math.random() * 6,
        0.4 + Math.random() * 0.5,
      ],
      i * 4,
    )
    cloud.set(clusters[i % clusters.length] ?? [0, 0, 0, 0.1], i * 4)
    seed.set([Math.random() * 0.7, Math.random(), Math.random(), Math.random()], i * 4)
  }
  return chipGeometry(orbit, cloud, seed, count)
}
