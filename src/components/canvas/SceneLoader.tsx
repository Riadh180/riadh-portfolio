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

export function SceneLoader() {
  // Decided after mount (the server can't know), so hydration matches.
  const [webgl, setWebgl] = useState<boolean | null>(null)

  useEffect(() => {
    const supported = hasWebGL()
    if (!supported) settle()
    // Reading a browser capability once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebgl(supported)
  }, [])

  if (webgl === null) return null
  if (!webgl) return <StaticWorld />
  return (
    <SceneBoundary>
      <SceneCanvas />
    </SceneBoundary>
  )
}
