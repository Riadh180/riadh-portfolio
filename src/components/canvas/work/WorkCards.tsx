import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferGeometry,
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
  Vector3,
} from 'three'
import { type Job, jobs } from '@/content/site'
import { SCRAMBLE_DURATION } from '@/lib/scramble'
import { useWork } from '@/stores/work'
import { sceneColors } from '@/styles/scene'
import { loadAssets } from '../assets'
import { roundedRectShape } from '../hero/bandGeometry'
import frostFragment from '../shaders/frost.frag'
import frostVertex from '../shaders/frost.vert'
import cardDustFragment from '../shaders/cardDust.frag'
import cardDustVertex from '../shaders/cardDust.vert'
import dissolve from '../shaders/dissolve.glsl'
import noise from '../shaders/noise.glsl'
import type { SceneClock } from '../useSceneClock'
import { CardFace } from './cardFace'
import { ChipCluster } from './Pebbles'

/** Big, like the reference: the nearest card fills ~45% of the screen width. */
const CARD = { width: 2.4, height: 1.5, radius: 0.2 }
/** One heavy glass block: thick, with a wide bevel that catches the light along its edges. */
const BLOCK = { depth: 0.1, bevel: 0.06 }

/**
 * Where the cards sit. `orbit` (desktop): a descending helix round the spine, facing out.
 * `column` (phones): one above the other in front of the spine, facing the camera, for
 * a vertical swipe.
 */
export type CardLayout = 'orbit' | 'column'

export const COLUMN_SPACING = 1.4
/** Phones: smaller cards, so one fits the narrow screen with margin. */
const COLUMN_SCALE = 0.62
/** Vertical distance between cards in the orbit. */
export const ORBIT_SPACING = 2.1

function home(i: number, layout: CardLayout, target: { position: Vector3; turn: number }) {
  if (layout === 'column') {
    target.position.set(0, -i * COLUMN_SPACING, 1.25)
    target.turn = 0
    return
  }
  // Down the column: every other card hangs centred in front of the spine, big (~45% of
  // the screen width), overlapping it; the ones between swing out to the right, turned
  // away and partly off-screen. Nothing ever crosses the UI column on the left.
  const angle = i % 2 === 0 ? 0.04 : 0.95
  const radius = 3
  target.position.set(Math.sin(angle) * radius, 1.6 - i * ORBIT_SPACING, Math.cos(angle) * radius)
  target.turn = angle
}

/** The card body: one thick rounded glass block with a wide, smooth bevel all round. */
function createBlock() {
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
function createBlockGlass() {
  const material = new MeshPhysicalMaterial({
    color: new Color(0, 0, 0),
    metalness: 0.6,
    roughness: 0.06,
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
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColors = { value: [sceneColors.glow, sceneColors.violet, sceneColors.pink] }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColors[3];')
      .replace(
        '#include <opaque_fragment>',
        `{
          float grazing = 1.0 - abs(dot(normal, normalize(vViewPosition)));
          float line = smoothstep(0.45, 0.95, grazing);
          float hue = fract(atan(normal.y, normal.x) / 6.28318 + 0.5);
          vec3 rim = hue < 0.33 ? mix(uRimColors[0], uRimColors[1], hue * 3.0)
            : hue < 0.66 ? mix(uRimColors[1], uRimColors[2], hue * 3.0 - 1.0)
            : mix(uRimColors[2], uRimColors[0], hue * 3.0 - 2.0);
          outgoingLight += mix(vec3(1.0), rim, 0.55) * line * 0.9;
        }
        #include <opaque_fragment>`,
      )
  }
  return material
}

/** The screen's outline: the block's front face, rounded like it, with 0..1 UVs. */
function createScreenGeometry() {
  const geometry = new ShapeGeometry(roundedRectShape(CARD.width, CARD.height, CARD.radius), 16)
  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, position.getX(i) / CARD.width + 0.5, position.getY(i) / CARD.height + 0.5)
  }
  return geometry
}

/** The frosted screen: sits on the block's flat front face (inside the bevel). */
function createScreenMaterial(face: CardFace, seed: number) {
  return new ShaderMaterial({
    vertexShader: frostVertex,
    fragmentShader: `${noise}\n${dissolve}\n${frostFragment}`,
    uniforms: {
      uImage: { value: face.image },
      uTitle: { value: face.texture },
      uBrightness: { value: 1 },
      uBlur: { value: 0 },
      uSeed: { value: seed },
      uHaze: { value: new Color().copy(sceneColors.glass).multiplyScalar(0.55) },
      uDissolve: { value: 0 },
      uEdgeGlow: { value: sceneColors.glow },
    },
    toneMapped: false,
  })
}

/** Particles a card breaks into: random spots over its face, shared by all cards. */
const DUST_COUNT = 14000

function createDustGeometry() {
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

function createDustMaterial(face: CardFace, seed: number) {
  return new ShaderMaterial({
    vertexShader: `${noise}\n${dissolve}\n${cardDustVertex}`,
    fragmentShader: cardDustFragment,
    uniforms: {
      uImage: { value: face.image },
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

/** Easing for the fly-in: heavy in, heavy out (the site's default curve, roughly). */
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

/** How long the fly-in and the dissolve take, in seconds (MOTION.md: fly-in ~1s). */
const OPEN = { fly: 1, dissolve: 0.9 }

/** Chips gathered at a card's edges, in its own space: [x, y, z, spread]. */
const EDGE_CHIPS: [number, number, number, number][] = [
  [-CARD.width / 2 - 0.02, -CARD.height / 2 + 0.2, 0.3, 0.32],
  [CARD.width / 2 + 0.02, CARD.height / 2 - 0.12, 0.28, 0.26],
  [CARD.width * 0.22, -CARD.height / 2 - 0.04, 0.32, 0.22],
]

type Props = { layout: CardLayout; clock: SceneClock }

/**
 * The job cards: glass cards with a screen inside showing the job's cover (or a
 * placeholder) and its title, "COMPANY · metric". Hover or keyboard focus (shared with the
 * HTML list through the work store) turns a card towards the viewer, brings it forward,
 * brightens it and scrambles its title until it resolves.
 */
export function WorkCards({ layout, clock }: Props) {
  const block = useMemo(() => createBlock(), [])
  const plane = useMemo(() => createScreenGeometry(), [])
  const dust = useMemo(() => createDustGeometry(), [])
  const faces = useMemo(() => jobs.map((job, i) => new CardFace(job, i)), [])
  const screens = useMemo(
    () => faces.map((face, i) => createScreenMaterial(face, i * 1.37)),
    [faces],
  )
  useEffect(() => {
    void loadAssets().then(({ work }) => {
      jobs.forEach((job, i) => {
        const cover = work[job.slug]
        if (cover) faces[i]?.setCover(cover)
      })
    })
  }, [faces])
  useEffect(
    () => () => {
      block.dispose()
      plane.dispose()
      dust.dispose()
      screens.forEach((screen) => screen.dispose())
      faces.forEach((face) => face.dispose())
    },
    [block, plane, dust, screens, faces],
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
          block={block}
          plane={plane}
          dust={dust}
          screen={screens[i]}
          face={faces[i]}
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
  block: ExtrudeGeometry
  plane: ShapeGeometry
  dust: BufferGeometry
  screen: ShaderMaterial | undefined
  face: CardFace | undefined
}

/** How far a card's own tilt goes (radians): a few degrees, never flat. */
const TILT = { drift: 0.06, cursor: 0.07 }

function Card({ job, index, layout, clock, block, plane, dust, screen, face }: CardProps) {
  const group = useRef<Group>(null)
  const screenMesh = useRef<Mesh>(null)
  const blockMesh = useRef<Mesh>(null)
  const dustPoints = useRef<Points>(null)
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
  // Per-frame state and scratch objects (refs may be mutated in the frame loop).
  const state = useRef({
    focus: 0,
    others: 0,
    /** 0 at home → 1 flown in front of the camera. */
    fly: 0,
    /** 0 whole → 1 dissolved → 2 dust drifted away. */
    dissolve: 0,
    scrambling: false,
    pointer: { x: 0, y: 0 },
    target: { position: new Vector3(), turn: 0 },
    open: new Vector3(),
    forward: new Vector3(),
    right: new Vector3(),
    look: new Quaternion(),
    rest: new Quaternion(),
    tilt: new Quaternion(),
    euler: new Euler(),
    up: new Vector3(0, 1, 0),
  })

  useFrame(({ camera, pointer, size, viewport }, delta) => {
    const g = group.current
    const screenMaterial = screenMesh.current?.material as ShaderMaterial | undefined
    const glass = blockMesh.current?.material as MeshPhysicalMaterial | undefined
    const dustShader = dustPoints.current?.material as ShaderMaterial | undefined
    if (!g || !face || !screenMaterial || !glass || !dustShader) return
    const { focused, since, opened } = useWork.getState()
    const isFocused = focused === job.slug
    const isOpen = opened === job.slug
    const s = state.current
    const { target } = s
    const dt = Math.min(delta, 1 / 30)
    const ease = 1 - Math.exp(-dt * 5)
    s.focus += ((isFocused || isOpen ? 1 : 0) - s.focus) * ease
    s.others += ((opened && !isOpen ? 1 : 0) - s.others) * ease
    // The cursor's pull is heavily damped (~0.8s), as everywhere else.
    s.pointer.x += (pointer.x - s.pointer.x) * (1 - Math.exp(-dt * 1.3))
    s.pointer.y += (pointer.y - s.pointer.y) * (1 - Math.exp(-dt * 1.3))

    // Open: fly in, then dissolve. Close: re-form first, then fly home.
    if (isOpen) {
      s.fly = Math.min(1, s.fly + dt / OPEN.fly)
      if (s.fly > 0.85) s.dissolve = Math.min(2, s.dissolve + dt / OPEN.dissolve)
    } else {
      s.dissolve = Math.max(0, s.dissolve - (dt / OPEN.dissolve) * 1.6)
      if (s.dissolve < 0.15) s.fly = Math.max(0, s.fly - dt / OPEN.fly)
    }
    const flown = easeInOut(s.fly)

    home(index, layout, target)
    // A slow float, each card on its own phase.
    target.position.y += Math.sin(clock.time * 0.4 + index * 1.7) * 0.05
    g.position.copy(target.position)
    // Focused: comes forward, towards the camera.
    g.position.lerp(camera.position, s.focus * 0.12 * (1 - flown))

    // Flown in: centred in front of the camera, a little right of centre (the details
    // appear at the left), big enough to fill most of the view.
    if (flown > 0) {
      camera.getWorldDirection(s.forward)
      s.right.crossVectors(s.forward, s.up).normalize()
      // Big and sharp: ~57% of the screen width, centred right of the middle, leaving the
      // left for the details (MOTION.md / at_08).
      const perspective = camera as PerspectiveCamera
      const tan = Math.tan((perspective.fov * Math.PI) / 360)
      const distance = CARD.width / (0.57 * 2 * tan * perspective.aspect)
      const halfWidth = distance * tan * perspective.aspect
      s.open
        .copy(camera.position)
        .addScaledVector(s.forward, distance)
        .addScaledVector(s.right, halfWidth * 0.2)
      g.position.lerp(s.open, flown)
    }

    s.rest.setFromAxisAngle(s.up, target.turn)
    g.lookAt(camera.position)
    s.look.copy(g.quaternion)
    // At rest a card leans most of the way towards the viewer (its face always reads, even
    // round the far side of the spine); focused or open, it turns fully to face them.
    const facing = layout === 'column' ? 1 : 0.65 + 0.35 * Math.max(s.focus, flown)
    g.quaternion.copy(s.rest).slerp(s.look, facing)
    // Never perfectly flat: a few degrees of slow drift, and a little pull towards the
    // cursor, so the glass thickness and its lit edges always show.
    const t = clock.time
    s.euler.set(
      Math.sin(t * 0.31 + index) * TILT.drift - s.pointer.y * TILT.cursor + 0.05,
      Math.sin(t * 0.23 + index * 2.1) * TILT.drift + s.pointer.x * TILT.cursor - 0.08,
      Math.sin(t * 0.17 + index * 0.7) * 0.015,
    )
    s.euler.x *= 1 - flown * 0.6
    s.euler.y *= 1 - flown * 0.6
    g.quaternion.multiply(s.tilt.setFromEuler(s.euler))
    g.scale.setScalar((layout === 'column' ? COLUMN_SCALE : 1) * (1 + s.focus * 0.06 * (1 - flown)))

    // Depth: the cards swung out to the side sit out of focus, until focused; while
    // another card is open, the rest recede into the dark.
    const side = layout === 'orbit' && index % 2 === 1 ? 1 : 0
    const u = screenMaterial.uniforms
    u.uBlur!.value = Math.max(side * (1 - s.focus), s.others * 0.8)
    u.uBrightness!.value = (0.8 - side * 0.2 + 0.25 * s.focus) * (1 - s.others * 0.65)
    u.uDissolve!.value = Math.min(1, s.dissolve)
    // The thick glass block breaks away with the frost.
    glass.opacity = 1 - Math.min(1, s.dissolve * 1.2)
    glass.visible = glass.opacity > 0.01
    dustShader.uniforms.uDissolve!.value = s.dissolve
    dustShader.uniforms.uPointScale!.value = size.height * viewport.dpr * 0.012
    dustPoints.current!.visible = s.dissolve > 0

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
      onPointerOver={(event) => {
        event.stopPropagation()
        if (useWork.getState().opened) return
        focus(job.slug)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        if (useWork.getState().focused === job.slug && !useWork.getState().opened) focus(null)
        document.body.style.cursor = ''
      }}
      onClick={(event) => {
        event.stopPropagation()
        if (!useWork.getState().opened) open(job.slug)
      }}
    >
      <mesh ref={blockMesh} geometry={block} material={blockGlass} />
      {screen && <mesh ref={screenMesh} geometry={plane} material={screen} position-z={front} />}
      {dustMaterial && (
        <points ref={dustPoints} geometry={dust} material={dustMaterial} frustumCulled={false} />
      )}
      {layout === 'orbit' && (
        <ChipCluster clusters={EDGE_CHIPS} count={560} size={2} clock={clock} focusDistance={4.8} />
      )}
    </group>
  )
}
