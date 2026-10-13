import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
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
    fragmentShader: `${noise}\n${frostFragment}`,
    uniforms: {
      uImage: { value: face.image },
      uTitle: { value: face.texture },
      uBrightness: { value: 1 },
      uBlur: { value: 0 },
      uSeed: { value: seed },
      uHaze: { value: new Color().copy(sceneColors.glass).multiplyScalar(0.55) },
    },
    toneMapped: false,
  })
}

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
  const blockGlass = useMemo(() => createBlockGlass(), [])
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
      blockGlass.dispose()
      screens.forEach((screen) => screen.dispose())
      faces.forEach((face) => face.dispose())
    },
    [block, plane, blockGlass, screens, faces],
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
          blockGlass={blockGlass}
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
  blockGlass: MeshPhysicalMaterial
  screen: ShaderMaterial | undefined
  face: CardFace | undefined
}

/** How far a card's own tilt goes (radians): a few degrees, never flat. */
const TILT = { drift: 0.06, cursor: 0.07 }

function Card({ job, index, layout, clock, block, plane, blockGlass, screen, face }: CardProps) {
  const group = useRef<Group>(null)
  const screenMesh = useRef<Mesh>(null)
  // Per-frame state and scratch objects (refs may be mutated in the frame loop).
  const state = useRef({
    focus: 0,
    scrambling: false,
    pointer: { x: 0, y: 0 },
    target: { position: new Vector3(), turn: 0 },
    look: new Quaternion(),
    rest: new Quaternion(),
    tilt: new Quaternion(),
    euler: new Euler(),
    up: new Vector3(0, 1, 0),
  })

  useFrame(({ camera, pointer }, delta) => {
    const g = group.current
    const screenMaterial = screenMesh.current?.material as ShaderMaterial | undefined
    if (!g || !face || !screenMaterial) return
    const { focused, since } = useWork.getState()
    const isFocused = focused === job.slug
    const s = state.current
    const { target } = s
    const dt = Math.min(delta, 1 / 30)
    const ease = 1 - Math.exp(-dt * 5)
    s.focus += ((isFocused ? 1 : 0) - s.focus) * ease
    // The cursor's pull is heavily damped (~0.8s), as everywhere else.
    s.pointer.x += (pointer.x - s.pointer.x) * (1 - Math.exp(-dt * 1.3))
    s.pointer.y += (pointer.y - s.pointer.y) * (1 - Math.exp(-dt * 1.3))

    home(index, layout, target)
    // A slow float, each card on its own phase.
    target.position.y += Math.sin(clock.time * 0.4 + index * 1.7) * 0.05
    g.position.copy(target.position)
    // Focused: comes forward, towards the camera.
    g.position.lerp(camera.position, s.focus * 0.12)

    s.rest.setFromAxisAngle(s.up, target.turn)
    g.lookAt(camera.position)
    s.look.copy(g.quaternion)
    // At rest a card leans most of the way towards the viewer (its face always reads, even
    // round the far side of the spine); focused, it turns fully to face them.
    const facing = layout === 'column' ? 1 : 0.65 + 0.35 * s.focus
    g.quaternion.copy(s.rest).slerp(s.look, facing)
    // Never perfectly flat: a few degrees of slow drift, and a little pull towards the
    // cursor, so the glass thickness and its lit edges always show.
    const t = clock.time
    s.euler.set(
      Math.sin(t * 0.31 + index) * TILT.drift - s.pointer.y * TILT.cursor + 0.05,
      Math.sin(t * 0.23 + index * 2.1) * TILT.drift + s.pointer.x * TILT.cursor - 0.08,
      Math.sin(t * 0.17 + index * 0.7) * 0.015,
    )
    g.quaternion.multiply(s.tilt.setFromEuler(s.euler))
    g.scale.setScalar((layout === 'column' ? COLUMN_SCALE : 1) * (1 + s.focus * 0.06))

    // Depth: the cards swung out to the side sit out of focus, until focused.
    const side = layout === 'orbit' && index % 2 === 1 ? 1 : 0
    screenMaterial.uniforms.uBlur!.value = side * (1 - s.focus)
    screenMaterial.uniforms.uBrightness!.value = 0.8 - side * 0.2 + 0.25 * s.focus

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
  const front = BLOCK.depth / 2 + BLOCK.bevel + 0.002

  return (
    <group
      ref={group}
      onPointerOver={(event) => {
        event.stopPropagation()
        focus(job.slug)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        if (useWork.getState().focused === job.slug) focus(null)
        document.body.style.cursor = ''
      }}
    >
      <mesh geometry={block} material={blockGlass} />
      {screen && <mesh ref={screenMesh} geometry={plane} material={screen} position-z={front} />}
      {layout === 'orbit' && (
        <ChipCluster clusters={EDGE_CHIPS} count={560} size={2} clock={clock} focusDistance={4.8} />
      )}
    </group>
  )
}
