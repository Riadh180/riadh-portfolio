import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BufferGeometry,
  Frustum,
  Matrix4,
  Sphere,
  Color,
  Float32BufferAttribute,
  type PerspectiveCamera,
  type Points,
  Euler,
  ExtrudeGeometry,
  type Group,
  type Mesh,
  MeshPhysicalMaterial,
  ShapeGeometry,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
} from 'three'
import { type Job, jobs } from '@/content/site'
import { SCRAMBLE_DURATION } from '@/lib/scramble'
import { useCursor } from '@/stores/cursor'
import { useJourney } from '@/stores/journey'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useTier } from '@/stores/tier'
import { useWork } from '@/stores/work'
import { sceneColors } from '@/styles/scene'
import { loadAssets } from '../assets'
import { addGlassBody } from '../glass/glassBody'
import { roundedRectShape } from '../hero/bandGeometry'
import frostFragment from '../shaders/frost.frag'
import frostVertex from '../shaders/frost.vert'
import cardDustFragment from '../shaders/cardDust.frag'
import cardDustVertex from '../shaders/cardDust.vert'
import glassGrain from '../shaders/glassGrain.glsl'
import { grainMotion, grainUniforms, keepClear } from '../particles/CursorField'
import { reportOpen } from './openView'
import { MOTION, Spring } from '../motion/motion'
import dissolve from '../shaders/dissolve.glsl'
import noise from '../shaders/noise.glsl'
import srgb from '../shaders/srgb.glsl'
import { type JourneyState, WORK } from '../journey/path'
import { ChipCluster, EDGE_PALETTE } from './Pebbles'
import type { SceneClock } from '../useSceneClock'
import { CardFace } from './cardFace'
import { FrostField } from './frostField'
import { type CardMedia, CardVideo, loopFiles, NO_MEDIA, shown, stepMedia } from './cardMedia'
import { createCardScene } from './cardScenes'
import { APPROACH, COLUMN_SPACING, ORBIT_SPACING, orbitPose } from './layout'

/** Big, like the reference: the nearest card fills ~45% of the screen width. */
export const CARD = { width: 2.4, height: 1.5, radius: 0.1 }
/** A thin glass pane (seg_44): almost no frame, a narrow bevel that catches the light. */
export const BLOCK = { depth: 0.06, bevel: 0.02 }

/**
 * Small bead clouds at each card's edges nearest the column (its left side at the stops),
 * in card space (x, y, z, spread): just outside the left edge and round the lower left
 * corner, a little in front of the glass, clear of the title and the kicker. A bead in front
 * of the edge bends the card's imagery (glassGrain.glsl).
 */
const EDGE_CLOUDS: [number, number, number, number][] = [
  [-CARD.width / 2 - 0.04, 0.28, 0.12, 0.15],
  [-CARD.width / 2 + 0.06, -CARD.height / 2 + 0.06, 0.14, 0.19],
  [-CARD.width / 2 + 0.45, -CARD.height / 2 - 0.02, 0.1, 0.12],
]
const EDGE_BEADS = 300

/**
 * Where the cards sit. `orbit` (desktop): a descending helix round the spine, facing out.
 * `column` (phones): one above the other in front of the spine, facing the camera, for
 * a vertical swipe.
 */
export type CardLayout = 'orbit' | 'column'

/** Phones: smaller cards, so one fits the narrow screen with margin. */
const COLUMN_SCALE = 0.74

declare global {
  interface Window {
    /** Measurement only (scripts/record-work.mjs): each visible card's projected corners, in px. */
    __cardCorners?: Record<string, number[]>
  }
}
const corner = new Vector3()

/** Visits the card's eight box corners, projected to the screen (NDC). */
function projectCorners(
  card: Group,
  camera: PerspectiveCamera,
  visit: (x: number, y: number) => void,
) {
  const halfDepth = BLOCK.depth / 2 + BLOCK.bevel
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        corner.set((x * CARD.width) / 2, (y * CARD.height) / 2, z * halfDepth)
        card.localToWorld(corner).project(camera)
        visit(corner.x, corner.y)
      }
    }
  }
}

/** Writes the card's eight box corners, projected to the screen, for the frame metrics. */
function exportCorners(
  slug: string,
  card: Group,
  camera: PerspectiveCamera,
  width: number,
  height: number,
) {
  const out: number[] = []
  projectCorners(card, camera, (x, y) => out.push(((x + 1) / 2) * width, ((1 - y) / 2) * height))
  window.__cardCorners![slug] = out
}

/**
 * The card's area on the screen (NDC x0, y0, x1, y1): the air keeps it clear, and when the card
 * is open the button that closes it lies over it.
 */
export function cardArea(card: Group, camera: PerspectiveCamera, out: Vector4) {
  out.set(Infinity, Infinity, -Infinity, -Infinity)
  projectCorners(card, camera, (x, y) =>
    out.set(Math.min(out.x, x), Math.min(out.y, y), Math.max(out.z, x), Math.max(out.w, y)),
  )
  return out
}

type Home = { position: Vector3; turn: number; pitch: number; roll: number; face: number }

function home(i: number, layout: CardLayout, target: Home) {
  if (layout === 'column') {
    target.position.set(0, -i * COLUMN_SPACING, 1.25)
    target.turn = target.pitch = target.roll = 0
    target.face = 1
    return
  }
  // Down the spiral: each card near the camera's line of sight at its own stop, in its own
  // pose (layout.ts), its neighbours peeking in above and below.
  const pose = orbitPose(i, jobs.length)
  target.position.set(
    Math.sin(pose.angle) * pose.radius,
    pose.y,
    Math.cos(pose.angle) * pose.radius,
  )
  target.turn = pose.angle
  target.pitch = pose.pitch
  target.roll = pose.roll
  target.face = pose.face
}

/** The card body: one thick rounded glass block with a wide, smooth bevel all round. */
export function createBlock() {
  const geometry = new ExtrudeGeometry(roundedRectShape(CARD.width, CARD.height, CARD.radius), {
    depth: BLOCK.depth,
    bevelEnabled: true,
    bevelThickness: BLOCK.bevel,
    bevelSize: BLOCK.bevel,
    bevelSegments: 8,
    curveSegments: 24,
  })
  geometry.center()
  return geometry
}

/**
 * The block's glass: a dark body that reflects only where the light catches it, so it is
 * lit along its bevelled edges, with The Core's thin-film rainbow and a sparkle where the
 * key light hits a corner. No transmission (six refractive cards would halve the FPS).
 */
export function createBlockGlass() {
  const material = new MeshPhysicalMaterial({
    // Dark, cool glass: its body is lit from inside (glassBody), its faces stay glossy.
    color: new Color().copy(sceneColors.glass).multiplyScalar(0.35),
    metalness: 0.45,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 1,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [180, 420],
    // Work's light is dim: the black glass needs strong reflections to light its edges.
    envMapIntensity: 6,
    // Fades out as the card dissolves (each card has its own instance).
    transparent: true,
  })
  // Edge lines: where the surface turns away from the viewer (the bevel all round), a thin
  // bright line whose hue slides round the card (teal → violet → pink), like light caught
  // in thick cut glass. The flat faces stay dark.
  material.userData.time = { value: 0 }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColors = { value: [sceneColors.glow, sceneColors.violet, sceneColors.pink] }
    shader.uniforms.uTime = material.userData.time
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uRimColors[3];\nuniform float uTime;',
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          float grazing = 1.0 - abs(dot(normal, normalize(vViewPosition)));
          float line = smoothstep(0.45, 0.95, grazing);
          float hue = fract(atan(normal.y, normal.x) / 6.28318 + 0.5);
          vec3 rim = hue < 0.33 ? mix(uRimColors[0], uRimColors[1], hue * 3.0)
            : hue < 0.66 ? mix(uRimColors[1], uRimColors[2], hue * 3.0 - 1.0)
            : mix(uRimColors[2], uRimColors[0], hue * 3.0 - 2.0);
          outgoingLight += mix(vec3(1.0), rim, 0.45) * line * 0.35;
          // A glint travelling round the edge as the card turns.
          float around = atan(normal.y, normal.x);
          float glint = pow(0.5 + 0.5 * sin(around * 2.0 - uTime * 0.9), 60.0);
          outgoingLight += vec3(1.0) * glint * line * 0.4;
        }
        #include <opaque_fragment>`,
      )
  }
  // A thick slab: light held in its body, brightest along its sides and lower edge.
  addGlassBody(material, {
    color: new Color().copy(sceneColors.glass).lerp(sceneColors.teal, 0.25),
    strength: 0.09,
    edge: 0.85,
  })
  return material
}

/** The screen's outline: the block's front face, rounded like it, with 0..1 UVs. */
export function createScreenGeometry() {
  const geometry = new ShapeGeometry(roundedRectShape(CARD.width, CARD.height, CARD.radius), 16)
  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, position.getX(i) / CARD.width + 0.5, position.getY(i) / CARD.height + 0.5)
  }
  return geometry
}

/** The frosted screen: sits on the block's flat front face (inside the bevel). */
export function createScreenMaterial(face: CardFace, field: FrostField, seed: number) {
  return new ShaderMaterial({
    vertexShader: frostVertex,
    fragmentShader: `${noise}\n${dissolve}\n${srgb}\n${frostFragment}`,
    uniforms: {
      // The face until the card's media takes over (stepMedia).
      uImage: { value: face.image },
      uTitle: { value: face.texture },
      uField: { value: field.target.texture },
      uShade: { value: 0 },
      uDecode: { value: 0 },
      uClarity: { value: face.clear ? 1 : 0 },
      uSmoke: { value: 0.42 },
      uBrightness: { value: 1 },
      uBlur: { value: 0 },
      uSeed: { value: seed },
      uHaze: {
        // Smoky slate: the cast glass's own body colour, dark (at_05).
        value: new Color()
          .copy(sceneColors.glass)
          .lerp(sceneColors.teal, 0.45)
          .lerp(sceneColors.bg, 0.68)
          .multiplyScalar(0.035),
      },
      uDissolve: { value: 0 },
      uEdgeGlow: { value: sceneColors.glow },
      uCursor: { value: new Vector2(0.5, 0.5) },
      uHover: { value: 0 },
      uSweep: { value: -1 },
      // A glass wipe across the open pane (the capstone's gallery): -1 = none.
      uWipe: { value: -1 },
      uTime: { value: 0 },
      uPane: { value: [CARD.width, CARD.height, CARD.radius] },
    },
    toneMapped: false,
  })
}

/**
 * Particles a card breaks into: random spots over its face, shared by all cards; a dense
 * stream of beads, as in at_08 (`DUST_SIZE`: their size per px of screen height). Lite draws
 * the first `lite` of them (the integrated GPUs can't afford the full stream).
 */
const DUST_COUNT = 24000
export const DUST = { lite: 14000 }
export const DUST_SIZE = 0.014

export function createDustGeometry() {
  const spots = new Float32Array(DUST_COUNT * 2)
  const seeds = new Float32Array(DUST_COUNT * 4)
  for (let i = 0; i < DUST_COUNT; i++) {
    spots.set([Math.random(), Math.random()], i * 2)
    seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(DUST_COUNT * 3), 3))
  geometry.setAttribute('spot', new Float32BufferAttribute(spots, 2))
  geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 4))
  return geometry
}

export function createDustMaterial(face: CardFace, seed: number) {
  return new ShaderMaterial({
    vertexShader: `${noise}\n${dissolve}\n${grainMotion}\n${srgb}\n${cardDustVertex}`,
    fragmentShader: `${glassGrain}\n${cardDustFragment}`,
    uniforms: {
      // The world's glass grains: the film's hues and the place's light (CursorField).
      uGrainFilm: grainUniforms.uGrainFilm,
      uGrainLightColor: grainUniforms.uGrainLightColor,
      uGrainLightView: grainUniforms.uGrainLightView,
      uGrainScene: grainUniforms.uGrainScene,
      uGrainSceneOn: grainUniforms.uGrainSceneOn,
      uGrainResolution: grainUniforms.uGrainResolution,
      uImage: { value: face.image },
      uDecode: { value: 0 },
      uDissolve: { value: 0 },
      uSeed: { value: seed },
      uSize: { value: [CARD.width, CARD.height] },
      uFront: { value: BLOCK.depth / 2 + BLOCK.bevel },
      uPointScale: { value: 10 },
    },
    transparent: true,
    depthWrite: false,
  })
}

/** 0..1 eased (cosine), clamped. */
const smooth01 = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2

/** Easing for the fly-in: heavy in, heavy out (the site's default curve, roughly). */
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

/** The details column's share of the width (desktop, left) and the margin kept round the card. */
const OPEN = { details: 0.31, margin: 0.025 }

/**
 * Where an opened card sits, in the frame: its height (share of the frame) and its centre
 * (NDC). Desktop: 72% of the frame height, centred in the area right of the details column,
 * smaller where that area isn't wide enough (16:10 screens), so it is never cut by the frame
 * or laid over the details. Phones: 85% of the width, in the upper part, the details below.
 */
export function openFrame(layout: CardLayout, aspect: number) {
  const cardAspect = CARD.width / CARD.height
  if (layout === 'column') return { height: (0.85 * aspect) / cardAspect, x: 0, y: 0.45 }
  const room = 1 - OPEN.details - OPEN.margin
  const height = Math.min(0.72, ((room - OPEN.margin) * aspect) / cardAspect)
  // A touch below centre: the top clears the section indicator under the nav.
  return { height, x: (OPEN.details + room / 2) * 2 - 1, y: -0.02 }
}

/** How long the fly-in and the dissolve take, in seconds (MOTION.md: fly-in ~1s). */
export const TIMING = { fly: 1, dissolve: 0.9 }

/** `journey`: the camera's state on the site (the labs have none). */
type Props = { layout: CardLayout; clock: SceneClock; journey?: JourneyState }

/**
 * Lite tier: while the camera rushes down the column (a fast scroll, faster than this in world
 * units per second) the live scenes inside the frost hold still, which no one can see as the
 * cards fly past; an open card always plays. A card-to-card step stays well under it.
 */
const RUSH = 3

/**
 * The job cards: glass cards with a screen inside showing the job's cover (or a
 * placeholder) and its title, "COMPANY · metric". Hover or keyboard focus (shared with the
 * HTML list through the work store) turns a card towards the viewer, brings it forward,
 * brightens it and scrambles its title until it resolves.
 */
export function WorkCards({ layout, clock, journey }: Props) {
  const block = useMemo(() => createBlock(), [])
  const plane = useMemo(() => createScreenGeometry(), [])
  const dust = useMemo(() => createDustGeometry(), [])
  const faces = useMemo(() => jobs.map((job, i) => new CardFace(job, i)), [])
  const fields = useMemo(() => jobs.map((_, i) => new FrostField(i * 1.37)), [])
  const screens = useMemo(
    () => faces.map((face, i) => createScreenMaterial(face, fields[i]!, i * 1.37)),
    [faces, fields],
  )
  const gl = useThree((state) => state.gl)
  // What each card shows, once /assets.json says what exists: its video loop (its poster on
  // the face until the loop plays), its cover, or, for confidential work without a loop, its
  // live scene (an original abstract scene in the site's style).
  const [media, setMedia] = useState<CardMedia[]>(() => jobs.map(() => NO_MEDIA))
  useEffect(() => {
    let cancelled = false
    void loadAssets().then(({ work, loops }) => {
      if (cancelled) return
      setMedia(
        jobs.map((job, i) => {
          if (loops.includes(job.slug)) {
            faces[i]?.setCover(loopFiles(job.slug).poster, null)
            return { video: new CardVideo(job.slug), live: null }
          }
          const cover = work[job.slug]
          if (cover) {
            faces[i]?.setCover(cover)
            return NO_MEDIA
          }
          const live = createCardScene(job.slug)
          if (live) void live.precompile(gl)
          return { video: null, live }
        }),
      )
    })
    return () => {
      cancelled = true
    }
  }, [faces, gl])
  useEffect(
    () => () =>
      media.forEach(({ video, live }) => {
        video?.dispose()
        live?.dispose()
      }),
    [media],
  )
  // The reliefs bake inside the render loop (once each), where the renderer's state is
  // settled; baked from a mount effect the first card could come out blank.
  // Each live scene also renders once here, one per frame: its first render allocates its
  // render target and the GPU pipeline, which otherwise lands mid-scroll as a dropped frame
  // when the card first comes into view.
  const warmed = useRef(0)
  useEffect(() => {
    warmed.current = 0
  }, [media])
  useFrame(() => {
    fields.forEach((field) => field.bake(gl))
    if (warmed.current < media.length) media[warmed.current++]?.live?.render(gl, 0)
  }, -1)
  useEffect(
    () => () => {
      block.dispose()
      plane.dispose()
      dust.dispose()
      screens.forEach((screen) => screen.dispose())
      faces.forEach((face) => face.dispose())
      fields.forEach((field) => field.dispose())
    },
    [block, plane, dust, screens, faces, fields],
  )

  return (
    <group>
      {jobs.map((job, i) => (
        <Card
          key={job.slug}
          job={job}
          index={i}
          layout={layout}
          clock={clock}
          journey={journey}
          block={block}
          plane={plane}
          dust={dust}
          screen={screens[i]}
          face={faces[i]}
          media={media[i] ?? NO_MEDIA}
        />
      ))}
    </group>
  )
}

type CardProps = {
  job: Job
  index: number
  layout: CardLayout
  clock: SceneClock
  journey?: JourneyState
  block: ExtrudeGeometry
  plane: ShapeGeometry
  dust: BufferGeometry
  screen: ShaderMaterial | undefined
  face: CardFace | undefined
  /** What the card shows under its frost (its loop, its live scene, or its face). */
  media: CardMedia
}

/** How far a card's own tilt goes (radians): a few degrees, never flat. */
const TILT = { drift: 0.06, cursor: 0.12 }

function Card({
  job,
  index,
  layout,
  clock,
  journey,
  block,
  plane,
  dust,
  screen,
  face,
  media,
}: CardProps) {
  const group = useRef<Group>(null)
  const screenMesh = useRef<Mesh>(null)
  const blockMesh = useRef<Mesh>(null)
  const dustPoints = useRef<Points>(null)
  const edgeClouds = useRef<Group>(null)
  const blockGlass = useMemo(() => createBlockGlass(), [])
  const dustMaterial = useMemo(
    () => (face ? createDustMaterial(face, index * 1.37) : null),
    [face, index],
  )
  useEffect(
    () => () => {
      blockGlass.dispose()
      dustMaterial?.dispose()
    },
    [blockGlass, dustMaterial],
  )
  // Leaving: the air no longer keeps this card's area clear.
  useEffect(() => () => keepClear(job.slug, null), [job.slug])
  const calm = useReducedMotion()
  // Per-frame state and scratch objects (refs may be mutated in the frame loop).
  const state = useRef({
    focus: 0,
    others: 0,
    outside: 0,
    /** 0 at home → 1 flown in front of the camera. */
    fly: 0,
    /** 0 whole → 1 dissolved → 2 dust drifted away. */
    dissolve: 0,
    scrambling: false,
    /** The card's screen area while it's in focus (kept clear by the air). */
    area: new Vector4(),
    /** Flown in: its distance from the camera (the backdrop stands behind it). */
    openDistance: 0,
    pointer: { x: 0, y: 0 },
    /** The cursor's pull: the shared pointer spring (the camera's own parallax lag). */
    pull: { x: new Spring(0, MOTION.pointer), y: new Spring(0, MOTION.pointer) },
    target: { position: new Vector3(), turn: 0, pitch: 0, roll: 0, face: 1 } as Home,
    open: new Vector3(),
    /** The camera, in the cards' own space (they live inside the Work place's group). */
    eye: new Vector3(),
    forward: new Vector3(),
    right: new Vector3(),
    lift: new Vector3(),
    look: new Quaternion(),
    rest: new Quaternion(),
    screen: new Quaternion(),
    tilt: new Quaternion(),
    euler: new Euler(),
    up: new Vector3(0, 1, 0),
    frustum: new Frustum(),
    projection: new Matrix4(),
    /** The card's bounds, for the visibility test. */
    bounds: new Sphere(new Vector3(), 1.6),
    frame: 0,
    hover: 0,
    /** The cursor on the pane (uv), from pointer moves over it. */
    cursorUv: new Vector2(0.5, 0.5),
  })

  useFrame(({ camera, pointer, size, viewport, gl }, delta) => {
    const g = group.current
    const screenMaterial = screenMesh.current?.material as ShaderMaterial | undefined
    const glass = blockMesh.current?.material as MeshPhysicalMaterial | undefined
    const dustShader = dustPoints.current?.material as ShaderMaterial | undefined
    if (!g || !face || !screenMaterial || !glass || !dustShader) return
    const { focused, since, opened, filter } = useWork.getState()
    const isFocused = focused === job.slug
    const isOpen = opened === job.slug
    const s = state.current
    const { target } = s
    const dt = Math.min(delta, 1 / 30)
    const ease = 1 - Math.exp(-dt * 5)
    s.focus += ((isFocused || isOpen ? 1 : 0) - s.focus) * ease
    s.others += ((opened && !isOpen ? 1 : 0) - s.others) * ease
    // Outside the active filter: the card recedes (dimmer, softer) until the filter clears.
    const outside = filter !== null && !job.filters.includes(filter) && !isFocused && !isOpen
    s.outside += ((outside ? 1 : 0) - s.outside) * ease
    // The cursor's pull: ~0.8–1s before the card leans, the camera's own spring (one voice).
    s.pointer.x = s.pull.x.step(pointer.x, dt)
    s.pointer.y = s.pull.y.step(pointer.y, dt)

    // Open: fly in, then dissolve. Close: re-form first, then fly home.
    if (isOpen) {
      s.fly = Math.min(1, s.fly + dt / TIMING.fly)
      if (s.fly > 0.85) s.dissolve = Math.min(2, s.dissolve + dt / TIMING.dissolve)
    } else {
      s.dissolve = Math.max(0, s.dissolve - (dt / TIMING.dissolve) * 1.6)
      if (s.dissolve < 0.15) s.fly = Math.max(0, s.fly - dt / TIMING.fly)
    }
    // Reduced motion: no fly-in or dissolve; the card simply is open, or home.
    if (calm) {
      s.fly = isOpen ? 1 : 0
      s.dissolve = isOpen ? 2 : 0
    }
    const flown = easeInOut(s.fly)
    const scale = layout === 'column' ? COLUMN_SCALE : 1

    s.eye.copy(camera.position)
    g.parent?.worldToLocal(s.eye)

    home(index, layout, target)
    // A slow float, each card on its own phase.
    target.position.y += Math.sin(clock.time * 0.4 + index * 1.7) * 0.05
    g.position.copy(target.position)
    // At its stop the card comes forward, in front of its neighbours (the camera holds its
    // distance): the gallery shows the cards round it at the edges and behind the column.
    const stop = (useJourney.getState().progress - 2) * (jobs.length - 1)
    const nearStop = layout === 'orbit' ? smooth01(1 - Math.abs(stop - index) / APPROACH.width) : 0
    g.position.lerp(s.eye, APPROACH.share * nearStop * (1 - flown))
    // Focused: comes forward, towards the camera.
    g.position.lerp(s.eye, s.focus * 0.12 * (1 - flown))

    // Flown in: square to the screen in front of the camera (desktop: centred right of the
    // details column; phones: across the width, above the details), see openFrame.
    if (flown > 0) {
      camera.getWorldDirection(s.forward)
      s.right.crossVectors(s.forward, s.up).normalize()
      s.lift.crossVectors(s.right, s.forward).normalize()
      const perspective = camera as PerspectiveCamera
      const tan = Math.tan((perspective.fov * Math.PI) / 360)
      const frame = openFrame(layout, perspective.aspect)
      const distance = (CARD.height * scale) / (frame.height * 2 * tan)
      s.open
        .copy(camera.position)
        .addScaledVector(s.forward, distance)
        .addScaledVector(s.right, frame.x * distance * tan * perspective.aspect)
        .addScaledVector(s.lift, frame.y * distance * tan)
      g.parent?.worldToLocal(s.open)
      g.position.lerp(s.open, flown)
      s.openDistance = distance
    }

    s.rest.setFromAxisAngle(s.up, target.turn)
    g.lookAt(camera.position)
    s.look.copy(g.quaternion)
    // Open: square to the screen (it faces the viewer head on, no keystone): the camera's own
    // orientation, in the cards' space.
    if (flown > 0 && g.parent) {
      g.parent.getWorldQuaternion(s.screen).invert().multiply(camera.quaternion)
      s.look.slerp(s.screen, flown)
    }
    // At rest a card leans its own way towards the viewer (some most of the way, some kept
    // turned along the spiral so their side walls show); focused or open, it turns fully.
    // The card at the camera's stop leans a little towards it.
    const atStop = layout === 'orbit' ? Math.max(0, 1 - Math.abs(stop - index) / 0.45) : 0
    const facing = target.face + (1 - target.face) * Math.max(s.focus, flown, atStop * 0.45)
    g.quaternion.copy(s.rest).slerp(s.look, facing)
    // Never perfectly flat: a few degrees of slow drift, and a little pull towards the
    // cursor, so the glass thickness and its lit edges always show.
    const t = clock.time
    s.euler.set(
      Math.sin(t * 0.31 + index) * TILT.drift - s.pointer.y * TILT.cursor + target.pitch,
      Math.sin(t * 0.23 + index * 2.1) * TILT.drift + s.pointer.x * TILT.cursor - 0.08,
      Math.sin(t * 0.17 + index * 0.7) * 0.015 + target.roll,
    )
    // Open: almost still (a couple of degrees at most), the card calm in front of the viewer.
    s.euler.x *= 1 - flown * 0.85
    s.euler.y *= 1 - flown * 0.85
    s.euler.z *= 1 - flown * 0.85
    g.quaternion.multiply(s.tilt.setFromEuler(s.euler))
    g.scale.setScalar(scale * (1 + s.focus * 0.06 * (1 - flown)))

    // Depth: the cards swung out to the side sit out of focus, until focused; while
    // another card is open, the rest recede into the dark.
    // Cards away from the camera's height drift out of focus (depth of field).
    // Phones: the cards above and below the focused one are only hints (dimmer, smaller).
    const side =
      layout === 'orbit'
        ? Math.min(1, Math.max(0, Math.abs(target.position.y - s.eye.y) / ORBIT_SPACING - 0.35))
        : Math.min(1, Math.abs(target.position.y - (s.eye.y + 0.6)) / COLUMN_SPACING)
    if (layout === 'column') g.scale.multiplyScalar(1 - side * 0.3 * (1 - flown))
    const u = screenMaterial.uniforms
    u.uBlur!.value = Math.max(side * (1 - s.focus), s.others * 0.8, s.outside * 0.6)
    u.uBrightness!.value =
      (1.05 - side * 0.2 + 0.2 * s.focus) * (1 - s.others * 0.65) * (1 - s.outside * 0.6)
    // Passing right by the lens between stops (not flown in): fade, so a card never
    // sweeps the frame as a flat wash of colour.
    const near =
      flown > 0 ? 1 : Math.min(1, Math.max(0, (g.position.distanceTo(s.eye) - 1.6) / 1.4))
    u.uBrightness!.value *= near
    u.uDissolve!.value = Math.min(1, s.dissolve)
    ;(glass.userData.time as { value: number }).value = clock.time
    u.uTime!.value = clock.time
    s.hover += ((isFocused && !isOpen ? 1 : 0) - s.hover) * ease
    u.uHover!.value = s.hover
    ;(u.uCursor!.value as Vector2).lerp(s.cursorUv, ease)
    u.uSweep!.value = s.dissolve > 1 ? -0.3 + (s.dissolve - 1) * 2.4 : -1
    // The edge clouds stay with the card at home, not when it flies in.
    if (edgeClouds.current) edgeClouds.current.visible = flown < 0.02 && s.dissolve < 0.02
    // The thick glass block breaks away with the frost.
    glass.opacity = (1 - Math.min(1, s.dissolve * 1.2)) * near
    glass.visible = glass.opacity > 0.01
    dustShader.uniforms.uDissolve!.value = s.dissolve
    dustShader.uniforms.uPointScale!.value = size.height * viewport.dpr * DUST_SIZE
    dustPoints.current!.visible = s.dissolve > 0
    dustPoints.current!.geometry.setDrawRange(
      0,
      useTier.getState().tier === 'lite' ? DUST.lite : Infinity,
    )

    // The card's media plays only while the card can be seen (in the frame, and not while
    // another card is open or once this one, at home, has broken away completely). At rest it
    // takes a new frame every other frame (staggered between cards): inside the frost the
    // difference doesn't show, and it halves the cost; focused or open, every frame.
    s.frame++
    const lite = useTier.getState().tier === 'lite'
    const rushing = lite && !!journey && Math.abs(journey.velocity) > RUSH
    const due = isOpen || (!rushing && (isFocused || (s.frame + index) % (lite ? 3 : 2) === 0))
    // Lite tier: the frost's cheaper variant and plain glossy glass for the block (no
    // thin film or clear coat), compiled once, on the switch.
    if (lite && !screenMaterial.defines.LITE) {
      screenMaterial.defines = { ...screenMaterial.defines, LITE: '' }
      screenMaterial.needsUpdate = true
      glass.iridescence = 0
      glass.clearcoat = 0
    }
    let seen = shown(g) && s.others < 0.95 && (isOpen || s.dissolve < 1.6)
    if (seen) {
      s.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      s.frustum.setFromProjectionMatrix(s.projection)
      g.getWorldPosition(s.bounds.center)
      seen = s.frustum.intersectsSphere(s.bounds)
    }
    stepMedia(media, face, [screenMaterial, dustShader], {
      gl,
      time: clock.time,
      seen,
      due,
      small: lite || layout === 'column',
      still: calm,
    })

    // The card in focus (hovered, open or at the camera's stop): the air never pushes grains
    // onto its face. Flown in, its area also places the HTML button that closes it, and the
    // scene behind it falls back into smoke (OpenBackdrop).
    const inFocus = (isFocused || isOpen || nearStop > 0.5) && shown(g)
    const area = inFocus || flown > 0 ? cardArea(g, camera as PerspectiveCamera, s.area) : null
    keepClear(job.slug, inFocus ? area : null)
    reportOpen(job.slug, flown, s.openDistance, g, s.area)

    if (window.__cardCorners) {
      // The open card too: its glass block has broken away, its screen is what shows.
      if ((glass.visible || isOpen) && shown(g)) {
        exportCorners(job.slug, g, camera as PerspectiveCamera, size.width, size.height)
      } else delete window.__cardCorners[job.slug]
    }

    // Scramble the title for its duration after the card gains focus.
    const elapsed = (performance.now() - since) / 1000
    if (isFocused && elapsed < SCRAMBLE_DURATION + 0.1) {
      face.draw(elapsed)
      s.scrambling = true
    } else if (s.scrambling) {
      face.draw(Infinity)
      s.scrambling = false
    }
  })

  const focus = useWork((state) => state.focus)
  const open = useWork((state) => state.open)
  const front = BLOCK.depth / 2 + BLOCK.bevel + 0.002

  return (
    <group
      ref={group}
      onPointerMove={(event) => {
        if (event.uv) state.current.cursorUv.copy(event.uv)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (useWork.getState().opened) return
        focus(job.slug)
        document.body.style.cursor = 'pointer'
        useCursor.getState().setScene('open')
      }}
      onPointerOut={() => {
        if (useWork.getState().focused === job.slug && !useWork.getState().opened) focus(null)
        document.body.style.cursor = ''
        useCursor.getState().leave('open')
      }}
      onClick={(event) => {
        event.stopPropagation()
        if (!useWork.getState().opened) open(job.slug)
      }}
    >
      <mesh ref={blockMesh} geometry={block} material={blockGlass} />
      {screen && <mesh ref={screenMesh} geometry={plane} material={screen} position-z={front} />}
      {layout === 'orbit' && (
        <group ref={edgeClouds}>
          <ChipCluster
            clusters={EDGE_CLOUDS}
            count={EDGE_BEADS}
            size={2.1}
            clock={clock}
            focusDistance={WORK.distance - WORK.dolly - 2}
            palette={EDGE_PALETTE}
          />
        </group>
      )}
      {dustMaterial && (
        // Not interactive: no raycasting (24k points per card would be tested on every
        // pointer / wheel event that reaches the card's handlers).
        <points
          ref={dustPoints}
          geometry={dust}
          material={dustMaterial}
          frustumCulled={false}
          raycast={() => null}
        />
      )}
    </group>
  )
}
