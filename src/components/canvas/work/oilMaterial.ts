import { Color, MeshPhysicalMaterial } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import noise from '../shaders/noise.glsl'
import oilFragment from '../shaders/oil.glsl'

/**
 * The spine's material: glossy vertebrae. A deep indigo body, near-black in the necks and
 * hollows, broad softened facets on smooth lobes, a near-mirror clear coat so the
 * environment and the key light leave a few large, crisp highlights, each ringed by a thin
 * film (teal → pink → gold) that also lines the grazing edges, and sparse deep glints
 * inside. Reflective only, no transmission: one material, one draw call.
 *
 * The detail is added to three's physical shader (oil.glsl).
 */
export function createOilMaterial() {
  const material = new MeshPhysicalMaterial({
    // Deep indigo-violet: dark enough that the facets' highlights carry the form.
    color: new Color().copy(sceneColors.violet).lerp(sceneColors.blue, 0.15).multiplyScalar(0.12),
    metalness: 0.9,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 1,
    iridescenceIOR: 2.1,
    iridescenceThicknessRange: [380, 820],
    envMapIntensity: 1.4,
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
          oilGrazing = smoothstep(0.7, 0.98, 1.0 - abs(dot(normal, normalize(vViewPosition))));
          oilStreaks(material.iridescence, material.iridescenceThickness, vSpinePosition,
            iridescenceThicknessMinimum, iridescenceThicknessMaximum);
        #endif`,
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          float facing = abs(dot(normal, normalize(vViewPosition)));
          // The necks and hollows fall to near-black; the lobes keep their light.
          outgoingLight *= mix(1.0, 0.1, smoothstep(0.2, 0.85, vCrevice));
          // A thin, cold rim along the silhouette only.
          outgoingLight += mix(uOilViolet, uOilTeal, 0.3) * pow(1.0 - facing, 5.0) * 0.08;
          // The key highlight: broad and crisp in its centre, ringed by a thin film that
          // runs teal → pink → gold towards its edge; with the broad facets, each lobe holds
          // one to three of them, and they slide over the lobes as the camera turns.
          vec3 key = normalize(normalize(vec3(-0.45, 0.7, 0.55)) + normalize(vViewPosition));
          float k = max(dot(normal, key), 0.0);
          float core = pow(k, 140.0);
          float ring = clamp(pow(k, 36.0) - core * 1.5, 0.0, 1.0);
          float along = clamp((1.0 - k) * 28.0, 0.0, 1.0);
          vec3 film = along < 0.5 ? mix(uOilTeal, uOilPink, along * 2.0) : mix(uOilPink, uOilGold, along * 2.0 - 1.0);
          float lit = 1.0 - vCrevice * 0.85;
          outgoingLight += (vec3(1.0) * core * 2.2 + film * ring * 0.9) * lit;
          // Inner glitter: sparse, deep points between the highlights.
          vec3 cell = floor(vSpinePosition * 46.0);
          float h = fract(sin(dot(cell, vec3(12.99, 78.23, 37.71))) * 43758.55);
          float twinkle = 0.5 + 0.5 * sin(h * 80.0 + uOilTime * (1.0 + h * 2.0));
          outgoingLight += vec3(1.0, 0.86, 1.0) * step(0.9984, h) * twinkle * 1.2 * (1.0 - vCrevice * 0.7);
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
