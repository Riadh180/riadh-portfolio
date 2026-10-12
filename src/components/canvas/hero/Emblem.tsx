import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, type Mesh, MeshPhysicalMaterial } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import type { Pointer } from '../usePointer'
import type { SceneClock } from '../useSceneClock'
import { TorusKnotCurve, createBandGeometry, roundedSquareCurve } from './bandGeometry'
import { createFilmTexture, createSmudgeTexture } from './glassTextures'
import { idleSpin } from './motion'

type Props = {
  pointer: Pointer
  clock: SceneClock
  reducedMotion: boolean
}

/** Resting angle: slightly off face-on so the bands catch the light while it dwells. */
const REST = { x: 0.14, y: -0.25 }

/** Copies the live glass settings onto the shared material. */
function applyGlass(material: MeshPhysicalMaterial) {
  const glass = sceneConfig.glass
  material.transmission = glass.transmission
  material.roughness = glass.roughness
  material.ior = glass.ior
  material.thickness = glass.thickness
  material.dispersion = glass.dispersion
  material.iridescence = glass.iridescence
  material.iridescenceIOR = glass.iridescenceIOR
  material.iridescenceThicknessRange = [glass.iridescenceMin, glass.iridescenceMax]
}

/** The calm outside: a flat, bevelled band in the app-icon outline. */
function createFrame() {
  return createBandGeometry(roundedSquareCurve(), {
    width: 0.22,
    depth: 0.08,
    chamfer: 0.04,
    innerChamfer: 0.015,
    segments: 600,
  })
}

/** The complex inside: a trefoil drawn as a flat band, about half the frame's inner width. */
function createKnot() {
  return createBandGeometry(new TorusKnotCurve(0.25, 2, 3), {
    width: 0.08,
    depth: 0.05,
    chamfer: 0.025,
    segments: 800,
  })
}

/**
 * "The Core": a hollow glass frame in the app-icon outline (effortless outside) around an
 * open center holding a knotted glass core (complex inside). Both are flat bands of cut
 * glass: a clear, lightly scratched face between crisp bevelled edges. It turns slowly on its own; the cursor adds a small,
 * late tilt that the core leans against.
 */
export function Emblem({ pointer, clock, reducedMotion }: Props) {
  const group = useRef<Group>(null)
  const core = useRef<Mesh>(null)
  const frameMesh = useRef<Mesh>(null)
  const tilt = useRef({ x: 0, y: 0 })
  const frame = useMemo(() => createFrame(), [])
  const knot = useMemo(() => createKnot(), [])
  const glass = useMemo(() => {
    const film = createFilmTexture()
    const smudge = createSmudgeTexture()
    const material = new MeshPhysicalMaterial({
      color: sceneColors.glass,
      metalness: 0,
      specularIntensity: 1,
      envMapIntensity: 1.2,
      iridescenceMap: film,
      iridescenceThicknessMap: film,
      roughnessMap: smudge,
      specularIntensityMap: smudge,
    })
    applyGlass(material)
    return material
  }, [])
  useEffect(
    () => () => {
      frame.dispose()
      knot.dispose()
      glass.iridescenceMap?.dispose()
      glass.roughnessMap?.dispose()
      glass.dispose()
    },
    [frame, knot, glass],
  )

  useFrame(({ size }, delta) => {
    if (!group.current || !core.current) return
    const { emblem } = sceneConfig
    const t = clock.time
    // Heavily damped (~0.8s) so the object feels heavy, as in the reference.
    const ease = 1 - Math.exp(-Math.min(delta, 1 / 30) * 1.3)
    const tiltX = reducedMotion ? 0 : -(pointer.uv.y - 0.5) * emblem.tilt
    const tiltY = reducedMotion ? 0 : (pointer.uv.x - 0.5) * emblem.tilt * 1.4

    tilt.current.x += (tiltX - tilt.current.x) * ease
    tilt.current.y += (tiltY - tilt.current.y) * ease
    // The idle turn is continuous, never damped: highlights slide along the bands as it turns.
    const spin = reducedMotion ? 0 : idleSpin(t, emblem.halfTurn, emblem.dwell)

    const g = group.current
    g.rotation.x = REST.x + tilt.current.x + Math.sin(t * 0.3) * 0.05
    g.rotation.y = REST.y + tilt.current.y + spin
    g.position.y = 0.15 + Math.sin(t * 0.5) * emblem.float
    // Portrait screens see a narrower slice of the world: keep the emblem's share of width.
    g.scale.setScalar(emblem.scale * Math.min(1, Math.max(0.55, (size.width / size.height) * 0.9)))

    // The knot spins in plane and leans against the cursor tilt; its own wobble stays small
    // so its bevels keep catching the horizon light.
    core.current.rotation.set(
      Math.sin(t * 0.2) * 0.15 - tilt.current.x * 1.6,
      Math.sin(t * 0.15) * 0.2 - tilt.current.y * 1.6,
      t * 0.15,
    )

    // Frame and knot share one material: live-tune it through the frame.
    const material = frameMesh.current?.material as MeshPhysicalMaterial | undefined
    if (material) applyGlass(material)
  })

  return (
    <group ref={group}>
      <mesh ref={frameMesh} geometry={frame} material={glass} />
      <mesh ref={core} geometry={knot} material={glass} />
    </group>
  )
}
