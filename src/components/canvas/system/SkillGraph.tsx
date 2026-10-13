import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
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

const SIZE = { core: 0.62, branch: 0.3, leaf: 0.17 }

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

type Props = { clock: SceneClock }

/**
 * The System place: the skills graph as a constellation. Glass-bead nodes (React /
 * TypeScript at the centre, the branches, their skills), thin filaments with signal
 * pulses running outward, small mono labels. Hovering a node (or its entry in the HTML
 * list, through the system store) lights it, its line to the core and its skills.
 */
export function SkillGraph({ clock }: Props) {
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

  useEffect(
    () => () => {
      nodeGeometry.dispose()
      edgeGeometry.dispose()
      hitGeometry.dispose()
      labelTextures.forEach((label) => label.texture.dispose())
    },
    [nodeGeometry, edgeGeometry, hitGeometry, labelTextures],
  )

  const uniforms = useMemo(
    () => ({
      node: { uViewportHeight: { value: 1 }, uTime: { value: 0 } },
      edge: { uTime: { value: 0 } },
    }),
    [],
  )

  useFrame(({ size, viewport }, delta) => {
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

    // Labels: the focused set brightens, everything else recedes while something is focused.
    labels.current.forEach((sprite, i) => {
      if (!sprite) return
      const value = state[i] ?? 0
      const base = nodes[i]?.kind === 'leaf' ? 0.55 : 0.85
      ;(sprite.material as { opacity: number }).opacity = Math.max(0.12, base + value * 0.45)
    })

    if (nodeMaterial.current) {
      nodeMaterial.current.uniforms.uViewportHeight!.value = size.height * viewport.dpr
      nodeMaterial.current.uniforms.uTime!.value = clock.time
    }
    if (edgeMaterial.current) edgeMaterial.current.uniforms.uTime!.value = clock.time
    if (group.current) group.current.rotation.y = Math.sin(clock.time * 0.08) * 0.35
  })

  const focus = useSystem((state) => state.focus)

  return (
    <group ref={group}>
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
        const height = node.kind === 'leaf' ? 0.15 : node.kind === 'branch' ? 0.19 : 0.24
        const offset = SIZE[node.kind] * 0.55 + 0.08
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
              scale={SIZE[node.kind] * 0.75}
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
