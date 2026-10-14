import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferGeometry,
  Frustum,
  Matrix4,
  Sphere,
  type Texture,
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
import { useCursor } from '@/stores/cursor'
import { useWork } from '@/stores/work'
import { sceneColors } from '@/styles/scene'
import { loadAssets } from '../assets'
import { addGlassBody } from '../glass/glassBody'
import { roundedRectShape } from '../hero/bandGeometry'
import frostFragment from '../shaders/frost.frag'
import frostVertex from '../shaders/frost.vert'
import cardDustFragment from '../shaders/cardDust.frag'
import cardDustVertex from '../shaders/cardDust.vert'
import dissolve from '../shaders/dissolve.glsl'
import noise from '../shaders/noise.glsl'
import type { SceneClock } from '../useSceneClock'
import { CardFace } from './cardFace'
import { type CardScene, createCardScene } from './cardScenes'
import { COLUMN_SPACING, ORBIT_SPACING, orbitPose } from './layout'
import { ChipCluster } from './Pebbles'

/** Big, like the reference: the nearest card fills ~45% of the screen width. */
export const CARD = { width: 2.4, height: 1.5, radius: 0.2 }
/** One heavy glass block: thick, with a wide bevel that catches the light along its edges. */
export const BLOCK = { depth: 0.24, bevel: 0.08 }

/**
 * Where the cards sit. `orbit` (desktop): a descending helix round the spine, facing out.
 * `column` (phones): one above the other in front of the spine, facing the camera, for
 * a vertical swipe.
 */
export type CardLayout = 'orbit' | 'column'

/** Phones: smaller cards, so one fits the narrow screen with margin. */
const COLUMN_SCALE = 0.62

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
    color: new Color().copy(sceneColors.bg).multiplyScalar(0.6),
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
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColors = { value: [sceneColors.glow, sceneColors.violet, sceneColors.pink] }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColors[3];')
      .replace(
        '#include <opaque_fragment>',
        `{
          float grazing = 1.0 - abs(dot(normal, normalize(vViewPosition)));
          float line = smoothstep(0.62, 0.97, grazing);
          float hue = fract(atan(normal.y, normal.x) / 6.28318 + 0.5);
          vec3 rim = hue < 0.33 ? mix(uRimColors[0], uRimColors[1], hue * 3.0)
            : hue < 0.66 ? mix(uRimColors[1], uRimColors[2], hue * 3.0 - 1.0)
            : mix(uRimColors[2], uRimColors[0], hue * 3.0 - 2.0);
          outgoingLight += mix(vec3(1.0), rim, 0.55) * line * 0.7;
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
export function createScreenMaterial(face: CardFace, seed: number, live?: Texture) {
  return new ShaderMaterial({
    vertexShader: frostVertex,
    fragmentShader: `${noise}\n${dissolve}\n${frostFragment}`,
    uniforms: {
      uImage: { value: live ?? face.image },
      uTitle: { value: face.texture },
      uShade: { value: live ? 1 : 0 },
      uBrightness: { value: 1 },
      uBlur: { value: 0 },
      uSeed: { value: seed },
      uHaze: {
        // Milky grey-green: the cast glass's own body colour (at_05).
        value: new Color()
          .copy(sceneColors.glass)
          .lerp(sceneColors.emerald, 0.2)
          .lerp(sceneColors.bg, 0.68)
          .multiplyScalar(0.6),
      },
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

function createDustMaterial(face: CardFace, seed: number, live?: Texture) {
  return new ShaderMaterial({
    vertexShader: `${noise}\n${dissolve}\n${cardDustVertex}`,
    fragmentShader: cardDustFragment,
    uniforms: {
      uImage: { value: live ?? face.image },
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
  // Confidential work (and Freelance): a live scene in the card instead of an image.
  const scenes = useMemo(() => jobs.map((job) => createCardScene(job.slug)), [])
  const screens = useMemo(
    () => faces.map((face, i) => createScreenMaterial(face, i * 1.37, scenes[i]?.target.texture)),
    [faces, scenes],
  )
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    scenes.forEach((scene) => void scene?.precompile(gl))
  }, [scenes, gl])
  useEffect(() => {
    void loadAssets().then(({ work }) => {
      jobs.forEach((job, i) => {
        const cover = work[job.slug]
        if (cover && !scenes[i]) faces[i]?.setCover(cover)
      })
    })
  }, [faces, scenes])
  useEffect(
    () => () => {
      block.dispose()
      plane.dispose()
      dust.dispose()
      screens.forEach((screen) => screen.dispose())
      faces.forEach((face) => face.dispose())
      scenes.forEach((scene) => scene?.dispose())
    },
    [block, plane, dust, screens, faces, scenes],
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
          live={scenes[i] ?? null}
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
  /** The card's live scene, rendered into its screen while the card is in view. */
  live: CardScene | null
}

/** Whether an object and all its parents are visible. */
function shown(object: { visible: boolean; parent: unknown } | null): boolean {
  let node = object as { visible: boolean; parent: unknown } | null
  while (node) {
    if (!node.visible) return false
    node = node.parent as typeof node
  }
  return true
}

/** How far a card's own tilt goes (radians): a few degrees, never flat. */
const TILT = { drift: 0.06, cursor: 0.07 }

function Card({ job, index, layout, clock, block, plane, dust, screen, face, live }: CardProps) {
  const group = useRef<Group>(null)
  const screenMesh = useRef<Mesh>(null)
  const blockMesh = useRef<Mesh>(null)
  const dustPoints = useRef<Points>(null)
  const chips = useRef<Group>(null)
  const blockGlass = useMemo(() => createBlockGlass(), [])
  const dustMaterial = useMemo(
    () => (face ? createDustMaterial(face, index * 1.37, live?.target.texture) : null),
    [face, index, live],
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
    outside: 0,
    /** 0 at home → 1 flown in front of the camera. */
    fly: 0,
    /** 0 whole → 1 dissolved → 2 dust drifted away. */
    dissolve: 0,
    scrambling: false,
    pointer: { x: 0, y: 0 },
    target: { position: new Vector3(), turn: 0, pitch: 0, roll: 0, face: 1 } as Home,
    open: new Vector3(),
    /** The camera, in the cards' own space (they live inside the Work place's group). */
    eye: new Vector3(),
    forward: new Vector3(),
    right: new Vector3(),
    lift: new Vector3(),
    look: new Quaternion(),
    rest: new Quaternion(),
    tilt: new Quaternion(),
    euler: new Euler(),
    up: new Vector3(0, 1, 0),
    frustum: new Frustum(),
    projection: new Matrix4(),
    /** The card's bounds, for the visibility test. */
    bounds: new Sphere(new Vector3(), 1.6),
    frame: 0,
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
    const scale = layout === 'column' ? COLUMN_SCALE : 1

    s.eye.copy(camera.position)
    g.parent?.worldToLocal(s.eye)

    home(index, layout, target)
    // A slow float, each card on its own phase.
    target.position.y += Math.sin(clock.time * 0.4 + index * 1.7) * 0.05
    g.position.copy(target.position)
    // Focused: comes forward, towards the camera.
    g.position.lerp(s.eye, s.focus * 0.12 * (1 - flown))

    // Flown in: centred in front of the camera, a little right of centre (the details
    // appear at the left), big enough to fill most of the view.
    if (flown > 0) {
      camera.getWorldDirection(s.forward)
      s.right.crossVectors(s.forward, s.up).normalize()
      // Big and sharp: ~57% of the screen width, centred right of the middle, leaving the
      // left for the details (at_08). Phones: ~85% wide in the top third, above them.
      const perspective = camera as PerspectiveCamera
      const tan = Math.tan((perspective.fov * Math.PI) / 360)
      const share = layout === 'column' ? 0.85 : 0.57
      const distance = (CARD.width * scale) / (share * 2 * tan * perspective.aspect)
      const halfWidth = distance * tan * perspective.aspect
      const halfHeight = distance * tan
      s.lift.crossVectors(s.right, s.forward).normalize()
      s.open
        .copy(camera.position)
        .addScaledVector(s.forward, distance)
        .addScaledVector(s.right, layout === 'column' ? 0 : halfWidth * 0.2)
        .addScaledVector(s.lift, layout === 'column' ? halfHeight * 0.45 : 0)
      g.parent?.worldToLocal(s.open)
      g.position.lerp(s.open, flown)
    }

    s.rest.setFromAxisAngle(s.up, target.turn)
    g.lookAt(camera.position)
    s.look.copy(g.quaternion)
    // At rest a card leans its own way towards the viewer (some most of the way, some kept
    // turned along the spiral so their side walls show); focused or open, it turns fully.
    const facing = target.face + (1 - target.face) * Math.max(s.focus, flown)
    g.quaternion.copy(s.rest).slerp(s.look, facing)
    // Never perfectly flat: a few degrees of slow drift, and a little pull towards the
    // cursor, so the glass thickness and its lit edges always show.
    const t = clock.time
    s.euler.set(
      Math.sin(t * 0.31 + index) * TILT.drift - s.pointer.y * TILT.cursor + target.pitch,
      Math.sin(t * 0.23 + index * 2.1) * TILT.drift + s.pointer.x * TILT.cursor - 0.08,
      Math.sin(t * 0.17 + index * 0.7) * 0.015 + target.roll,
    )
    s.euler.x *= 1 - flown * 0.6
    s.euler.y *= 1 - flown * 0.6
    g.quaternion.multiply(s.tilt.setFromEuler(s.euler))
    g.scale.setScalar(scale * (1 + s.focus * 0.06 * (1 - flown)))

    // Depth: the cards swung out to the side sit out of focus, until focused; while
    // another card is open, the rest recede into the dark.
    // Cards away from the camera's height drift out of focus (depth of field).
    const side =
      layout === 'orbit'
        ? Math.min(1, Math.max(0, Math.abs(target.position.y - s.eye.y) / ORBIT_SPACING - 0.35))
        : 0
    const u = screenMaterial.uniforms
    u.uBlur!.value = Math.max(side * (1 - s.focus), s.others * 0.8, s.outside * 0.6)
    u.uBrightness!.value =
      (0.8 - side * 0.2 + 0.25 * s.focus) * (1 - s.others * 0.65) * (1 - s.outside * 0.6)
    u.uDissolve!.value = Math.min(1, s.dissolve)
    // The thick glass block breaks away with the frost.
    glass.opacity = 1 - Math.min(1, s.dissolve * 1.2)
    glass.visible = glass.opacity > 0.01
    dustShader.uniforms.uDissolve!.value = s.dissolve
    dustShader.uniforms.uPointScale!.value = size.height * viewport.dpr * 0.012
    dustPoints.current!.visible = s.dissolve > 0
    // Open, the card's own chips step aside (they would sit on the details).
    if (chips.current) chips.current.visible = flown < 0.3

    // The live scene renders only while its card can be seen (and not while another card
    // is open, or once this one has broken away completely).
    // At rest it updates every other frame (staggered between cards): inside the frost the
    // difference doesn't show, and it halves the cost; focused or open, every frame.
    s.frame++
    const due = isFocused || isOpen || (s.frame + index) % 2 === 0
    if (live && due && shown(g) && s.others < 0.95 && s.dissolve < 1.6) {
      s.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      s.frustum.setFromProjectionMatrix(s.projection)
      g.getWorldPosition(s.bounds.center)
      if (s.frustum.intersectsSphere(s.bounds)) {
        live.render(gl, clock.time)
      }
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
      {dustMaterial && (
        <points ref={dustPoints} geometry={dust} material={dustMaterial} frustumCulled={false} />
      )}
      {layout === 'orbit' && (
        <group ref={chips}>
          <ChipCluster
            clusters={EDGE_CHIPS}
            count={560}
            size={2}
            clock={clock}
            focusDistance={4.8}
          />
        </group>
      )}
    </group>
  )
}
