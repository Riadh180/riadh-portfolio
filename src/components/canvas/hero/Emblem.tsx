import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, type Mesh, MeshPhysicalMaterial } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import type { Pointer } from '../usePointer'
import type { SceneClock } from '../useSceneClock'
import { createFilmTexture } from './filmTexture'
import { createFrameGeometry } from './frameGeometry'
import { idleSpin } from './motion'

type Props = {
  pointer: Pointer
  clock: SceneClock
  reducedMotion: boolean
}

/** Resting angle: slightly off face-on so the tubes catch the light while it dwells. */
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

/**
 * "The Core": a hollow glass frame in the app-icon outline (effortless outside) around an
 * open center holding a knotted glass core (complex inside). Both are thin, clear glass
 * that reads through bright edges. It turns slowly on its own; the cursor adds a small,
 * late tilt that the core leans against.
 */
export function Emblem({ pointer, clock, reducedMotion }: Props) {
  const group = useRef<Group>(null)
  const core = useRef<Mesh>(null)
  const frameMesh = useRef<Mesh>(null)
  const tilt = useRef({ x: 0, y: 0 })
  const frame = useMemo(() => createFrameGeometry(), [])
  const glass = useMemo(() => {
    const material = new MeshPhysicalMaterial({
      color: sceneColors.glass,
      metalness: 0,
      specularIntensity: 1,
      envMapIntensity: 1.8,
      iridescenceThicknessMap: createFilmTexture(),
    })
    applyGlass(material)
    return material
  }, [])
  useEffect(
    () => () => {
      frame.dispose()
      glass.iridescenceThicknessMap?.dispose()
      glass.dispose()
    },
    [frame, glass],
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
    // The idle turn is continuous, never damped: highlights slide along the tubes as it turns.
    const spin = reducedMotion ? 0 : idleSpin(t, emblem.halfTurn, emblem.dwell)

    const g = group.current
    g.rotation.x = REST.x + tilt.current.x + Math.sin(t * 0.3) * 0.05
    g.rotation.y = REST.y + tilt.current.y + spin
    g.position.y = 0.15 + Math.sin(t * 0.5) * emblem.float
    // Portrait screens see a narrower slice of the world: keep the emblem's share of width.
    g.scale.setScalar(Math.min(1, Math.max(0.55, (size.width / size.height) * 0.9)))

    // The knot spins in plane and leans against the cursor tilt.
    core.current.rotation.set(
      Math.sin(t * 0.2) * 0.35 - tilt.current.x * 1.6,
      Math.sin(t * 0.15) * 0.45 - tilt.current.y * 1.6,
      t * 0.15,
    )

    // Frame and knot share one material: live-tune it through the frame.
    const material = frameMesh.current?.material as MeshPhysicalMaterial | undefined
    if (material) applyGlass(material)
  })

  return (
    <group ref={group}>
      <mesh ref={frameMesh} geometry={frame} material={glass} />
      {/* A simple trefoil about half the frame's inner width, tube as thick as the frame's. */}
      <mesh ref={core} material={glass}>
        <torusKnotGeometry args={[0.22, 0.1, 600, 40, 2, 3]} />
      </mesh>
    </group>
  )
}
