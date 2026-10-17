import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import type { Color } from 'three'
import { sceneConfig } from '@/styles/scene'
import { grainUniforms } from '../particles/CursorField'
import grainFragment from '../shaders/grain.frag'
import glassGrain from '../shaders/glassGrain.glsl'
import grainMotion from '../shaders/grainMotion.glsl'
import motesVertex from '../shaders/motes.vert'

/**
 * Motes drawn as the world's glass grains (trails, transition walls, Depth's plankton): the
 * shared grain look, the cursor and the place's light. Use with `createMotesUniforms(…,
 * true)`; Depth adds CAUSTIC to its defines.
 */
export const grainMotes = {
  vertexShader: `${grainMotion}\n${motesVertex}`,
  fragmentShader: `${glassGrain}\n${grainFragment}`,
  defines: { GRAIN: '' } as Record<string, string>,
}

/**
 * Uniforms for the motes shader (shaders/motes.vert + particles.frag); `grain`: drawn as glass
 * grains (see grainMotes), with the shared grain uniforms.
 */
export function createMotesUniforms(
  colors: [Color, Color, Color],
  origin = new Vector3(),
  grain = false,
) {
  return {
    ...(grain ? grainUniforms : {}),
    uTime: { value: 0 },
    uSize: { value: sceneConfig.particles.size },
    uAperture: { value: sceneConfig.particles.aperture },
    uFocusDistance: { value: sceneConfig.particles.focusDistance },
    uViewportHeight: { value: 1 },
    uOpacity: { value: 0 },
    uMaxSize: { value: 56 },
    uFogFar: { value: 30 },
    uOrigin: { value: origin },
    uExpand: { value: 0 },
    uDrift: { value: 0.05 },
    uColors: { value: colors },
    uCycle: { value: 0 },
    uSpread: { value: 1 },
  }
}

/** Points with a per-mote random seed (vec4), placed by `place(i, out)`. */
export function createMotesGeometry(count: number, place: (i: number, out: Vector3) => void) {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count * 4)
  const point = new Vector3()
  for (let i = 0; i < count; i++) {
    place(i, point)
    positions.set([point.x, point.y, point.z], i * 3)
    seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 4))
  return geometry
}

/** Standard normal sample (Box–Muller). */
export function gaussian() {
  return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random())
}
