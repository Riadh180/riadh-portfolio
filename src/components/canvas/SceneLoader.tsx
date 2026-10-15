'use client'

import dynamic from 'next/dynamic'
import { Component, type ReactNode, useEffect, useState } from 'react'
import { useLoading } from '@/stores/loading'
import { StaticWorld } from './StaticWorld'

// Client-only and lazy: the HTML (and the hero text) paints before any WebGL loads.
const SceneCanvas = dynamic(() => import('./SceneCanvas'), { ssr: false })

/**
 * Hardware-accelerated WebGL only: a software renderer (SwiftShader, llvmpipe…) would run
 * the world at a few frames a second, so it gets the static world instead.
 */
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return false
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return !/swiftshader|llvmpipe|software|basic render/i.test(renderer)
  } catch {
    return false
  }
}

/** Without WebGL there is nothing to load: let the preloader go. */
function settle() {
  const { complete, skip } = useLoading.getState()
  ;(['fonts', 'scene', 'assets', 'shaders'] as const).forEach(complete)
  skip()
}

/** Catches a failing 3D layer (e.g. context creation) and shows the static world. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    settle()
  }

  render() {
    return this.state.failed ? <StaticWorld /> : this.props.children
  }
}

/**
 * Wakes the GPU in a worker first (see gpuWarm.worker.ts), so creating the canvas doesn't
 * block the page; resolves at once where workers can't hold a WebGL context.
 */
function warmGpu(): Promise<Worker | null> {
  if (typeof OffscreenCanvas === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./gpuWarm.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      resolve(null)
      return
    }
    const timeout = window.setTimeout(() => resolve(worker), 2000)
    worker.onmessage = () => {
      window.clearTimeout(timeout)
      resolve(worker)
    }
    worker.postMessage('warm')
  })
}

/**
 * Phones and low-core devices: the HTML hero (with the static glass Core) is complete and
 * interactive first; the 3D starts on the first touch, scroll or key. (Starting at an idle
 * moment instead was measured: the GPU start-up still blocked ~1.3s under a throttled CPU.)
 * Elsewhere: at once.
 */
/** Set when the 3D waits for the visitor (the static Core shows meanwhile). */
let constrainedStart = false

function whenReady(): Promise<void> {
  const constrained =
    window.matchMedia('(pointer: coarse)').matches ||
    window.innerWidth < 700 ||
    // Low-end: few cores AND little memory (cores alone would catch 4-core laptops,
    // and headless Chrome, which reports 4 here).
    ((navigator.hardwareConcurrency ?? 8) <= 4 &&
      ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) <= 4)
  if (!constrained) return Promise.resolve()
  constrainedStart = true
  return new Promise((resolve) => {
    const events = ['touchstart', 'pointerdown', 'wheel', 'keydown', 'scroll'] as const
    let done = false
    const go = () => {
      if (done) return
      done = true
      events.forEach((name) => window.removeEventListener(name, go))
      resolve()
    }
    events.forEach((name) => window.addEventListener(name, go, { passive: true, once: true }))
  })
}

export function SceneLoader() {
  // Decided after mount (the server can't know), so hydration matches.
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const [waiting, setWaiting] = useState(false)

  useEffect(() => {
    const supported = hasWebGL()
    if (!supported) {
      settle()
      // Reading a browser capability once on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWebgl(false)
      return
    }
    let cancelled = false
    let warm: Worker | null = null
    const ready = whenReady()
    if (constrainedStart) {
      // No preloader on this path: the static Core is already the first frame.
      settle()
      setWaiting(true)
    }
    let handover = 0
    void ready.then(warmGpu).then((worker) => {
      warm = worker
      if (!cancelled) setWebgl(true)
      // The static Core stays under the canvas while it fades in (no empty frame).
      if (constrainedStart) handover = window.setTimeout(() => setWaiting(false), 2500)
      // Our own context exists by now: let the worker's go.
      window.setTimeout(() => {
        warm?.postMessage('release')
        warm?.terminate()
      }, 5000)
    })
    return () => {
      cancelled = true
      window.clearTimeout(handover)
      warm?.terminate()
    }
  }, [])

  // Waiting for the first touch on a phone: the static glass Core meanwhile.
  if (webgl === null) return waiting ? <StaticWorld /> : null
  if (!webgl) return <StaticWorld />
  return (
    <>
      {waiting && <StaticWorld />}
      <SceneBoundary>
        <SceneCanvas />
      </SceneBoundary>
    </>
  )
}
