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
    // Lighter, lilac (the reference column): a textured body under a soft purple sheen.
    color: new Color().copy(sceneColors.violet).lerp(sceneColors.glass, 0.12).multiplyScalar(0.22),
    metalness: 0.85,
    roughness: 0.3,
    clearcoat: 0.25,
    clearcoatRoughness: 0.1,
    iridescence: 1,
    iridescenceIOR: 2.1,
    iridescenceThicknessRange: [380, 820],
    // Lifted towards the studio-lit concept (docs/spine-concept.png).
    envMapIntensity: 1.35,
    flatShading: true,
  })
  material.userData.time = { value: 0 }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uOilTeal = { value: sceneColors.teal }
    shader.uniforms.uOilGreen = { value: sceneColors.emerald }
    shader.uniforms.uOilViolet = { value: sceneColors.violet }
    shader.uniforms.uOilGlow = { value: 0.7 }
    shader.uniforms.uOilTime = material.userData.time
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSpinePosition;\nattribute float oilSmooth;\nvarying float vOilSmooth;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvSpinePosition = position;\nvOilSmooth = oilSmooth;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vSpinePosition;
        // 1 on the smooth oily wings, collars and drips; 0 on the carved crystal bodies.
        varying float vOilSmooth;
        uniform vec3 uOilTeal;
        uniform vec3 uOilGreen;
        uniform vec3 uOilViolet;
        uniform float uOilGlow;
        uniform float uOilTime;
        ${noise}
        ${oilFragment}`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        #ifndef OIL_LITE
          roughnessFactor = oilRoughness(roughnessFactor, vSpinePosition);
        #endif
        // Wings and collars: wet, near-mirror oil.
        roughnessFactor = mix(roughnessFactor, 0.28, vOilSmooth);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        #if !defined(SCULPTED) && !defined(OIL_LITE)
          // Grain and chips on the bodies only; the wings stay smooth.
          normal = normalize(mix(oilGrain(normal, vSpinePosition), normal, vOilSmooth));
        #endif`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        #ifdef USE_IRIDESCENCE
          oilStreaks(material.iridescence, material.iridescenceThickness, vSpinePosition,
            iridescenceThicknessMinimum, iridescenceThicknessMaximum);
          // The oily rainbow lives on the wings' edges and collars.
          material.iridescence = mix(material.iridescence * 0.45, min(1.0, material.iridescence * 2.2), vOilSmooth);
        #endif`,
      )
      .replace(
        '#include <opaque_fragment>',
        `// One lit sculpture: a lilac rim light along its whole silhouette (wings included);
        // the darkest values stay in the crevices.
        {
          float rimLight = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.5);
          outgoingLight += mix(uOilViolet, vec3(1.0), 0.35) * rimLight * 0.3;
        }
        // Wings: the body's lilac, lit, never a black mirror.
        outgoingLight += uOilViolet * 0.16 * vOilSmooth;
        // Inner glitter: tiny bright points twinkling inside the bodies (not the wings).
        {
          vec3 cell = floor(vSpinePosition * 46.0);
          float h = fract(sin(dot(cell, vec3(12.99, 78.23, 37.71))) * 43758.55);
          float twinkle = 0.5 + 0.5 * sin(h * 80.0 + uOilTime * (1.0 + h * 2.0));
          outgoingLight += vec3(1.0, 0.86, 1.0) * step(0.992, h) * twinkle * 1.6 * (1.0 - vOilSmooth);
        }
        outgoingLight += oilStreakGlow(normal, normalize(vViewPosition), uOilTeal, uOilGreen,
          uOilViolet, uOilGlow * (0.6 + 1.6 * vOilSmooth));
        #include <opaque_fragment>`,
      )
  }
  return material
}

export function disposeOilMaterial(material: MeshPhysicalMaterial) {
  material.normalMap?.dispose()
  material.dispose()
}
