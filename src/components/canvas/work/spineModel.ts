import { BufferAttribute, BufferGeometry, Mesh, type Object3D, Points } from 'three'
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

/** The column, and the anchors of the glass beads that cling to it (if the file has them). */
export type SpineModel = { geometry: BufferGeometry; anchors: BufferGeometry | null }

/** The attributes kept, by their name in the file (custom ones lower-cased): the oil material's, the anchors'. */
const ATTRIBUTES = {
  position: 'position',
  normal: 'normal',
  _crevice: 'crevice',
  _thin: 'thin',
  _cloud: '_cloud',
}

/**
 * Loads the sculpted column once the visitor has left the hero, if the file exists
 * (/assets.json lists it); otherwise resolves null (the procedural stand-in stays). Every
 * mesh in the file is merged into one geometry (one draw call); the file's materials are
 * ignored: the spine always wears its own oil material. Its points are the beads' anchors.
 */
export async function loadSpineModel(lod: SpineLod): Promise<SpineModel | null> {
  if (!(await loadAssets()).spine) return null
  await afterHero()
  try {
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(SPINE_MODEL_URL[lod])
    gltf.scene.updateMatrixWorld(true)
    const parts: BufferGeometry[] = []
    let anchors: BufferGeometry | null = null
    gltf.scene.traverse((object) => {
      if (object instanceof Mesh) parts.push(inColumnSpace(object))
      else if (object instanceof Points) anchors = inColumnSpace(object)
    })
    if (parts.length === 0) return null
    const geometry = parts.length === 1 ? parts[0]! : mergeGeometries(parts)
    if (parts.length > 1) parts.forEach((part) => part.dispose())
    geometry.computeBoundingSphere()
    return { geometry, anchors }
  } catch {
    return null
  }
}

/**
 * A mesh's (or the anchors') geometry as plain floats in column space: the file's attributes
 * are quantized (their scale and offset sit in the node's transform), and merging needs the
 * same attributes everywhere, so only the ones used are kept.
 */
function inColumnSpace(mesh: Object3D & { geometry: BufferGeometry }) {
  const source = mesh.geometry
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
