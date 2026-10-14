import {
  type BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Euler,
  Vector3,
} from 'three'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { sceneConfig } from '@/styles/scene'
import { roundedRectShape } from '../hero/bandGeometry'
import { hash, valueNoise3 } from '../noise'

type Piece = { width: number; length: number; thickness: number; round: number; bevel: number }

/** A pillowy extruded rounded rectangle, lying flat (thickness along y), centred. */
function piece({ width, length, thickness, round, bevel }: Piece) {
  const geometry = new ExtrudeGeometry(roundedRectShape(width, length, round), {
    depth: Math.max(0.001, thickness - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.9,
    bevelSegments: 5,
    curveSegments: 12,
  })
  geometry.center()
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

/** Deterministic 0..1 per piece. */
const pick = (i: number, seed: number) => hash(i, seed, 3)

/**
 * The spine as one continuous mass: rounded app-icon slabs lying flat like vertebrae, a
 * few key-like blocks, and thin fins sticking out, stacked so tightly they overlap, each
 * turned, tilted and nudged off the axis. Merged into one mesh, tessellated, welded, then
 * carved along its normals by layered noise and left faceted, so it reads like a raw,
 * crystalline sculpture rather than assembled plastic.
 */
/**
 * `edge` is the tessellation's longest edge: 0.13 for the full tier; the lite tier uses a
 * coarser 0.24 (about a third of the triangles, the same sculpture, chunkier facets).
 */
export function createSpineGeometry(edge = 0.13) {
  const { pieces, height, twist, offset, tilt, fins, bulge } = sceneConfig.spine
  const parts: BufferGeometry[] = []
  const matrix = new Matrix4()
  const rotation = new Quaternion()
  const euler = new Euler()
  const position = new Vector3()
  const scale = new Vector3(1, 1, 1)

  for (let i = 0; i < pieces; i++) {
    const y = (i / (pieces - 1) - 0.5) * height
    const roll = pick(i, 1)
    let geometry: BufferGeometry
    let reach = offset
    if (roll < fins) {
      // A thin blade reaching out past the body.
      geometry = piece({
        width: 1.5 + pick(i, 2) * 0.9,
        length: 0.16 + pick(i, 3) * 0.12,
        thickness: 0.07,
        round: 0.06,
        bevel: 0.025,
      })
      reach = offset + 0.35
    } else if (roll < fins + 0.2) {
      // A key-like block: compact, tall, very rounded.
      const side = 0.55 + pick(i, 2) * 0.25
      geometry = piece({ width: side, length: side, thickness: 0.5, round: 0.14, bevel: 0.05 })
    } else {
      // A rounded app-icon slab.
      const width = 0.95 + pick(i, 2) * 0.55
      const length = 0.85 + pick(i, 3) * 0.45
      geometry = piece({
        width,
        length,
        thickness: 0.3 + pick(i, 4) * 0.12,
        round: Math.min(width, length) * 0.26,
        bevel: 0.04,
      })
    }
    euler.set((pick(i, 5) - 0.5) * tilt, i * twist, (pick(i, 6) - 0.5) * tilt)
    rotation.setFromEuler(euler)
    position.set(Math.sin(i * 1.7) * reach, y, Math.cos(i * 2.3) * reach)
    matrix.compose(position, rotation, scale)
    geometry.applyMatrix4(matrix)
    // Welding needs identical attributes across pieces: positions only.
    geometry.deleteAttribute('uv')
    geometry.deleteAttribute('normal')
    parts.push(geometry)
  }

  const merged = mergeGeometries(parts)
  parts.forEach((part) => part.dispose())
  // Dense, even triangles everywhere (the flat caps included), so the sculpting below can
  // carve detail anywhere on the surface.
  // Fine enough for the folds; the finest grain lives in the shader (oil.glsl).
  const dense = new TessellateModifier(edge, 6).modify(merged)
  merged.dispose()
  const spine = mergeVertices(dense)
  dense.dispose()
  spine.computeVertexNormals()

  // Sculpt along the normals: broad bulges, sharp ridged folds, and fine crumbly grain,
  // so it reads carved or scanned, with the app-icon forms still underneath.
  const positions = spine.getAttribute('position')
  const normals = spine.getAttribute('normal')
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const broad = valueNoise3(x * 1.6, y * 1.6, z * 1.6, 11) - 0.5
    const ridge = 1 - Math.abs(valueNoise3(x * 5, y * 5, z * 5, 12) * 2 - 1)
    const grain = valueNoise3(x * 9, y * 9, z * 9, 13) - 0.5
    const amount = (broad * 2 + ridge ** 3 * 0.9 - 0.3 + grain * 0.7) * bulge
    positions.setXYZ(
      i,
      x + normals.getX(i) * amount,
      y + normals.getY(i) * amount,
      z + normals.getZ(i) * amount,
    )
  }
  // Faceted: each triangle keeps its own normal, so the grain reads as crystalline chips.
  const faceted = spine.toNonIndexed()
  spine.dispose()
  faceted.computeVertexNormals()
  const facetedPositions = faceted.getAttribute('position')

  // uv1 wraps round the column (angle, height): the oily film flows over the bulges.
  const uv1 = new Float32Array(facetedPositions.count * 2)
  for (let i = 0; i < facetedPositions.count; i++) {
    const angle =
      Math.atan2(facetedPositions.getZ(i), facetedPositions.getX(i)) / (Math.PI * 2) + 0.5
    uv1.set([angle, facetedPositions.getY(i) / height + 0.5], i * 2)
  }
  faceted.setAttribute('uv1', new Float32BufferAttribute(uv1, 2))
  return faceted
}
