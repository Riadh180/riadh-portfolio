import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  type Group,
  type InstancedMesh,
  Matrix4,
  type Mesh,
  type MeshPhysicalMaterial as PhysicalMaterial,
  MeshPhysicalMaterial,
  OctahedronGeometry,
  type PerspectiveCamera,
  type Points,
  Quaternion,
  Vector2,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  AdditiveBlending,
  Euler,
  type ShaderMaterial,
} from 'three'
import { capstone } from '@/content/site'
import { useCursor } from '@/stores/cursor'
import { useWork } from '@/stores/work'
import { depthPalette } from './depthPalette'
import { loadAssets } from '../assets'
import { MOTION, Spring } from '../motion/motion'
import edgeFragment from '../shaders/skillEdge.frag'
import edgeVertex from '../shaders/skillEdge.vert'
import type { SceneClock } from '../useSceneClock'
import { CardFace } from '../work/cardFace'
import {
  BLOCK,
  CARD,
  createBlock,
  createBlockGlass,
  createDustGeometry,
  createDustMaterial,
  createScreenGeometry,
  createScreenMaterial,
  easeInOut,
  openFrame,
  TIMING,
} from '../work/WorkCards'
import { FrostField } from '../work/frostField'

/** Where the panel hangs in Depth's space; the data roots converge on it. */
export const PANEL = new Vector3(2.3, -1.4, -2.5)

/** A sparse cubic lattice round the panel: node positions and the edges between them. */
function createLattice() {
  const nodes: Vector3[] = []
  for (let x = -3; x <= 3; x++) {
    for (let y = -2; y <= 2; y++) {
      for (let z = -2; z <= 1; z++) {
        // Hollow round the panel, sparser further out.
        const r = Math.hypot(x / 3, y / 2, (z + 0.5) / 1.5)
        if (r < 0.62 || Math.random() > 0.75 - r * 0.3) continue
        nodes.push(new Vector3(x * 0.95, y * 0.85, z * 0.9).add(PANEL))
      }
    }
  }
  const positions: number[] = []
  const along: number[] = []
  const colors: number[] = []
  const phases: number[] = []
  const lit: number[] = []
  const color = depthPalette.gem
  nodes.forEach((a, i) => {
    nodes.forEach((b, j) => {
      if (j <= i || a.distanceTo(b) > 1.0 || Math.random() > 0.7) return
      for (const t of [0, 1]) {
        positions.push(...a.clone().lerp(b, t).toArray())
        along.push(t)
        colors.push(color.r * 0.7, color.g * 0.7, color.b * 0.7)
        phases.push(Math.random())
        lit.push(0)
      }
    })
  })
  const edges = new BufferGeometry()
  edges.setAttribute('position', new Float32BufferAttribute(positions, 3))
  edges.setAttribute('along', new Float32BufferAttribute(along, 1))
  edges.setAttribute('color', new Float32BufferAttribute(colors, 3))
  edges.setAttribute('phase', new Float32BufferAttribute(phases, 1))
  edges.setAttribute('lit', new Float32BufferAttribute(lit, 1))
  return { nodes, edges }
}

type Props = { clock: SceneClock }

/** The panel's resting turn and the size it hangs at (phones a little smaller). */
const REST = { turn: -0.25, scale: 1.35, phoneScale: 1.05 }
/** How far it tilts towards the cursor when hovered (radians), as the job cards do. */
const TILT = 0.12
/** The glass wipe between gallery images, seconds. */
const WIPE = 0.7

/**
 * Depth's focal object: the capstone project as a glass panel (the job cards' cut glass and
 * frosted screen), held inside a sparse glass data lattice of small emerald gems and
 * threads. The data roots from the surface converge on it (DepthWorld).
 *
 * It opens like a job card: hover tilts it towards the cursor and clears the frost a little
 * (the cursor reads "OPEN"); a click (or the "Capstone" button, or /work/capstone) flies it in
 * square to the screen, right of the details, where it breaks into glass dust and shows its
 * images sharp; changing image passes a band of frost across it. Close reverses it.
 */
export function CapstonePanel({ clock }: Props) {
  const column = useThree((state) => state.size.width < 700)
  const panel = useRef<Group>(null)
  const screenMesh = useRef<Mesh>(null)
  const blockMesh = useRef<Mesh>(null)
  const dustPoints = useRef<Points>(null)
  const gems = useRef<InstancedMesh>(null)
  const latticeMaterial = useRef<ShaderMaterial>(null)
  const block = useMemo(() => createBlock(), [])
  const glass = useMemo(() => createBlockGlass(), [])
  const screenGeometry = useMemo(() => createScreenGeometry(), [])
  const face = useMemo(() => new CardFace(capstone, 4, 'DEPTH / 2026'), [])
  const field = useMemo(() => new FrostField(9.1), [])
  const screen = useMemo(() => createScreenMaterial(face, field, 9.1), [face, field])
  const dust = useMemo(() => createDustGeometry(), [])
  const dustMaterial = useMemo(() => createDustMaterial(face, 9.1), [face])
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    field.bake(gl)
    return () => field.dispose()
  }, [field, gl])
  const lattice = useMemo(() => createLattice(), [])
  const gemGeometry = useMemo(() => new OctahedronGeometry(1, 0), [])
  const gemMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: depthPalette.gem,
        metalness: 1,
        roughness: 0.1,
        clearcoat: 1,
        flatShading: true,
        envMapIntensity: 3,
        // A faint light of their own: the deep is too dark for reflections alone.
        emissive: depthPalette.tip,
        emissiveIntensity: 0.12,
      }),
    [],
  )
  const scratch = useRef({
    matrix: new Matrix4(),
    rotation: new Quaternion(),
    scale: new Vector3(),
    axis: new Vector3(0.2, 1, 0.4).normalize(),
  })
  const state = useRef({
    hover: 0,
    fly: 0,
    dissolve: 0,
    pointer: { x: 0, y: 0 },
    /** The cursor's pull: the shared pointer spring, as on the job cards. */
    pull: { x: new Spring(0, MOTION.pointer), y: new Spring(0, MOTION.pointer) },
    cursorUv: new Vector2(0.5, 0.5),
    /** The gallery: images (cover first), the one shown, the wipe's progress. */
    images: [] as string[],
    shown: 0,
    wipe: -1,
    forward: new Vector3(),
    right: new Vector3(),
    lift: new Vector3(),
    up: new Vector3(0, 1, 0),
    home: new Vector3(),
    target: new Vector3(),
    rest: new Quaternion(),
    screen: new Quaternion(),
    tilt: new Quaternion(),
    euler: new Euler(),
  })
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useEffect(() => {
    void loadAssets().then(({ work, gallery }) => {
      const cover = work.capstone
      if (cover) face.setCover(cover)
      state.current.images = gallery
      // Warm the browser's cache, so a gallery change never waits on a download.
      gallery.slice(1).forEach((src) => {
        const image = new Image()
        image.src = src
      })
    })
  }, [face])
  useEffect(
    () => () => {
      block.dispose()
      glass.dispose()
      screenGeometry.dispose()
      screen.dispose()
      face.dispose()
      dust.dispose()
      dustMaterial.dispose()
      lattice.edges.dispose()
      gemGeometry.dispose()
      gemMaterial.dispose()
    },
    [block, glass, screenGeometry, screen, face, dust, dustMaterial, lattice, gemGeometry, gemMaterial],
  )

  useFrame(({ camera, pointer, size, viewport }, delta) => {
    const t = clock.time
    const s = state.current
    const g = panel.current
    const screenMaterial = screenMesh.current?.material as ShaderMaterial | undefined
    const blockGlass = blockMesh.current?.material as PhysicalMaterial | undefined
    if (g && screenMaterial && blockGlass && dustPoints.current) {
      const dt = Math.min(delta, 1 / 30)
      const { focused, opened, gallery } = useWork.getState()
      const isOpen = opened === capstone.slug
      const ease = 1 - Math.exp(-dt * 5)
      s.hover += ((focused === capstone.slug && !isOpen ? 1 : 0) - s.hover) * ease
      // The cursor's pull, on the shared pointer spring, as on the job cards.
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
      const flown = easeInOut(s.fly)
      const scale = column ? REST.phoneScale : REST.scale

      // At rest: in its lattice, never flat (a slow drift of a few degrees), leaning towards
      // the cursor when hovered.
      s.home.set(PANEL.x, PANEL.y + Math.sin(t * 0.4) * 0.05, PANEL.z)
      g.position.copy(s.home)
      s.rest.setFromEuler(
        s.euler.set(
          Math.sin(t * 0.21) * 0.06 + 0.05 - s.pointer.y * TILT * s.hover,
          REST.turn + Math.sin(t * 0.17) * 0.08 + s.pointer.x * TILT * s.hover,
          Math.sin(t * 0.13) * 0.02,
        ),
      )
      g.quaternion.copy(s.rest)
      g.scale.setScalar(scale * (1 + s.hover * 0.04))
      // Flown in: square to the screen, right of the details (phones: across the width).
      if (flown > 0 && g.parent) {
        const perspective = camera as PerspectiveCamera
        camera.getWorldDirection(s.forward)
        s.right.crossVectors(s.forward, s.up).normalize()
        s.lift.crossVectors(s.right, s.forward).normalize()
        const tan = Math.tan((perspective.fov * Math.PI) / 360)
        const frame = openFrame(column ? 'column' : 'orbit', perspective.aspect)
        const distance = (CARD.height * scale) / (frame.height * 2 * tan)
        s.target
          .copy(camera.position)
          .addScaledVector(s.forward, distance)
          .addScaledVector(s.right, frame.x * distance * tan * perspective.aspect)
          .addScaledVector(s.lift, frame.y * distance * tan)
        g.parent.worldToLocal(s.target)
        g.position.lerp(s.target, flown)
        g.parent.getWorldQuaternion(s.screen).invert().multiply(camera.quaternion)
        g.quaternion.slerp(s.screen, flown)
        // Almost still once open: a breath of the drift, nothing more.
        s.euler.set(Math.sin(t * 0.21) * 0.01, Math.sin(t * 0.17) * 0.012, 0)
        g.quaternion.multiply(s.tilt.setFromEuler(s.euler))
      }

      // The gallery: a band of frost crosses the open pane; the image changes behind it.
      if (gallery !== s.shown && s.wipe < -0.5 && s.images.length > 1) s.wipe = -0.3
      if (s.wipe > -0.5) {
        const before = s.wipe
        s.wipe += (dt / WIPE) * 1.6
        if (before < 0.5 && s.wipe >= 0.5) {
          s.shown = gallery
          const src = s.images[gallery]
          if (src) face.setCover(src, undefined, gallery === 0 ? capstone.coverCrop : null)
        }
        if (s.wipe > 1.3) s.wipe = -1
      }
      if (!isOpen && s.dissolve < 0.01 && s.shown !== 0) {
        // Closed again: back to its cover for next time.
        s.shown = 0
        const src = s.images[0]
        if (src) face.setCover(src)
      }

      const u = screenMaterial.uniforms
      u.uHover!.value = s.hover
      ;(u.uCursor!.value as Vector2).lerp(s.cursorUv, ease)
      u.uDissolve!.value = Math.min(1, s.dissolve)
      u.uSweep!.value = s.dissolve > 1 ? -0.3 + (s.dissolve - 1) * 2.4 : -1
      u.uWipe!.value = s.wipe
      u.uTime!.value = t
      ;(blockGlass.userData.time as { value: number }).value = t
      blockGlass.opacity = 1 - Math.min(1, s.dissolve * 1.2)
      blockGlass.visible = blockGlass.opacity > 0.01
      const dustShader = dustPoints.current.material as ShaderMaterial
      dustShader.uniforms.uDissolve!.value = s.dissolve
      dustShader.uniforms.uPointScale!.value = size.height * viewport.dpr * 0.012
      dustPoints.current.visible = s.dissolve > 0
    }
    const mesh = gems.current
    if (mesh) {
      const { matrix, rotation, scale, axis } = scratch.current
      lattice.nodes.forEach((node, i) => {
        rotation.setFromAxisAngle(axis, t * 0.3 + i)
        scale.setScalar(0.05 + (i % 3) * 0.015)
        matrix.compose(node, rotation, scale)
        mesh.setMatrixAt(i, matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    if (latticeMaterial.current) latticeMaterial.current.uniforms.uTime!.value = t
  })

  const focus = useWork((store) => store.focus)
  const open = useWork((store) => store.open)
  const front = BLOCK.depth / 2 + BLOCK.bevel + 0.002

  return (
    <group>
      <group
        ref={panel}
        position={PANEL}
        onPointerMove={(event) => {
          if (event.uv) state.current.cursorUv.copy(event.uv)
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          if (useWork.getState().opened) return
          focus(capstone.slug)
          document.body.style.cursor = 'pointer'
          useCursor.getState().setScene('open')
        }}
        onPointerOut={() => {
          const { focused, opened } = useWork.getState()
          if (focused === capstone.slug && !opened) focus(null)
          document.body.style.cursor = ''
          useCursor.getState().leave('open')
        }}
        onClick={(event) => {
          event.stopPropagation()
          if (!useWork.getState().opened) open(capstone.slug)
        }}
      >
        <mesh ref={blockMesh} geometry={block} material={glass} />
        <mesh ref={screenMesh} geometry={screenGeometry} material={screen} position-z={front} />
        {/* Not interactive: no raycasting against 14k points. */}
        <points
          ref={dustPoints}
          geometry={dust}
          material={dustMaterial}
          frustumCulled={false}
          visible={false}
          raycast={() => null}
        />
      </group>
      <instancedMesh
        ref={gems}
        args={[gemGeometry, gemMaterial, lattice.nodes.length]}
        frustumCulled={false}
      />
      <lineSegments geometry={lattice.edges} frustumCulled={false}>
        <shaderMaterial
          ref={latticeMaterial}
          vertexShader={edgeVertex}
          fragmentShader={edgeFragment}
          uniforms={uniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}
