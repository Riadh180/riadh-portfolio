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
    color: new Color().copy(sceneColors.violet).lerp(sceneColors.glass, 0.08).multiplyScalar(0.14),
    // Wet, polished stone-glass: glossy body under a full clear coat.
    metalness: 0.7,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 1,
    iridescenceIOR: 2.1,
    iridescenceThicknessRange: [380, 820],
    // Lifted towards the studio-lit concept (docs/spine-concept.png).
    envMapIntensity: 1.35,
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
          // Thin film strongest at grazing angles (violet → teal → gold).
          material.iridescence *= 0.35 + 0.65 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 1.5);
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
        // A soft inner glow in the crevices (where the surface faces away, low ambient):
        // a subsurface feel.
        {
          float crevice = smoothstep(0.35, 0.0, abs(dot(normal, normalize(vViewPosition))));
          outgoingLight += uOilViolet * 0.08 * (1.0 - crevice);
        }
        // Glitter inside the material: round sparks on two depth layers seen through the
        // surface (parallax with the view), each its own size and twinkle.
        {
          vec3 view = normalize(vViewPosition);
          for (int layer = 0; layer < 2; layer++) {
            float d = 0.05 + float(layer) * 0.07;
            vec3 q = (vSpinePosition + view * d) * (34.0 + float(layer) * 14.0);
            vec3 cell = floor(q);
            float h = fract(sin(dot(cell, vec3(12.99, 78.23, 37.71))) * 43758.55);
            vec3 centre = vec3(fract(h * 7.1), fract(h * 13.7), fract(h * 3.3)) * 0.6 + 0.2;
            float r = length(fract(q) - centre);
            float size = 0.05 + fract(h * 31.0) * 0.1;
            float spark = step(0.975, h) * smoothstep(size, 0.0, r);
            float twinkle = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(h * 80.0 + uOilTime * (0.6 + h * 1.5)), 4.0);
            outgoingLight += vec3(1.0, 0.88, 1.0) * spark * twinkle * (1.2 - float(layer) * 0.5);
          }
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
