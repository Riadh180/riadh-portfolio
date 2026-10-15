import {
  type BufferAttribute,
  BufferGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  type InterleavedBufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { sceneConfig } from '@/styles/scene'
import { roundedRectShape } from '../hero/bandGeometry'
import { hash, valueNoise3 } from '../noise'

/** Deterministic 0..1 per segment / feature. */
const pick = (i: number, seed: number) => hash(i, seed, 3)

/** A vertebra body: a thick rounded-square block, centred, lying flat. */
function body(width: number, depth: number, thickness: number) {
  const bevel = thickness * 0.22
  const geometry = new ExtrudeGeometry(
    roundedRectShape(width, depth, Math.min(width, depth) * 0.3),
    {
      depth: Math.max(0.01, thickness - bevel * 2),
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 0.8,
      bevelSegments: 4,
      curveSegments: 10,
    },
  )
  geometry.center()
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

/** A lump: a small, squashed rock fused to a body's side (no blades, no spikes). */
function lump(radius: number, squash: number) {
  const geometry = new IcosahedronGeometry(radius, 1)
  geometry.scale(1.25, squash, 1)
  return geometry
}

/** Keeps only positions, so the parts can be merged. */
function clean(geometry: BufferGeometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry
  for (const name of Object.keys(flat.attributes)) {
    if (name !== 'position') flat.deleteAttribute(name)
  }
  return flat
}

/**
 * The column's own shape, applied to the whole mass after carving: the width swells and
 * pinches along the height (0.7–1.3×), it twists slowly, and it follows a gentle S-curve,
 * so it never reads as an even cylinder.
 */
function deform(positions: BufferAttribute | InterleavedBufferAttribute) {
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const width = 1 + 0.2 * Math.sin(y * 0.52 + 0.7) + 0.1 * Math.sin(y * 1.27 + 2.1)
    const turn = y * 0.08 + 0.3 * Math.sin(y * 0.29)
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    const wx = x * width
    const wz = z * width
    positions.setXYZ(
      i,
      wx * cos - wz * sin + 0.42 * Math.sin(y * 0.21 + 0.4),
      y,
      wx * sin + wz * cos + 0.24 * Math.sin(y * 0.16 + 1.3),
    )
  }
}

/**
 * The spine: a crystal column of fused vertebrae, longer than the frame ever shows (it runs
 * from above the first card to well below the last). Each body is a thick rounded-square
 * block of its own size, tilt and turn, with one or two small lumps fused to its sides;
 * they overlap into one mass, are tessellated, carved along their normals into a fine
 * crystalline crust, then the whole column is shaped (deform). Flat shaded: every facet
 * catches the light on its own. A `crevice` attribute (0 on the crests, 1 deep in the
 * carving) lets the material keep the hollows near-black. `edge` is the tessellation
 * (lite: coarser).
 */
export function createSpineGeometry(edge = 0.1) {
  const { top, bottom, twist, tilt, bulge } = sceneConfig.spine
  const spacing = 0.93
  const segments = Math.round((top - bottom) / spacing)
  const euler = new Euler()
  const rotation = new Quaternion()
  const position = new Vector3()
  const scale = new Vector3(1, 1, 1)
  const matrix = new Matrix4()
  const place = (
    geometry: BufferGeometry,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
  ) => {
    euler.set(rx, ry, rz)
    rotation.setFromEuler(euler)
    position.set(x, y, z)
    matrix.compose(position, rotation, scale)
    return geometry.applyMatrix4(matrix)
  }

  const parts: BufferGeometry[] = []
  for (let i = 0; i < segments; i++) {
    const y = top - (i + 0.5) * spacing
    // The column wobbles: each vertebra a little off the axis, tilted its own way.
    const wx = Math.sin(i * 0.9) * 0.12 + (pick(i, 1) - 0.5) * 0.1
    const wz = Math.cos(i * 0.7) * 0.1 + (pick(i, 2) - 0.5) * 0.1
    const rx = (pick(i, 3) - 0.5) * tilt
    const rz = (pick(i, 4) - 0.5) * tilt
    const ry = i * twist + pick(i, 5) * 0.8
    const width = 0.95 + pick(i, 6) * 0.5
    const depth = 0.85 + pick(i, 7) * 0.4
    // Thicker than the spacing: neighbours overlap and fuse into one mass.
    const thickness = spacing * (1.25 + pick(i, 8) * 0.2)
    parts.push(clean(place(body(width, depth, thickness), wx, y, wz, rx, ry, rz)))

    // Lumps: one or two per vertebra, half sunk into its side.
    const count = pick(i, 9) < 0.7 ? 2 : 1
    for (let k = 0; k < count; k++) {
      const radius = 0.16 + pick(i, 11 + k) * 0.14
      const side = ry + (k === 0 ? 0 : Math.PI) + (i % 2) * Math.PI + (pick(i, 17 + k) - 0.5) * 1.2
      const reach = width * 0.42
      parts.push(
        clean(
          place(
            lump(radius, 0.55 + pick(i, 12 + k) * 0.3),
            wx + Math.cos(side) * reach,
            y + (pick(i, 18 + k) - 0.5) * spacing * 0.5,
            wz - Math.sin(side) * reach,
            (pick(i, 19 + k) - 0.5) * 0.6,
            side,
            (pick(i, 20 + k) - 0.5) * 0.6,
          ),
        ),
      )
    }
  }

  const merged = mergeGeometries(parts)
  parts.forEach((part) => part.dispose())
  const dense = new TessellateModifier(edge, 6).modify(merged)
  merged.dispose()
  const carved = mergeVertices(dense)
  dense.dispose()
  carved.computeVertexNormals()
  const positions = carved.getAttribute('position')
  const normals = carved.getAttribute('normal')
  const crevice = new Float32Array(positions.count)
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const broad = valueNoise3(x * 1.1, y * 0.9, z * 1.1, 11) - 0.5
    const ridge = 1 - Math.abs(valueNoise3(x * 5, y * 5, z * 5, 12) * 2 - 1)
    // Fine chips: a crust of small facets, not big flat planes.
    const chips = valueNoise3(x * 16, y * 16, z * 16, 13) - 0.5
    const amount = (broad * 3.2 + ridge ** 3 * 0.9 - 0.3 + chips * 0.12) * bulge * 1.5
    crevice[i] = Math.min(1, Math.max(0, -amount / (bulge * 2.2) + 0.25))
    positions.setXYZ(
      i,
      x + normals.getX(i) * amount,
      y + normals.getY(i) * amount,
      z + normals.getZ(i) * amount,
    )
  }
  carved.setAttribute('crevice', new Float32BufferAttribute(crevice, 1))
  deform(positions)
  carved.deleteAttribute('normal')
  const spine = carved.toNonIndexed()
  carved.dispose()
  spine.computeVertexNormals()
  return spine
}
