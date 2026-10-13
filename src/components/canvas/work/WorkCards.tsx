import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  type BufferGeometry,
  Color,
  ExtrudeGeometry,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three'
import { type Job, jobs } from '@/content/site'
import { SCRAMBLE_DURATION } from '@/lib/scramble'
import { useWork } from '@/stores/work'
import { sceneColors, sceneConfig } from '@/styles/scene'
import { loadAssets } from '../assets'
import { createBandGeometry, roundedRectCurve, roundedRectShape } from '../hero/bandGeometry'
import { createGlassMaterial, disposeGlassMaterial } from '../hero/glassMaterial'
import type { SceneClock } from '../useSceneClock'
import { CardFace } from './cardFace'

/** Big, like the reference: the nearest card fills ~45% of the screen width. */
const CARD = { width: 2.4, height: 1.5, depth: 0.05, radius: 0.18 }
/** The cut-glass frame round each card: a thick bevelled band in The Core's glass. */
const FRAME = { width: 0.1, depth: 0.14, chamfer: 0.04, innerChamfer: 0.016 }

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

/** The thick cut-glass frame: The Core's bevelled band, swept round the card's outline. */
function createFrame() {
  return createBandGeometry(
    roundedRectCurve(
      CARD.width + FRAME.width * 0.4,
      CARD.height + FRAME.width * 0.4,
      CARD.radius + 0.04,
    ),
    { ...FRAME, segments: 360 },
  )
}

/** A thin glass pane over the screen: rounded rectangle, bevelled edges catching the light. */
function createSlab() {
  const geometry = new ExtrudeGeometry(roundedRectShape(CARD.width, CARD.height, CARD.radius), {
    depth: CARD.depth - 0.03,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3,
    curveSegments: 12,
  })
  geometry.center()
  return geometry
}

function createGlass() {
  // Dark, clear-coated glass over the screen: reflections and edges, the face shows through.
  return new MeshPhysicalMaterial({
    color: new Color().copy(sceneColors.bg),
    metalness: 0,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 0.5,
    iridescenceIOR: 1.3,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    envMapIntensity: 1.4,
  })
}

type Props = { layout: CardLayout; clock: SceneClock }

/**
 * The job cards: glass cards with a screen inside showing the job's cover (or a
 * placeholder) and its title, "COMPANY · metric". Hover or keyboard focus (shared with the
 * HTML list through the work store) turns a card towards the viewer, brings it forward,
 * brightens it and scrambles its title until it resolves.
 */
export function WorkCards({ layout, clock }: Props) {
  const slab = useMemo(() => createSlab(), [])
  const plane = useMemo(() => new PlaneGeometry(CARD.width * 0.96, CARD.height * 0.94), [])
  const glass = useMemo(() => createGlass(), [])
  const frame = useMemo(() => createFrame(), [])
  // The Core's glass: bevel lines, sparkle and rainbow film; a faint rim glow keeps the
  // edges lit under Work's darker light. Without transmission: the frames are thin, so
  // reflections carry the look, and a refractive pass for six cards would halve the FPS.
  const frameGlass = useMemo(() => {
    const material = createGlassMaterial({ ...sceneConfig.glass, rim: 0.22, transmission: 0 })
    // Black body: without transmission a white one would scatter light like plastic.
    material.color.setScalar(0)
    return material
  }, [])
  const faces = useMemo(() => jobs.map((job, i) => new CardFace(job, i)), [])
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
      slab.dispose()
      plane.dispose()
      glass.dispose()
      frame.dispose()
      disposeGlassMaterial(frameGlass)
      faces.forEach((face) => face.dispose())
    },
    [slab, plane, glass, frame, frameGlass, faces],
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
          slab={slab}
          plane={plane}
          glass={glass}
          frame={frame}
          frameGlass={frameGlass}
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
  slab: ExtrudeGeometry
  plane: PlaneGeometry
  glass: MeshPhysicalMaterial
  frame: BufferGeometry
  frameGlass: MeshPhysicalMaterial
  face: CardFace | undefined
}

function Card({
  job,
  index,
  layout,
  clock,
  slab,
  plane,
  glass,
  frame,
  frameGlass,
  face,
}: CardProps) {
  const group = useRef<Group>(null)
  const screen = useRef<Mesh>(null)
  // Per-frame state and scratch objects (refs may be mutated in the frame loop).
  const state = useRef({
    focus: 0,
    scrambling: false,
    target: { position: new Vector3(), turn: 0 },
    look: new Quaternion(),
    rest: new Quaternion(),
    up: new Vector3(0, 1, 0),
  })

  useFrame(({ camera }, delta) => {
    const g = group.current
    if (!g || !face) return
    const { focused, since } = useWork.getState()
    const isFocused = focused === job.slug
    const s = state.current
    const { target } = s
    const ease = 1 - Math.exp(-Math.min(delta, 1 / 30) * 5)
    s.focus += ((isFocused ? 1 : 0) - s.focus) * ease

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
    g.scale.setScalar((layout === 'column' ? COLUMN_SCALE : 1) * (1 + s.focus * 0.06))

    const material = screen.current?.material as MeshBasicMaterial | undefined
    material?.color.setScalar(0.75 + 0.25 * s.focus)

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
      <mesh ref={screen} geometry={plane} position-z={0}>
        <meshBasicMaterial map={face?.texture} toneMapped={false} />
      </mesh>
      <mesh geometry={slab} material={glass} renderOrder={1} />
      <mesh geometry={frame} material={frameGlass} />
    </group>
  )
}
