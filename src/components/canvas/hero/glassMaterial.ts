import { Color, type DataTexture, MeshPhysicalMaterial, Vector2, Vector4 } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import { addGlassBody } from '../glass/glassBody'
import { BAND_EDGES, CHAMFER_EDGES, GROOVE_EDGES } from './bandGeometry'
import { type GlassLook, surfaceKey } from './glassLook'
import {
  createEngravingTexture,
  createFilmTexture,
  createRimTexture,
  createSurfaceTexture,
  fillTexels,
  writeEngravingTexture,
  writeFilmTexture,
  writeSurfaceTexture,
} from './glassTextures'

const byte = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255)

/** Runs `task` in an idle moment (soon after the next frames), off the current task. */
function later(task: () => void) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(task, { timeout: 300 })
  } else {
    window.setTimeout(task, 50)
  }
}

/** The two profile walls that stand square to the faces: the inner and outer sides. */
const SIDE_EDGES = [5, 12]

/** GLSL test for "edge is one of these" (band edge indices are exact integers). */
const anyOf = (edges: number[]) => edges.map((e) => `edge == ${e.toFixed(1)}`).join(' || ')

/**
 * A colour as a light tint of a given brightness (Rec. 709 luminance, default 1), its
 * strongest channel capped so a deep blue doesn't turn into a neon spike.
 */
function tint(color: Color, luminance = 1, cap = 3) {
  const own = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722
  const scale = Math.min(luminance / Math.max(own, 1e-3), cap / Math.max(color.r, color.g, color.b))
  return color.clone().multiplyScalar(scale)
}

/**
 * The Core's own light, on top of the physical glass:
 * - A thin film along the bevels, grooves and sides whose thickness runs along the outline
 *   (one hue cycle every `uFilmCycle` world units), so each cut edge carries a fixed rainbow;
 *   it slides along the rim only because The Core turns against the light (MOTION.md §1).
 * - The light drift: every reflection (and the bevels' own glow) is tinted from cool towards
 *   warm copper by `uWarm`, a slow drift set per frame, so the environment never re-renders
 *   for it. `uRimWarm` (lite) holds a gentle warm tint on the rims instead.
 */
function addCoreLight(material: MeshPhysicalMaterial) {
  const { film } = sceneConfig
  const uniforms = {
    uBevelFilm: { value: 1 },
    uBevelHue: { value: film.hue },
    // Where the rainbow spot shows: the cut edges reflecting this direction (view space, up
    // and to the left, in the emblem's plane) and how wide the cone is (cosine threshold).
    // The camera holds still at the hero, so as The Core turns the spot slides along the rim.
    uSpot: { value: new Vector4(-0.72, 0.62, 0.3, 0).normalize().setW(film.spot) },
    // The film's hues round the rim, as in the reference's ring: aqua, green, gold, pink,
    // blue (each a tint of about the same brightness, so the line keeps its light).
    uFilmColors: {
      value: [
        sceneColors.glow,
        sceneColors.emerald,
        sceneColors.warm,
        sceneColors.pink,
        sceneColors.blue,
      ].map((color) => tint(color, 0.85)),
    },
    uFilmRange: { value: new Vector2(film.min, film.max) },
    uFilmCycle: { value: film.cycle },
    uWarm: { value: 0 },
    uRimWarm: { value: 0 },
    // Cool: the glass's own cold white. Copper: the warm token leaning to ember, a little
    // darker than white light, as when the reference's ribbon turns copper-red.
    uCool: { value: tint(sceneColors.glass) },
    uCopper: {
      value: tint(sceneColors.warm.clone().lerp(sceneColors.ember, 0.35)).multiplyScalar(0.9),
    },
  }
  const previous = material.onBeforeCompile.bind(material)
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uBevelFilm;
        uniform float uBevelHue;
        uniform vec4 uSpot;
        uniform vec3 uFilmColors[5];
        uniform vec2 uFilmRange;
        uniform float uFilmCycle;
        uniform float uWarm;
        uniform float uRimWarm;
        uniform vec3 uCool;
        uniform vec3 uCopper;`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        float coreCut = 0.0;
        float coreHue = 0.0;
        #ifdef USE_IRIDESCENCE
        {
          // Band UVs (the rim map's): u along the outline in world units, v round the profile.
          float edge = floor(vEmissiveMapUv.y * ${BAND_EDGES.toFixed(1)});
          // The square side walls only a little: seen flat at the statement, a full film there
          // turns The Core's held slit into a rainbow slab.
          coreCut = (${anyOf(CHAMFER_EDGES)}) ? 1.0 : (${anyOf(GROOVE_EDGES)}) ? 0.9
            : (${anyOf(SIDE_EDGES)}) ? 0.25 : 0.0;
          if (coreCut > 0.0) {
            // A triangle wave along the outline sweeps the film through every hue in turn;
            // each edge is offset a little, so neighbouring cuts never match.
            float cycle = vEmissiveMapUv.x / uFilmCycle + edge * 0.11;
            float sweep = smoothstep(0.0, 1.0, abs(fract(cycle) * 2.0 - 1.0));
            material.iridescence = mix(material.iridescence, uBevelFilm, coreCut);
            material.iridescenceThickness = mix(
              material.iridescenceThickness, mix(uFilmRange.x, uFilmRange.y, sweep), coreCut);
            // The hue seen along the cut shifts with the angle of view, so as The Core turns
            // the colours travel round the rim.
            coreHue = cycle + (1.0 - saturate(dot(normal, normalize(vViewPosition)))) * 0.6;
          }
        }
        #endif`,
      )
      .replace(
        '#include <lights_fragment_maps>',
        `#include <lights_fragment_maps>
        {
          float grazing = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
          vec3 tint = mix(uCool, uCopper, saturate(uWarm + uRimWarm * grazing * grazing));
          radiance *= tint;
          totalEmissiveRadiance *= tint;
          // The physical film alone reads pastel under the bright edge light (the grade's
          // shoulder turns any bright line white): the cut edges take the film's hue, at a
          // brightness held under the shoulder so the colour survives; only the key's hot
          // sparkle stays white.
          if (coreCut > 0.0) {
            float x = fract(coreHue) * 5.0;
            int i = int(x);
            vec3 hue = mix(uFilmColors[i], uFilmColors[(i + 1) % 5], smoothstep(0.0, 1.0, fract(x)));
            // A little purer than the tokens: thin film is more saturated than paint.
            hue = max(mix(vec3(dot(hue, vec3(0.2126, 0.7152, 0.0722))), hue, 1.45), 0.0);
            float light = dot(radiance, vec3(0.2126, 0.7152, 0.0722));
            vec3 colored = hue * light / (1.0 + light * 0.6) * 1.4;
            colored = mix(colored, radiance, smoothstep(10.0, 60.0, light));
            // Vivid in one spot (where the cut mirrors the spot direction), a faint tint elsewhere.
            vec3 r = reflect(-normalize(vViewPosition), normal);
            float spot = smoothstep(uSpot.w, 1.0, dot(r, uSpot.xyz));
            float amount = uBevelHue * coreCut * (0.3 + 0.7 * spot);
            radiance = mix(radiance, colored, amount);
            // The bevels' own faint glow takes the hue too (white, it washed the colour out).
            totalEmissiveRadiance = mix(totalEmissiveRadiance, totalEmissiveRadiance * hue, amount);
          }
        }`,
      )
  }
  const key = material.customProgramCacheKey.bind(material)
  material.customProgramCacheKey = () => `${key()}|coreLight`
  material.userData.core = uniforms
  return uniforms
}

/** Clear glass with a thin film; the look decides the rest (see GlassLook). */
export function createGlassMaterial(look: GlassLook) {
  const film = createFilmTexture()
  const surface = createSurfaceTexture()
  const engraving = createEngravingTexture()
  // The detail of the film, the smudges and the engraving is drawn texel by texel (a noise
  // field of ~1M samples): in an idle moment just after the first frame, not in the hero's
  // mounting task. Until then the maps hold their plain values (clean glass, no film), so
  // the shader is the same and nothing recompiles; The Core is still resolving out of the
  // intro's dust by then.
  fillTexels(film, 0, byte(0.5), 0, 255)
  fillTexels(surface, 0, byte(look.roughness), 0, 255)
  const material = new MeshPhysicalMaterial({
    color: sceneColors.glass,
    metalness: 0,
    // The surface map carries the actual roughness and specular strength.
    roughness: 1,
    roughnessMap: surface,
    specularIntensityMap: surface,
    // Fine engraved hairlines on the faces (crafted glass up close).
    normalMap: engraving,
    normalScale: new Vector2(0.6, 0.6),
    ior: 1.5,
    dispersion: 0.3,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 400],
    iridescenceMap: film,
    iridescenceThicknessMap: film,
    emissive: sceneColors.glass,
    emissiveMap: createRimTexture(),
  })
  // The maps' detail comes later (above): the look's key marks them as written for now.
  material.userData.surfaceKey = surfaceKey(look)
  applyGlassLook(material, look)
  later(() => {
    if (material.userData.disposed) return
    writeEngravingTexture(engraving)
    writeFilmTexture(film, look)
    writeSurfaceTexture(surface, look)
    material.userData.surfaceKey = surfaceKey(look)
  })
  // Thick glass: light held in the band's body, not just bright edges on black.
  addGlassBody(material, {
    color: new Color().copy(sceneColors.glass).lerp(sceneColors.teal, 0.2),
    strength: 0.05,
    edge: 0.8,
  })
  addCoreLight(material)
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
 * `warm` (0..1) drifts the reflections from cool to warm copper; `rimWarm` (0..1) holds a
 * gentle warm tint on the rims (the lite tier's stand-in for the drift).
 */
export function applyGlassLook(
  material: MeshPhysicalMaterial,
  look: GlassLook,
  { facing = 1, depth = 1, rainbow = 0, reflectOnly = false, warm = 0, rimWarm = 0 } = {},
) {
  material.transmission = reflectOnly ? 0 : look.transmission
  // Without transmission a light body scatters like plastic: keep it dark glass.
  material.color.copy(sceneColors.glass).multiplyScalar(reflectOnly ? 0.04 : 1)
  material.thickness = look.thickness * depth
  material.dispersion = 0.3 + rainbow * 4.5
  material.envMapIntensity = look.envIntensity * (0.05 + 0.95 * facing)
  material.iridescence = look.iridescence
  material.emissiveIntensity = look.rim * (1 - 0.6 * rainbow)
  const core = material.userData.core as ReturnType<typeof addCoreLight> | undefined
  if (core) {
    core.uWarm.value = warm
    core.uRimWarm.value = rimWarm
    core.uFilmRange.value.set(sceneConfig.film.min, sceneConfig.film.max)
    core.uFilmCycle.value = sceneConfig.film.cycle
    core.uBevelHue.value = sceneConfig.film.hue
    core.uSpot.value.w = sceneConfig.film.spot
  }

  const key = surfaceKey(look)
  if (material.userData.surfaceKey === key) return
  material.userData.surfaceKey = key
  writeFilmTexture(material.iridescenceMap as DataTexture, look)
  writeSurfaceTexture(material.roughnessMap as DataTexture, look)
}

export function disposeGlassMaterial(material: MeshPhysicalMaterial) {
  material.userData.disposed = true
  material.iridescenceMap?.dispose()
  material.roughnessMap?.dispose()
  material.emissiveMap?.dispose()
  material.normalMap?.dispose()
  material.dispose()
}
