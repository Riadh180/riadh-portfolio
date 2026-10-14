import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  type Group,
  type InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  OctahedronGeometry,
  Quaternion,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  AdditiveBlending,
  type ShaderMaterial,
} from 'three'
import { capstone } from '@/content/site'
import { sceneColors } from '@/styles/scene'
import { loadAssets } from '../assets'
import edgeFragment from '../shaders/skillEdge.frag'
import edgeVertex from '../shaders/skillEdge.vert'
import type { SceneClock } from '../useSceneClock'
import { CardFace } from '../work/cardFace'
import {
  BLOCK,
  createBlock,
  createBlockGlass,
  createScreenGeometry,
  createScreenMaterial,
} from '../work/WorkCards'

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
  const color = sceneColors.emerald
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

/**
 * Depth's focal object: the capstone project as a glass panel (the job cards' cut glass and
 * frosted screen), held inside a sparse glass data lattice of small emerald gems and
 * threads. The data roots from the surface converge on it (DepthWorld).
 */
export function CapstonePanel({ clock }: Props) {
  const panel = useRef<Group>(null)
  const gems = useRef<InstancedMesh>(null)
  const latticeMaterial = useRef<ShaderMaterial>(null)
  const block = useMemo(() => createBlock(), [])
  const glass = useMemo(() => createBlockGlass(), [])
  const screenGeometry = useMemo(() => createScreenGeometry(), [])
  const face = useMemo(() => new CardFace(capstone, 4, 'DEPTH / 2026'), [])
  const screen = useMemo(() => createScreenMaterial(face, 9.1), [face])
  const lattice = useMemo(() => createLattice(), [])
  const gemGeometry = useMemo(() => new OctahedronGeometry(1, 0), [])
  const gemMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: sceneColors.emerald,
        metalness: 1,
        roughness: 0.1,
        clearcoat: 1,
        flatShading: true,
        envMapIntensity: 3,
        // A faint light of their own: the deep is too dark for reflections alone.
        emissive: sceneColors.emerald,
        emissiveIntensity: 0.35,
      }),
    [],
  )
  const scratch = useRef({
    matrix: new Matrix4(),
    rotation: new Quaternion(),
    scale: new Vector3(),
    axis: new Vector3(0.2, 1, 0.4).normalize(),
  })
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useEffect(() => {
    void loadAssets().then(({ work }) => {
      const cover = work.capstone
      if (cover) face.setCover(cover)
    })
  }, [face])
  useEffect(
    () => () => {
      block.dispose()
      glass.dispose()
      screenGeometry.dispose()
      screen.dispose()
      face.dispose()
      lattice.edges.dispose()
      gemGeometry.dispose()
      gemMaterial.dispose()
    },
    [block, glass, screenGeometry, screen, face, lattice, gemGeometry, gemMaterial],
  )

  useFrame(() => {
    const t = clock.time
    if (panel.current) {
      // Never flat: a slow drift of a few degrees.
      panel.current.rotation.set(
        Math.sin(t * 0.21) * 0.06 + 0.05,
        -0.25 + Math.sin(t * 0.17) * 0.08,
        Math.sin(t * 0.13) * 0.02,
      )
      panel.current.position.y = PANEL.y + Math.sin(t * 0.4) * 0.05
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

  return (
    <group>
      <group ref={panel} position={PANEL} scale={1.35}>
        <mesh geometry={block} material={glass} />
        <mesh
          geometry={screenGeometry}
          material={screen}
          position-z={BLOCK.depth / 2 + BLOCK.bevel + 0.002}
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
