import { Color, MeshPhysicalMaterial } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import noise from '../shaders/noise.glsl'
import oilFragment from '../shaders/oil.glsl'

/**
 * The spine's material: a gemstone. A deep indigo body, near-black in the carved hollows,
 * a crust of small facets (a facet-normal field on the smooth-shaded mesh), each with
 * its own thin-film colour, that flash as sharp points of pink, violet, teal or green-gold
 * when they turn towards the light, a film that strengthens at grazing angles and along a
 * few oily streaks, and tiny glints twinkling inside. Reflective only, no transmission: one
 * material, one draw call.
 *
 * The detail is added to three's physical shader (oil.glsl).
 */
export function createOilMaterial() {
  const material = new MeshPhysicalMaterial({
    // Deep indigo-violet: dark enough that the facets' highlights carry the form.
    color: new Color().copy(sceneColors.violet).lerp(sceneColors.blue, 0.35).multiplyScalar(0.12),
    metalness: 0.9,
    roughness: 0.15,
    clearcoat: 0.6,
    clearcoatRoughness: 0.06,
    iridescence: 1,
    iridescenceIOR: 2.1,
    iridescenceThicknessRange: [380, 820],
    envMapIntensity: 1.6,
  })
  material.userData.time = { value: 0 }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uOilTeal = { value: sceneColors.teal }
    shader.uniforms.uOilGreen = { value: sceneColors.emerald }
    shader.uniforms.uOilViolet = { value: sceneColors.violet }
    shader.uniforms.uOilPink = { value: sceneColors.pink }
    shader.uniforms.uOilGold = { value: sceneColors.warm }
    shader.uniforms.uOilGlow = { value: 0.8 }
    shader.uniforms.uOilTime = material.userData.time
    shader.uniforms.uOilEnds = { value: [sceneConfig.spine.top, sceneConfig.spine.bottom] }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSpinePosition;\nattribute float crevice;\nvarying float vCrevice;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvSpinePosition = position;\nvCrevice = crevice;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vSpinePosition;
        // 0 on the crests, 1 deep in the carving.
        varying float vCrevice;
        uniform vec3 uOilTeal;
        uniform vec3 uOilGreen;
        uniform vec3 uOilViolet;
        uniform vec3 uOilPink;
        uniform vec3 uOilGold;
        uniform float uOilGlow;
        uniform float uOilTime;
        uniform vec2 uOilEnds;
        ${noise}
        ${oilFragment}`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        // The tips dissolve into grains: small chunks drop out towards each end.
        float oilTip = max(smoothstep(uOilEnds.x - 4.0, uOilEnds.x, vSpinePosition.y),
          smoothstep(uOilEnds.y + 2.5, uOilEnds.y, vSpinePosition.y));
        float oilChunk = oilHash3(floor(vSpinePosition * 34.0)).x;
        if (oilChunk < oilTip) discard;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        #ifndef OIL_LITE
          roughnessFactor = oilRoughness(roughnessFactor, vSpinePosition);
        #endif`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        #ifndef SCULPTED
          // The crystal crust: small facets, each tilted its own way.
          normal = oilFacets(normal, vSpinePosition);
        #endif`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        #ifdef USE_IRIDESCENCE
          oilGrazing = smoothstep(0.45, 0.95, 1.0 - abs(dot(normal, normalize(vViewPosition))));
          oilStreaks(material.iridescence, material.iridescenceThickness, vSpinePosition,
            iridescenceThicknessMinimum, iridescenceThicknessMaximum);
        #endif`,
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          float facing = abs(dot(normal, normalize(vViewPosition)));
          // The hollows fall to near-black; the crests keep their light.
          outgoingLight *= mix(1.0, 0.18, smoothstep(0.2, 0.85, vCrevice));
          // A thin, cold rim along the silhouette only.
          outgoingLight += mix(uOilViolet, uOilTeal, 0.3) * pow(1.0 - facing, 5.0) * 0.22;
          // Facet glints: a facet turned towards the key direction flashes its own colour
          // (pink, violet, teal, green-gold), so the crust sparkles in many hues as it turns.
          vec3 key = normalize(normalize(vec3(-0.45, 0.7, 0.55)) + normalize(vViewPosition));
          float glint = pow(max(dot(normal, key), 0.0), 24.0);
          vec3 tint = oilFacet < 0.3 ? uOilPink : oilFacet < 0.55 ? uOilViolet
            : oilFacet < 0.8 ? uOilTeal : mix(uOilGreen, uOilGold, 0.6);
          outgoingLight += mix(tint, vec3(1.0), 0.2) * glint * 0.75 * (1.0 - vCrevice);
          // Inner glitter: tiny bright points twinkling inside the mass.
          vec3 cell = floor(vSpinePosition * 46.0);
          float h = fract(sin(dot(cell, vec3(12.99, 78.23, 37.71))) * 43758.55);
          float twinkle = 0.5 + 0.5 * sin(h * 80.0 + uOilTime * (1.0 + h * 2.0));
          outgoingLight += vec3(1.0, 0.86, 1.0) * step(0.992, h) * twinkle * 1.6 * (1.0 - vCrevice * 0.7);
        }
        // The dissolving edge glints, like the grains it breaks into.
        outgoingLight += vec3(0.9, 0.8, 1.0) * oilTip * (1.0 - smoothstep(0.0, 0.06, oilChunk - oilTip)) * 1.5;
        outgoingLight += oilStreakGlow(normal, normalize(vViewPosition), uOilTeal, uOilGreen,
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
