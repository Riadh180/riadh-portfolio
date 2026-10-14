import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BufferAttribute, BufferGeometry, type Mesh, type MeshPhysicalMaterial } from 'three'
import { sceneConfig } from '@/styles/scene'
import type { SceneClock } from '../useSceneClock'
import { createOilMaterial, disposeOilMaterial } from './oilMaterial'
import { createSpineGeometry } from './spineGeometry'
import { loadSpineModel } from './spineModel'

type Props = { clock: SceneClock }

/**
 * The Work spine: one heavy, sculpted column of dark pieces with an oily sheen, turning
 * slowly. Uses the sculpted model from public/models/spine.glb when it exists (with its
 * baked normal map), otherwise the procedural stand-in. Either way: one mesh, one
 * reflective material, one draw call.
 */
export function Spine({ clock }: Props) {
  const mesh = useRef<Mesh>(null)
  const gl = useThree((state) => state.gl)
  const standIn = useStandIn()
  const material = useMemo(() => createOilMaterial(), [])
  const [model, setModel] = useState<BufferGeometry | null>(null)

  useEffect(() => {
    let cancelled = false
    let loaded: BufferGeometry | undefined
    void loadSpineModel(gl).then((result) => {
      if (!result) return
      loaded = result.geometry
      if (cancelled) {
        result.geometry.dispose()
        result.normalMap?.dispose()
        return
      }
      // The sculpt carries its own detail: use its normal map, drop the procedural grain.
      if (result.normalMap) {
        material.normalMap = result.normalMap
        material.defines = { ...material.defines, SCULPTED: '' }
        material.needsUpdate = true
      }
      setModel(result.geometry)
    })
    return () => {
      cancelled = true
      loaded?.dispose()
    }
  }, [gl, material])

  useEffect(() => () => standIn?.dispose(), [standIn])
  useEffect(() => () => disposeOilMaterial(material), [material])

  useFrame(() => {
    if (!mesh.current) return
    const { turn, sheen, gloss } = sceneConfig.spine
    mesh.current.rotation.y = clock.time * turn
    const oil = mesh.current.material as MeshPhysicalMaterial
    oil.iridescence = sheen
    oil.roughness = 1 - gloss
  })

  const geometry = model ?? standIn
  return geometry ? <mesh ref={mesh} geometry={geometry} material={material} /> : null
}

type Built = {
  attributes: Record<string, { array: Float32Array; itemSize: number }>
  index: Uint32Array | null
}

/**
 * The procedural stand-in, built in a worker (it is far down the path; the hero must not
 * wait for it). Falls back to building it here if workers are unavailable.
 */
function useStandIn() {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null)
  useEffect(() => {
    let worker: Worker | null = null
    try {
      worker = new Worker(new URL('./spine.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      worker = null
    }
    if (!worker) {
      const idle = window.setTimeout(() => setGeometry(createSpineGeometry()), 1500)
      return () => window.clearTimeout(idle)
    }
    worker.onmessage = ({ data }: MessageEvent<Built>) => {
      const built = new BufferGeometry()
      for (const [name, { array, itemSize }] of Object.entries(data.attributes)) {
        built.setAttribute(name, new BufferAttribute(array, itemSize))
      }
      if (data.index) built.setIndex(new BufferAttribute(data.index, 1))
      built.computeBoundingSphere()
      setGeometry(built)
      worker?.terminate()
    }
    worker.postMessage(null)
    return () => worker?.terminate()
  }, [])
  return geometry
}
