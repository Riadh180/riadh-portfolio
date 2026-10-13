import {
  type BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  type MeshStandardMaterial,
  type Texture,
  type WebGLRenderer,
} from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { sceneConfig } from '@/styles/scene'

/**
 * Where the sculpted spine goes (docs/SPINE_MODEL_SPEC.md). Drop the file in and reload:
 * nothing else changes. Decoders are self-hosted under /decoders.
 */
export const SPINE_MODEL_URL = '/models/spine.glb'

export type SpineModel = { geometry: BufferGeometry; normalMap: Texture | null }

/**
 * Loads the sculpted spine if the file exists (/models.json lists it), otherwise resolves
 * null (the procedural stand-in stays). Every mesh in the file is merged into one geometry (one draw call),
 * centred on the axis and scaled to the column's height. Only the baked normal map is
 * kept from the file's material: the spine always wears its own oil material.
 */
export async function loadSpineModel(gl: WebGLRenderer): Promise<SpineModel | null> {
  const available = await fetch('/models.json')
    .then((response) => response.json() as Promise<{ spine?: boolean }>)
    .catch(() => null)
  if (!available?.spine) return null

  const draco = new DRACOLoader().setDecoderPath('/decoders/draco/')
  const ktx2 = new KTX2Loader().setTranscoderPath('/decoders/basis/').detectSupport(gl)
  const loader = new GLTFLoader()
    .setDRACOLoader(draco)
    .setKTX2Loader(ktx2)
    .setMeshoptDecoder(MeshoptDecoder)

  try {
    const gltf = await loader.loadAsync(SPINE_MODEL_URL)
    gltf.scene.updateMatrixWorld(true)
    const parts: BufferGeometry[] = []
    let normalMap: Texture | null = null
    gltf.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const geometry = (object.geometry as BufferGeometry).clone()
      geometry.applyMatrix4(object.matrixWorld)
      // Merging needs the same attributes everywhere: keep position, normal, uv.
      for (const name of Object.keys(geometry.attributes)) {
        if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name)
      }
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
      parts.push(geometry)
      normalMap ??= (object.material as MeshStandardMaterial).normalMap ?? null
    })
    if (parts.length === 0) return null

    const geometry = mergeGeometries(parts)
    parts.forEach((part) => part.dispose())
    fitToColumn(geometry)
    return { geometry, normalMap }
  } finally {
    draco.dispose()
    ktx2.dispose()
  }
}

/** Centre on the vertical axis, scale to the column's height, add the film's uv1. */
function fitToColumn(geometry: BufferGeometry) {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return
  const { height } = sceneConfig.spine
  const scale = height / Math.max(box.max.y - box.min.y, 1e-3)
  geometry.translate(
    -(box.min.x + box.max.x) / 2,
    -(box.min.y + box.max.y) / 2,
    -(box.min.z + box.max.z) / 2,
  )
  geometry.scale(scale, scale, scale)

  // uv1 wraps round the column (angle, height), as on the stand-in.
  const positions = geometry.getAttribute('position')
  const uv1 = new Float32Array(positions.count * 2)
  for (let i = 0; i < positions.count; i++) {
    const angle = Math.atan2(positions.getZ(i), positions.getX(i)) / (Math.PI * 2) + 0.5
    uv1.set([angle, positions.getY(i) / height + 0.5], i * 2)
  }
  geometry.setAttribute('uv1', new Float32BufferAttribute(uv1, 2))
}
