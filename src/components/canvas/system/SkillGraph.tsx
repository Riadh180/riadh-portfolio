import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  type InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  OctahedronGeometry,
  Quaternion,
  Vector3,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  type Group,
  LinearFilter,
  type ShaderMaterial,
  SphereGeometry,
  type Sprite,
  SRGBColorSpace,
} from 'three'
import { useSystem } from '@/stores/system'
import { sceneColors } from '@/styles/scene'
import { palette } from '@/styles/tokens'
import edgeFragment from '../shaders/skillEdge.frag'
import edgeVertex from '../shaders/skillEdge.vert'
import nodeFragment from '../shaders/skillNode.frag'
import nodeVertex from '../shaders/skillNode.vert'
import type { GlassLook } from '../hero/glassLook'
import { Emblem } from '../hero/Emblem'
import type { Pointer } from '../usePointer'
import type { SceneClock } from '../useSceneClock'
import { type GraphNode, isRelated, layoutGraph } from './graph'

/** Each branch's colour (data: emerald, dimmer), the core glows near-white. */
const BRANCH_COLORS: Record<string, Color> = {
  mobile: sceneColors.teal,
  frontend: sceneColors.blue,
  testing: sceneColors.violet,
  performance: sceneColors.glow,
  creative: sceneColors.pink,
  data: sceneColors.emerald,
}

function colorOf(node: GraphNode) {
  if (node.kind === 'core') return sceneColors.glass
  const color = BRANCH_COLORS[node.branch ?? ''] ?? sceneColors.glass
  return node.secondary ? color.clone().multiplyScalar(0.6) : color
}

/** Glow sizes (world units); the core's light is The Core itself. */
const SIZE = { core: 0, branch: 0.34, leaf: 0.2 }
/** Gem sizes. */
const GEM = { core: 0, branch: 0.15, leaf: 0.085 }
/** Skill labels show when the camera is closer than this (or on focus). */
const NEAR = 12

/**
 * Small cut gems: metallic, so their reflections take the branch colour (instance colour),
 * flat-shaded facets that flash as they turn, clear-coated, with The Core's thin film.
 */
function createGemMaterial() {
  return new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0.7,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [180, 420],
    envMapIntensity: 5,
    flatShading: true,
  })
}

/** A small mono label on a canvas, for a sprite next to its node. */
function createLabel(text: string, emphasis: boolean) {
  const family =
    getComputedStyle(document.documentElement).getPropertyValue('--font-departure').trim() ||
    'monospace'
  const px = 44
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas unavailable')
  const font = `${px}px ${family}`
  context.font = font
  const label = text.toUpperCase()
  canvas.width = Math.ceil(context.measureText(label).width) + 8
  canvas.height = Math.ceil(px * 1.3)
  context.font = font
  context.fillStyle = emphasis ? palette.text : palette.muted
  context.textBaseline = 'middle'
  context.fillText(label, 4, canvas.height / 2)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  return { texture, aspect: canvas.width / canvas.height }
}

type Props = { clock: SceneClock; look: GlassLook; pointer: Pointer; reducedMotion: boolean }

/**
 * The System place: the skills graph as a 3D constellation round The Core (React /
 * TypeScript radiates from it). Small cut-glass gems at different depths, each with a soft
 * light inside that blurs into bokeh away from the focus; light threads with signal
 * pulses running outward. Only branch labels show; a skill's label appears when the
 * camera comes close or on focus. Hovering a gem (or its entry in the HTML list, through
 * the system store) lights it, its thread to the core and its skills.
 */
export function SkillGraph({ clock, look, pointer, reducedMotion }: Props) {
  const group = useRef<Group>(null)
  const nodeMaterial = useRef<ShaderMaterial>(null)
  const edgeMaterial = useRef<ShaderMaterial>(null)
  const labels = useRef<(Sprite | null)[]>([])
  const nodes = useMemo(() => layoutGraph(), [])
  const lit = useRef(new Float32Array(nodes.length))

  const nodeGeometry = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        nodes.flatMap((n) => n.position.toArray()),
        3,
      ),
    )
    geometry.setAttribute(
      'color',
      new Float32BufferAttribute(
        nodes.flatMap((n) => colorOf(n).toArray()),
        3,
      ),
    )
    geometry.setAttribute(
      'size',
      new Float32BufferAttribute(
        nodes.map((n) => SIZE[n.kind] * (n.secondary ? 0.8 : 1)),
        1,
      ),
    )
    geometry.setAttribute('lit', new Float32BufferAttribute(new Float32Array(nodes.length), 1))
    return geometry
  }, [nodes])

  const edgeGeometry = useMemo(() => {
    const positions: number[] = []
    const along: number[] = []
    const colors: number[] = []
    const phases: number[] = []
    nodes.forEach((node, i) => {
      const parent = nodes[node.parent]
      if (!parent) return
      // Each filament in short segments, so the pulse can travel along it.
      const steps = 12
      const color = colorOf(node)
      for (let k = 0; k < steps; k++) {
        for (const t of [k / steps, (k + 1) / steps]) {
          positions.push(...parent.position.clone().lerp(node.position, t).toArray())
          along.push(t)
          colors.push(...color.toArray())
          phases.push((i * 0.37) % 1)
        }
      }
    })
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('along', new Float32BufferAttribute(along, 1))
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    geometry.setAttribute('phase', new Float32BufferAttribute(phases, 1))
    geometry.setAttribute('lit', new Float32BufferAttribute(new Float32Array(along.length), 1))
    return geometry
  }, [nodes])

  /** Which node each edge vertex belongs to (its child end). */
  const edgeOwners = useMemo(() => {
    const owners: number[] = []
    nodes.forEach((node, i) => {
      if (node.parent < 0) return
      for (let k = 0; k < 24; k++) owners.push(i)
    })
    return owners
  }, [nodes])

  const labelTextures = useMemo(
    () => nodes.map((n) => createLabel(n.label, n.kind !== 'leaf')),
    [nodes],
  )
  const hitGeometry = useMemo(() => new SphereGeometry(1, 8, 8), [])
  const gemGeometry = useMemo(() => new OctahedronGeometry(1, 0), [])
  const gemMaterial = useMemo(() => createGemMaterial(), [])
  const gems = useRef<InstancedMesh>(null)
  const gemNodes = useMemo(() => nodes.filter((n) => n.kind !== 'core'), [nodes])
  const scratch = useRef({
    matrix: new Matrix4(),
    rotation: new Quaternion(),
    scale: new Vector3(),
    world: new Vector3(),
    axis: new Vector3(0.3, 1, 0.2).normalize(),
  })

  useEffect(
    () => () => {
      nodeGeometry.dispose()
      edgeGeometry.dispose()
      hitGeometry.dispose()
      gemGeometry.dispose()
      gemMaterial.dispose()
      labelTextures.forEach((label) => label.texture.dispose())
    },
    [nodeGeometry, edgeGeometry, hitGeometry, gemGeometry, gemMaterial, labelTextures],
  )

  const uniforms = useMemo(
    () => ({
      node: {
        uViewportHeight: { value: 1 },
        uTime: { value: 0 },
        uFocusDistance: { value: 9 },
        uAperture: { value: 1.4 },
      },
      edge: { uTime: { value: 0 } },
    }),
    [],
  )

  useEffect(() => {
    const mesh = gems.current
    if (!mesh) return
    gemNodes.forEach((node, i) => mesh.setColorAt(i, colorOf(node)))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [gemNodes])

  useFrame(({ size, viewport, camera }, delta) => {
    const focused = useSystem.getState().focused
    const ease = 1 - Math.exp(-Math.min(delta, 1 / 30) * 6)
    const state = lit.current
    nodes.forEach((_, i) => {
      const target = isRelated(nodes, i, focused) ? 1 : focused ? -0.5 : 0
      state[i] = (state[i] ?? 0) + (target - (state[i] ?? 0)) * ease
    })

    const nodeLit = nodeGeometry.getAttribute('lit')
    nodes.forEach((_, i) => nodeLit.setX(i, Math.max(0, state[i] ?? 0)))
    nodeLit.needsUpdate = true
    const edgeLit = edgeGeometry.getAttribute('lit')
    edgeOwners.forEach((owner, k) => edgeLit.setX(k, Math.max(0, state[owner] ?? 0)))
    edgeLit.needsUpdate = true

    // Labels: branches always (receding while something else is focused); skills only
    // when focused / related, or when the camera comes close.
    const { world, matrix, rotation, scale, axis } = scratch.current
    labels.current.forEach((sprite, i) => {
      const node = nodes[i]
      if (!sprite || !node) return
      const value = state[i] ?? 0
      let opacity: number
      if (node.kind === 'leaf') {
        sprite.getWorldPosition(world)
        const near =
          1 - Math.min(1, Math.max(0, (world.distanceTo(camera.position) - NEAR + 1.2) / 1.2))
        opacity = Math.max(Math.max(0, value), near * 0.7)
      } else {
        opacity = Math.max(0.2, 0.85 + value * 0.3)
      }
      ;(sprite.material as { opacity: number }).opacity = opacity
      sprite.visible = opacity > 0.01
    })

    // Gems turn slowly, each on its own phase; lit ones swell a little.
    const mesh = gems.current
    if (mesh) {
      gemNodes.forEach((node, i) => {
        const index = nodes.indexOf(node)
        const value = Math.max(0, state[index] ?? 0)
        rotation.setFromAxisAngle(axis, clock.time * 0.4 + i * 1.3)
        scale.setScalar(GEM[node.kind] * (node.secondary ? 0.8 : 1) * (1 + value * 0.35))
        matrix.compose(node.position, rotation, scale)
        mesh.setMatrixAt(i, matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }

    if (nodeMaterial.current) {
      nodeMaterial.current.uniforms.uViewportHeight!.value = size.height * viewport.dpr
      nodeMaterial.current.uniforms.uTime!.value = clock.time
      // Focus on the graph's centre: far nodes blur, near ones stay sharp.
      group.current?.getWorldPosition(world)
      nodeMaterial.current.uniforms.uFocusDistance!.value = world.distanceTo(camera.position)
    }
    if (edgeMaterial.current) edgeMaterial.current.uniforms.uTime!.value = clock.time
  })

  const focus = useSystem((state) => state.focus)

  return (
    <group ref={group}>
      {/* The centre is The Core: React / TypeScript radiates from it. */}
      <Emblem
        look={look}
        pointer={pointer}
        clock={clock}
        reducedMotion={reducedMotion}
        anchored={{ scale: 0.45 }}
      />
      <instancedMesh
        ref={gems}
        args={[gemGeometry, gemMaterial, gemNodes.length]}
        frustumCulled={false}
      />
      <lineSegments geometry={edgeGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={edgeMaterial}
          vertexShader={edgeVertex}
          fragmentShader={edgeFragment}
          uniforms={uniforms.edge}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </lineSegments>
      <points geometry={nodeGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={nodeMaterial}
          vertexShader={nodeVertex}
          fragmentShader={nodeFragment}
          uniforms={uniforms.node}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </points>
      {nodes.map((node, i) => {
        const label = labelTextures[i]
        const height = node.kind === 'leaf' ? 0.24 : node.kind === 'branch' ? 0.28 : 0.32
        const offset = node.kind === 'core' ? 0.85 : GEM[node.kind] + 0.1
        return (
          <group key={node.id} position={node.position}>
            {label && (
              <sprite
                ref={(sprite) => {
                  labels.current[i] = sprite
                }}
                position={[offset + (height * label.aspect) / 2, 0, 0]}
                scale={[height * label.aspect, height, 1]}
              >
                <spriteMaterial
                  map={label.texture}
                  transparent
                  depthWrite={false}
                  toneMapped={false}
                />
              </sprite>
            )}
            {/* An invisible, slightly larger target for hover. */}
            <mesh
              geometry={hitGeometry}
              scale={Math.max(0.6, GEM[node.kind] * 3)}
              visible={false}
              onPointerOver={(event) => {
                event.stopPropagation()
                focus(node.id)
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                if (useSystem.getState().focused === node.id) focus(null)
                document.body.style.cursor = ''
              }}
            />
          </group>
        )
      })}
    </group>
  )
}
