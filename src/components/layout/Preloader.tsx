'use client'

import { useEffect, useRef, useState } from 'react'
import { loadAssets } from '@/components/canvas/assets'
import { loadProgress, useLoading } from '@/stores/loading'

const KEY = 'signal-intro'
/** The counter may not run faster than this (per second), so 000 → 100 reads as a count. */
const SPEED = 1.6
/** Give up waiting (e.g. no WebGL): reveal whatever is there. */
const TIMEOUT = 5000

/**
 * The preloader: a small mono counter, 000 → 100, that follows the real loading (fonts,
 * the 3D chunk, the asset list, the first scene's shaders); never ahead of it. At 100 the
 * scene's reveal starts (dust condenses, The Core resolves) and the counter fades. The
 * name and role are in the HTML from the first frame; the counter covers nothing. Skipped
 * on repeat visits in the same session.
 */
export function Preloader() {
  const [visible, setVisible] = useState(true)
  const counter = useRef<HTMLSpanElement>(null)
  const line = useRef<HTMLSpanElement>(null)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let repeat = false
    try {
      repeat = sessionStorage.getItem(KEY) === '1'
      sessionStorage.setItem(KEY, '1')
    } catch {
      // Storage blocked: play the intro.
    }
    const { complete, reveal, skip } = useLoading.getState()
    if (repeat) {
      skip()
      setVisible(false)
      return
    }
    void document.fonts.ready.then(() => complete('fonts'))
    void loadAssets().then(() => complete('assets'))
    const timeout = window.setTimeout(() => {
      ;(['fonts', 'scene', 'assets', 'shaders'] as const).forEach(complete)
    }, TIMEOUT)

    let shown = 0
    let last = performance.now()
    let frame = requestAnimationFrame(function step(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const target = loadProgress(useLoading.getState().done)
      shown = Math.min(target, shown + dt * SPEED)
      const value = Math.round(shown * 100)
      if (counter.current) counter.current.textContent = String(value).padStart(3, '0')
      if (line.current) line.current.style.transform = `scaleX(${shown})`
      if (shown >= 1) {
        reveal()
        root.current?.setAttribute('data-done', 'true')
        window.setTimeout(() => setVisible(false), 700)
        return
      }
      frame = requestAnimationFrame(step)
    })
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [])

  if (!visible) return null
  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-[58%] z-30 flex flex-col items-center gap-2 transition-opacity duration-700 ease-signal data-[done=true]:opacity-0"
    >
      <span ref={counter} className="ui text-text tabular-nums">
        000
      </span>
      <span className="block h-px w-24 bg-line">
        <span ref={line} className="block h-px w-full origin-left scale-x-0 bg-glow" />
      </span>
    </div>
  )
}
