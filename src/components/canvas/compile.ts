import {
  type Camera,
  HalfFloatType,
  type Material,
  type Mesh,
  type Object3D,
  type Scene,
  type ShaderMaterial,
  type Texture,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { syncGrainTier } from './particles/CursorField'

/** A 1×1 stand-in for the targets the scene really draws into (shared, made on first use). */
let stand: WebGLRenderTarget | null = null

/** The textures a material uses (its maps and its uniforms), for uploading ahead. */
function texturesOf(material: Material) {
  const found: Texture[] = []
  const add = (value: unknown) => {
    if (value && typeof value === 'object' && (value as Texture).isTexture) {
      found.push(value as Texture)
    }
  }
  Object.values(material).forEach(add)
  Object.values((material as ShaderMaterial).uniforms ?? {}).forEach((uniform) =>
    add(uniform?.value),
  )
  return found
}

/**
 * Readies `object` for its first draw ahead of time, so that frame doesn't stall on a shader
 * link or an upload (traced on the HD 630: 23–51 ms in GetProgramiv per program, frames of
 * 70–167 ms as a place first came into view, and the hero's first frames at load):
 * - its shaders compiled in parallel where the browser can, for the variant actually drawn:
 *   into a render target (the effect composer's HDR buffer, a card's own target), where
 *   three leaves out tone mapping and writes linear output;
 * - hidden parts too: three compiles only what is visible, so the whole subtree is shown for
 *   the call and then restored (The Core before its reveal, places not yet in view);
 * - grain materials on their tier's variant first, and every texture uploaded.
 */
export function compileForTarget(
  gl: WebGLRenderer,
  object: Object3D,
  camera: Camera,
  scene: Scene | null = null,
) {
  stand ??= new WebGLRenderTarget(1, 1, { type: HalfFloatType })
  const hidden: Object3D[] = []
  const textures = new Set<Texture>()
  object.traverse((child) => {
    if (!child.visible) {
      hidden.push(child)
      child.visible = true
    }
    const material = (child as Mesh).material
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      if ((m as ShaderMaterial).uniforms?.uGrainLight) syncGrainTier(m as ShaderMaterial)
      texturesOf(m).forEach((texture) => textures.add(texture))
    }
  })
  const previous = gl.getRenderTarget()
  gl.setRenderTarget(stand)
  const done = gl.compileAsync(object, camera, scene).catch(() => undefined)
  gl.setRenderTarget(previous)
  for (const child of hidden) child.visible = false
  textures.forEach((texture) => gl.initTexture(texture))
  return done
}
