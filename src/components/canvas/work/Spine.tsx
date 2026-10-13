import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Mesh, MeshPhysicalMaterial } from 'three'
import { sceneConfig } from '@/styles/scene'
import type { SceneClock } from '../useSceneClock'
import { createOilMaterial, disposeOilMaterial } from './oilMaterial'
import { createSpineGeometry } from './spineGeometry'

type Props = { clock: SceneClock }

/**
 * The Work spine: one heavy, sculpted column of fused dark pieces with an oily sheen,
 * turning slowly. A single mesh and a single reflective material: one draw call.
 */
export function Spine({ clock }: Props) {
  const mesh = useRef<Mesh>(null)
  const geometry = useMemo(() => createSpineGeometry(), [])
  const material = useMemo(() => createOilMaterial(), [])
  useEffect(
    () => () => {
      geometry.dispose()
      disposeOilMaterial(material)
    },
    [geometry, material],
  )

  useFrame(() => {
    if (!mesh.current) return
    const { turn, sheen, gloss } = sceneConfig.spine
    mesh.current.rotation.y = clock.time * turn
    const oil = mesh.current.material as MeshPhysicalMaterial
    oil.iridescence = sheen
    oil.roughness = 1 - gloss
  })

  return <mesh ref={mesh} geometry={geometry} material={material} />
}
