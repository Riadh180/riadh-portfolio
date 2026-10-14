import { Color, type DataTexture, MeshPhysicalMaterial } from 'three'
import { sceneColors } from '@/styles/scene'
import { addGlassBody } from '../glass/glassBody'
import { type GlassLook, surfaceKey } from './glassLook'
import {
  createFilmTexture,
  createRimTexture,
  createSurfaceTexture,
  writeFilmTexture,
  writeSurfaceTexture,
} from './glassTextures'

/** Clear glass with a thin film; the look decides the rest (see GlassLook). */
export function createGlassMaterial(look: GlassLook) {
  const film = createFilmTexture()
  const surface = createSurfaceTexture()
  const material = new MeshPhysicalMaterial({
    color: sceneColors.glass,
    metalness: 0,
    // The surface map carries the actual roughness and specular strength.
    roughness: 1,
    roughnessMap: surface,
    specularIntensityMap: surface,
    ior: 1.5,
    dispersion: 0.3,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 400],
    iridescenceMap: film,
    iridescenceThicknessMap: film,
    emissive: sceneColors.glass,
    emissiveMap: createRimTexture(),
  })
  applyGlassLook(material, look)
  // Thick glass: light held in the band's body, not just bright edges on black.
  addGlassBody(material, {
    color: new Color().copy(sceneColors.glass).lerp(sceneColors.teal, 0.2),
    strength: 0.05,
    edge: 0.8,
  })
  return material
}

/**
 * Copies a look onto the material; rebuilds the surface maps only when their numbers change.
 * `facing` (1 face-on .. 0 edge-on) dims the reflections as the emblem passes edge-on, where
 * the flat faces would otherwise mirror the edge light at full strength and flare.
 * `depth` scales the refraction depth (deeper where the glass passes in front of type).
 * `reflectOnly` drops the refraction pass (small, distant uses).
 * `rainbow` (0..1) splits the refraction into colour at the edges and eases the white
 * bevel glow back, so the edges read as rainbow rather than thin white lines.
 */
export function applyGlassLook(
  material: MeshPhysicalMaterial,
  look: GlassLook,
  { facing = 1, depth = 1, rainbow = 0, reflectOnly = false } = {},
) {
  material.transmission = reflectOnly ? 0 : look.transmission
  // Without transmission a light body scatters like plastic: keep it dark glass.
  material.color.copy(sceneColors.glass).multiplyScalar(reflectOnly ? 0.04 : 1)
  material.thickness = look.thickness * depth
  material.dispersion = 0.3 + rainbow * 4.5
  material.envMapIntensity = look.envIntensity * (0.05 + 0.95 * facing)
  material.iridescence = look.iridescence
  material.emissiveIntensity = look.rim * (1 - 0.6 * rainbow)

  const key = surfaceKey(look)
  if (material.userData.surfaceKey === key) return
  material.userData.surfaceKey = key
  writeFilmTexture(material.iridescenceMap as DataTexture, look)
  writeSurfaceTexture(material.roughnessMap as DataTexture, look)
}

export function disposeGlassMaterial(material: MeshPhysicalMaterial) {
  material.iridescenceMap?.dispose()
  material.roughnessMap?.dispose()
  material.emissiveMap?.dispose()
  material.dispose()
}
