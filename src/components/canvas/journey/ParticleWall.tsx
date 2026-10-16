import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, type Color, type Group, type ShaderMaterial } from 'three'
import { valueNoise3 } from '../noise'
import type { SceneClock } from '../useSceneClock'
import { syncGrainTier } from '../particles/CursorField'
import { createMotesGeometry, createMotesUniforms, gaussian, grainMotes } from './motes'

/** The sheet: a wide disc of dust, thin, gathered into clouds with dark gaps between. */
const SHEET = { radius: 22, thickness: 0.45, count: 18000 }

/** Cells of the density grid the sheet is sampled from. */
const GRID = 64

/**
 * Clumped, never even: a cloudy density over the disc on a coarse grid, then each mote
 * picks a cell in proportion to its density (a cumulative table) and a spot inside it.
 * Cheap enough to build at load (a few thousand noise samples, not millions).
 */
function createSheet(seed: number) {
  const cell = (SHEET.radius * 2) / GRID
  const cumulative = new Float32Array(GRID * GRID)
  let total = 0
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const x = -SHEET.radius + (i + 0.5) * cell
      const z = -SHEET.radius + (j + 0.5) * cell
      const inside = x * x + z * z < SHEET.radius * SHEET.radius
      const cloud =
        valueNoise3(x * 0.22, z * 0.22, seed, seed) * 0.7 +
        valueNoise3(x * 0.7, z * 0.7, seed + 3, seed) * 0.3
      total += inside ? cloud ** 3 : 0
      cumulative[j * GRID + i] = total
    }
  }
  return createMotesGeometry(SHEET.count, (_, out) => {
    const r = Math.random() * total
    let lo = 0
    let hi = cumulative.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if ((cumulative[mid] ?? 0) < r) lo = mid + 1
      else hi = mid
    }
    const x = -SHEET.radius + ((lo % GRID) + Math.random()) * cell
    const z = -SHEET.radius + (Math.floor(lo / GRID) + Math.random()) * cell
    const cloud = valueNoise3(x * 0.22, z * 0.22, seed, seed)
    out.set(x, gaussian() * SHEET.thickness * (0.4 + cloud), z)
  })
}

type Props = {
  clock: SceneClock
  /** World height of the sheet's centre, and its tilt (the edge reads as a diagonal). */
  y: number
  tilt: [number, number]
  colors: [Color, Color, Color]
  seed: number
}

/**
 * A transition as an event: a dense, colourful wall of dust across the path between two
 * places. The camera flies through it on the way down; its tilt makes it sweep across the
 * frame as a diagonal (the reference's particle sheet). Hidden unless the camera is near.
 */
export function ParticleWall({ clock, y, tilt, colors, seed }: Props) {
  const group = useRef<Group>(null)
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => createSheet(seed), [seed])
  const uniforms = useMemo(() => createMotesUniforms(colors, undefined, true), [colors])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ camera, size, viewport }) => {
    const g = group.current
    if (!g || !material.current) return
    // Present while the camera is within a few units of the sheet: it builds as the camera
    // approaches, peaks as it passes through, and is gone well before the next place.
    const distance = Math.abs(camera.position.y - y)
    const amount = 1 - Math.min(1, Math.max(0, (distance - 1.5) / 4.5))
    g.visible = amount > 0.01
    if (!g.visible) return
    syncGrainTier(material.current)
    const u = material.current.uniforms
    u.uTime!.value = clock.time
    u.uOpacity!.value = amount * amount * 4.8
    u.uSize!.value = 0.026
    u.uCycle!.value = clock.time * 0.05 + seed
    u.uSpread!.value = 0.8
    u.uDrift!.value = 0.08
    // Close motes stay sparks rather than huge discs, so the wall reads as dense dust.
    u.uAperture!.value = 0.6
    u.uMaxSize!.value = 8 * viewport.dpr
    u.uFocusDistance!.value = 6
    u.uFogFar!.value = 40
    u.uViewportHeight!.value = size.height * viewport.dpr
  })

  return (
    <group ref={group} position-y={y} rotation={[tilt[0], 0, tilt[1]]} visible={false}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={material}
          vertexShader={grainMotes.vertexShader}
          fragmentShader={grainMotes.fragmentShader}
          defines={grainMotes.defines}
          uniforms={uniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  )
}
