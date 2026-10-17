import { useThree } from '@react-three/fiber'
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { useJourney } from '@/stores/journey'
import { compileForTarget } from './compile'

/**
 * Lazy places: the hero renders at load; the places further down the path are built only
 * once the visitor engages (first scroll, key, touch or pointer move), one per idle moment
 * in path order, so a visitor who only reads the hero never pays for them and building
 * never blocks the page in one long task. Everything mounts at once as soon as the
 * visitor leaves the hero (a scroll or a nav flight).
 */
const queue: (() => void)[] = []
let scheduled = false

function idle(callback: () => void) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback, { timeout: 400 })
    return
  }
  window.setTimeout(callback, 60)
}

function pump() {
  if (scheduled) return
  scheduled = true
  idle(() => {
    scheduled = false
    queue.shift()?.()
    if (queue.length) pump()
  })
}

/** Resolves on the visitor's first sign of engagement. */
const engaged =
  typeof window === 'undefined'
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const events = ['wheel', 'keydown', 'touchstart', 'pointermove', 'scroll'] as const
        const go = () => {
          events.forEach((name) => window.removeEventListener(name, go))
          resolve()
        }
        events.forEach((name) => window.addEventListener(name, go, { passive: true }))
      })

function flush() {
  while (queue.length) queue.shift()?.()
}

/**
 * Readies a just-mounted place for its first appearance, in an idle moment (see
 * compileForTarget), so the first frame it shows down the path doesn't stall.
 */
function usePrecompile(root: RefObject<Group | null>, ready: boolean) {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    idle(() => {
      if (!cancelled && root.current) void compileForTarget(gl, root.current, camera, scene)
    })
    return () => {
      cancelled = true
    }
  }, [gl, camera, scene, root, ready])
}

export function Deferred({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const root = useRef<Group>(null)
  usePrecompile(root, ready)

  useEffect(() => {
    let done = false
    const mount = () => {
      if (done) return
      done = true
      setReady(true)
    }
    queue.push(mount)
    engaged.then(pump)
    // Moving down the path: no more waiting.
    const off = useJourney.subscribe((state) => {
      if (state.progress > 0.15) flush()
    })
    return () => {
      done = true
      off()
      const index = queue.indexOf(mount)
      if (index >= 0) queue.splice(index, 1)
    }
  }, [])

  return ready ? <group ref={root}>{children}</group> : null
}

/**
 * Mounts its children in the first idle moment after the canvas starts (no engagement
 * needed): for parts of the hero that can arrive a beat later, so the hero's own mount is
 * not one long task. They stay hidden until their shaders are ready (compiled in parallel,
 * see compileForTarget), so their first frame doesn't stall on a shader link either.
 */
export function Soon({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [compiled, setCompiled] = useState(false)
  const root = useRef<Group>(null)
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    let done = false
    idle(() => {
      if (!done) setReady(true)
    })
    return () => {
      done = true
    }
  }, [])
  useEffect(() => {
    if (!ready || !root.current) return
    let done = false
    void compileForTarget(gl, root.current, camera, scene).then(() => {
      if (!done) setCompiled(true)
    })
    return () => {
      done = true
    }
  }, [ready, gl, camera, scene])
  return ready ? (
    <group ref={root} visible={compiled}>
      {children}
    </group>
  ) : null
}
