import { BufferAttribute, BufferGeometry, Mesh } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { afterHero } from '../afterHero'
import { loadAssets } from '../assets'

/**
 * The sculpted column, built by scripts/build-spine.mjs from a short sculpted piece: one for
 * the full tier and a lighter one for the lite tier and phones, both already in column space
 * (Work's y, the column's own path), meshopt-compressed.
 */
export const SPINE_MODEL_URL = { full: '/models/spine.glb', lite: '/models/spine-lite.glb' }

export type SpineLod = keyof typeof SPINE_MODEL_URL

/** The attributes the oil material reads, by their name in the file (custom ones lower-cased). */
const ATTRIBUTES = { position: 'position', normal: 'normal', _crevice: 'crevice', _thin: 'thin' }

/**
 * Loads the sculpted column once the visitor has left the hero, if the file exists
 * (/assets.json lists it); otherwise resolves null (the procedural stand-in stays). Every
 * mesh in the file is merged into one geometry (one draw call); the file's materials are
 * ignored: the spine always wears its own oil material.
 */
export async function loadSpineModel(lod: SpineLod): Promise<BufferGeometry | null> {
  if (!(await loadAssets()).spine) return null
  await afterHero()
  try {
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(SPINE_MODEL_URL[lod])
    gltf.scene.updateMatrixWorld(true)
    const parts: BufferGeometry[] = []
    gltf.scene.traverse((object) => {
      if (object instanceof Mesh) parts.push(inColumnSpace(object))
    })
    if (parts.length === 0) return null
    const geometry = parts.length === 1 ? parts[0]! : mergeGeometries(parts)
    if (parts.length > 1) parts.forEach((part) => part.dispose())
    geometry.computeBoundingSphere()
    return geometry
  } catch {
    return null
  }
}

/**
 * A mesh's geometry as plain floats in column space: the file's attributes are quantized
 * (their scale and offset sit in the node's transform), and merging needs the same
 * attributes everywhere, so only the material's are kept.
 */
function inColumnSpace(mesh: Mesh) {
  const source = mesh.geometry as BufferGeometry
  const geometry = new BufferGeometry()
  for (const [name, target] of Object.entries(ATTRIBUTES)) {
    const attribute = source.getAttribute(name)
    if (!attribute) continue
    const { count, itemSize } = attribute
    const array = new Float32Array(count * itemSize)
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < itemSize; k++) array[i * itemSize + k] = attribute.getComponent(i, k)
    }
    geometry.setAttribute(target, new BufferAttribute(array, itemSize))
  }
  geometry.setIndex(source.getIndex())
  geometry.applyMatrix4(mesh.matrixWorld)
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
  source.dispose()
  return geometry
}
