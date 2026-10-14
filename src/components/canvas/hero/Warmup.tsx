import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useLoading } from '@/stores/loading'

/**
 * Once the scene is mounted: compiles its shaders ahead of the first frames (in parallel
 * where the browser supports it), the preloader's last real step.
 */
export function Warmup() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    const { complete } = useLoading.getState()
    complete('scene')
    let cancelled = false
    // Two frames in, so every place's objects exist.
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        void gl
          .compileAsync(scene, camera)
          .catch(() => undefined)
          .then(() => {
            if (!cancelled) complete('shaders')
          })
      }),
    )
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [gl, scene, camera])

  return null
}
