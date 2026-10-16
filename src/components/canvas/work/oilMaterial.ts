import { Color, MeshPhysicalMaterial } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import noise from '../shaders/noise.glsl'
import oilFragment from '../shaders/oil.glsl'

/**
 * The spine's material: dark chrome vertebrae with glassy blades. A near-black metal whose
 * colour comes only from what it reflects: the dark studio, so the body stays deep
 * indigo-black, with a few small, sharp highlights that break up along carved grooves. A thin
 * film colours every reflection by angle (teal and pink, a little gold), strongest at grazing
 * angles and on the highlights' edges; white only in a highlight's hottest centre. The necks
 * and hollows fall to near-black. The thin parts (the processes, and a little every edge seen
 * at a grazing angle) read as tinted glass: a dark see-through body, the film glowing along
 * their rims. A soft band of light runs down the column every 7 s. Opaque, no transmission:
 * one material, one draw call.
 *
 * The detail is added to three's physical shader (oil.glsl).
 */
export function createOilMaterial() {
  const material = new MeshPhysicalMaterial({
    // Dark chrome: neutral with a trace of indigo (no lilac). For a metal the base colour
    // is the reflection's strength, and it is the only dial here: with the scene's shared
    // environment, three replaces envMapIntensity by scene.environmentIntensity.
    color: new Color().copy(sceneColors.glass).lerp(sceneColors.blue, 0.12).multiplyScalar(0.3),
    metalness: 1,
    roughness: 0.12,
    clearcoat: 0.5,
    clearcoatRoughness: 0.05,
  })
  material.userData.time = { value: 0 }
  material.userData.film = { value: sceneConfig.spine.sheen }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uOilTeal = { value: sceneColors.teal }
    shader.uniforms.uOilPink = { value: sceneColors.pink }
    shader.uniforms.uOilGold = { value: sceneColors.warm }
    shader.uniforms.uOilFilm = material.userData.film
    shader.uniforms.uOilTime = material.userData.time
    shader.uniforms.uOilEnds = { value: [sceneConfig.spine.top, sceneConfig.spine.bottom] }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSpinePosition;\nattribute float crevice;\nvarying float vCrevice;\nattribute float thin;\nvarying float vThin;\nvarying vec3 vSpineUp;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvSpinePosition = position;\nvCrevice = crevice;\nvThin = thin;\nvSpineUp = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vSpinePosition;
        // 0 on the crests, 1 deep in the carving and the necks.
        varying float vCrevice;
        // 0 on the core; 0 → 1 along each process's blade, root to tip.
        varying float vThin;
        // The column's up, in view space (for the grooves).
        varying vec3 vSpineUp;
        uniform vec3 uOilTeal;
        uniform vec3 uOilPink;
        uniform vec3 uOilGold;
        uniform float uOilFilm;
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
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        #ifndef SCULPTED
          #ifndef OIL_LITE
            normal = oilFacets(normal, vSpinePosition);
          #endif
          normal = oilGrooves(normal, vSpinePosition, vSpineUp);
        #endif`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        #ifndef OIL_LITE
          roughnessFactor = oilRoughness(roughnessFactor);
        #endif
        // Softer along the silhouette, where a mirror would alias into single bright pixels,
        // and on the thin blades (a few pixels wide, they would sparkle along every edge).
        roughnessFactor = mix(roughnessFactor, 0.4,
          pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 4.0));
        roughnessFactor = mix(roughnessFactor, 0.55, smoothstep(0.1, 0.45, vThin) * 0.8);`,
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          vec3 view = normalize(vViewPosition);
          float facing = abs(dot(normal, view));
          // The thin film: every reflection takes the film's colour by angle (teal and pink,
          // a little gold), strongest at grazing angles; a highlight's hottest centre stays
          // white.
          float bright = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
          vec3 film = oilFilm((1.0 - facing) * 1.3
            + sin(vSpinePosition.y * 1.7 + sin(vSpinePosition.x * 2.3 + vSpinePosition.z * 1.9)) * 0.18,
            uOilTeal, uOilPink, uOilGold);
          float filmed = uOilFilm * (0.65 + 0.35 * smoothstep(0.2, 0.85, 1.0 - facing))
            * (1.0 - smoothstep(0.9, 2.2, bright));
          outgoingLight = mix(outgoingLight, film * bright * 1.9, filmed);
          // The necks and hollows fall to near-black; the plates keep their light.
          outgoingLight *= mix(1.0, 0.08, smoothstep(0.2, 0.85, vCrevice));
          // Away from the silhouette only: at grazing angles a mirror highlight (and the
          // glitter) aliases into single bright pixels along the outline.
          float inside = smoothstep(0.08, 0.3, facing);
          // The key highlight: small and sharp, a hot white centre and a film-coloured edge,
          // broken up along the grooves; it slides over the plates as the camera turns.
          vec3 key = normalize(normalize(vec3(-0.45, 0.7, 0.55)) + view);
          float k = max(dot(normal, key), 0.0);
          float core = pow(k, 420.0);
          float ring = clamp(pow(k, 140.0) - core * 1.5, 0.0, 1.0);
          float lit = 1.0 - vCrevice * 0.9;
          outgoingLight += (vec3(1.0) * core * 2.4 + film * ring * 1.1) * lit * inside;
          // Inner glitter: sparse, deep points between the highlights.
          vec3 cell = floor(vSpinePosition * 46.0);
          float h = fract(sin(dot(cell, vec3(12.99, 78.23, 37.71))) * 43758.55);
          float twinkle = 0.5 + 0.5 * sin(h * 80.0 + uOilTime * (1.0 + h * 2.0));
          outgoingLight += vec3(1.0, 0.86, 1.0) * step(0.9984, h) * twinkle * 1.2
            * (1.0 - vCrevice * 0.7) * inside * (1.0 - vThin);
          // The light sweep: every 7 s a soft band of light runs down the whole column, like a
          // light passing over a sculpture; strongest where the surface turns away.
          float sweepY = mix(uOilEnds.x + 1.5, uOilEnds.y - 1.5, fract(uOilTime / 7.0));
          float band = exp(-pow((vSpinePosition.y - sweepY) / 0.8, 2.0));
          float sheen = 0.2 + 0.8 * pow(1.0 - facing, 1.5);
          outgoingLight += mix(vec3(1.0), film, 0.75) * band * sheen * 0.35 * lit;
          // Glassy thin parts: the blades, and a little every edge seen at a grazing angle,
          // read as tinted glass: a dark see-through body with the film glowing along the rim
          // (the light behind them coming through). Lite: the rim tint only.
          float rim = pow(1.0 - facing, 1.5);
          float blade = smoothstep(0.1, 0.45, vThin);
          float glassy = max(blade, rim * rim * 0.35 * (1.0 - vCrevice));
          // The tips fade a little: a few pixels wide, they would flicker as single points.
          float tip = 1.0 - smoothstep(0.7, 1.0, vThin) * 0.6;
          #ifndef OIL_LITE
            vec3 glass = outgoingLight * 0.22 + film * (0.05 + rim * 0.35) + film * band * 0.5;
            outgoingLight = mix(outgoingLight, glass * tip, glassy * 0.9);
          #else
            outgoingLight += film * rim * 0.3 * glassy * tip;
          #endif
        }
        // The dissolving edge glints, like the grains it breaks into.
        outgoingLight += vec3(0.9, 0.8, 1.0) * oilTip * (1.0 - smoothstep(0.0, 0.06, oilChunk - oilTip)) * 1.5;
        #include <opaque_fragment>`,
      )
  }
  return material
}

export function disposeOilMaterial(material: MeshPhysicalMaterial) {
  material.normalMap?.dispose()
  material.dispose()
}
