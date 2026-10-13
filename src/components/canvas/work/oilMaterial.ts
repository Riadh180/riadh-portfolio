import { Color, MeshPhysicalMaterial } from 'three'
import { sceneColors } from '@/styles/scene'
import noise from '../shaders/noise.glsl'
import oilFragment from '../shaders/oil.glsl'

/**
 * The spine's material: a near-black, glossy body that stays dark, with thin, sharp
 * streaks of oily colour (teal, green, violet) running across it, fine grain in the
 * normals and patchy roughness, so the light catches only edges, chips and the streaks.
 * Reflective only, no transmission: one cheap material for the whole mass.
 *
 * The streaks and grain are added to three's physical shader (oil.glsl): the streaks set
 * where the thin film shows and how thick it is, so its colour comes from the film itself.
 */
export function createOilMaterial() {
  const material = new MeshPhysicalMaterial({
    // A hint of violet in the near-black body (Work's accent).
    color: new Color().copy(sceneColors.bg).lerp(sceneColors.violet, 0.04).multiplyScalar(0.7),
    metalness: 0.9,
    roughness: 0.3,
    clearcoat: 0.25,
    clearcoatRoughness: 0.1,
    iridescence: 1,
    iridescenceIOR: 2.1,
    iridescenceThicknessRange: [380, 820],
    envMapIntensity: 0.7,
    flatShading: true,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uOilTeal = { value: sceneColors.teal }
    shader.uniforms.uOilGreen = { value: sceneColors.emerald }
    shader.uniforms.uOilViolet = { value: sceneColors.violet }
    shader.uniforms.uOilGlow = { value: 0.3 }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSpinePosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSpinePosition = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vSpinePosition;
        uniform vec3 uOilTeal;
        uniform vec3 uOilGreen;
        uniform vec3 uOilViolet;
        uniform float uOilGlow;
        ${noise}
        ${oilFragment}`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = oilRoughness(roughnessFactor, vSpinePosition);',
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        #ifndef SCULPTED
          normal = oilGrain(normal, vSpinePosition);
        #endif`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        #ifdef USE_IRIDESCENCE
          oilStreaks(material.iridescence, material.iridescenceThickness, vSpinePosition,
            iridescenceThicknessMinimum, iridescenceThicknessMaximum);
        #endif`,
      )
      .replace(
        '#include <opaque_fragment>',
        `outgoingLight += oilStreakGlow(normal, normalize(vViewPosition), uOilTeal, uOilGreen,
          uOilViolet, uOilGlow);
        #include <opaque_fragment>`,
      )
  }
  return material
}

export function disposeOilMaterial(material: MeshPhysicalMaterial) {
  material.normalMap?.dispose()
  material.dispose()
}
