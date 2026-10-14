'use client'

import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { DESCENT } from '@/components/canvas/journey/descent'
import { jobs } from '@/content/site'
import { useJourney } from '@/stores/journey'
import { useWork } from '@/stores/work'
import { sound } from '@/lib/sound/engine'

/**
 * The path as (scroll px, progress) pairs, measured from the sections: the statement
 * (arrival, then a dwell), Work (arrival at the first card, down to the last), and
 * System (arrival, then a dwell). Progress is piecewise linear between them.
 */
type Anchors = [scroll: number, progress: number][]

function measure(): Anchors {
  const top = (id: string) => document.getElementById(id)?.offsetTop ?? 0
  const height = (id: string) => document.getElementById(id)?.offsetHeight ?? 0
  const screen = window.innerHeight
  const end = (id: string) => top(id) + Math.max(0, height(id) - screen)
  const points: Anchors = [
    [0, 0],
    [top('approach'), 1],
    [end('approach'), 1],
    [top('work'), 2],
    [end('work'), 3],
    [top('system'), 4],
    [end('system'), 4],
    [top('depth'), 5],
    [end('depth'), 5],
    [top('contact'), 6],
    [end('contact'), 6],
    [end('loop'), 7],
  ]
  // Keep it strictly increasing in scroll, whatever the layout.
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]![0]
    if (points[i]![0] <= previous) points[i]![0] = previous + 1
  }
  return points
}

function interpolate(value: number, anchors: Anchors, from: 0 | 1, to: 0 | 1) {
  const last = anchors[anchors.length - 1]!
  if (value >= last[from]) return last[to]
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1]!
    const b = anchors[i]!
    if (value <= b[from]) {
      const span = b[from] - a[from]
      // A dwell (equal progress) maps any progress inside it to its start.
      const t = span <= 0 ? 0 : (value - a[from]) / span
      return a[to] + (b[to] - a[to]) * t
    }
  }
  return last[to]
}

/** Scroll position → path progress. */
const toProgress = (scroll: number, anchors: Anchors) => interpolate(scroll, anchors, 0, 1)
/** Path progress → scroll position (the first position reaching it). */
const toScroll = (progress: number, anchors: Anchors) => interpolate(progress, anchors, 1, 0)

/**
 * Key moments where the scroll settles with a soft magnet, as path progress: the
 * statement, the wireframe beat half-way down, and each job card.
 */
function stopsAt(anchors: Anchors) {
  const cards = Array.from({ length: jobs.length }, (_, i) => 2 + i / (jobs.length - 1))
  const statement = anchors[1]![0]
  const dwell = anchors[2]![0]
  return [
    0,
    (statement + dwell) / 2,
    toScroll(1 + (DESCENT.holdFrom + DESCENT.holdTo) / 2, anchors),
    ...cards.map((progress) => toScroll(progress, anchors)),
    toScroll(4, anchors),
    toScroll(5, anchors),
    toScroll(6, anchors),
  ]
}

/** Where each section link lands on the path (progress). */
const PLACE_PROGRESS: Record<string, number> = {
  signal: 0,
  approach: 1,
  work: 2,
  system: 4,
  depth: 5,
  contact: 6,
}

/** Section links fly the camera there quickly, whatever the distance (seconds). */
const FLIGHT = { min: 1, max: 1.8 }

/** Waits this long after the scroll has settled before easing to a stop (ms). */
const SETTLE = 140

/**
 * After a wheel / touch gesture has settled, ease to a key moment if one is close (a soft
 * magnet, not a lock). Ahead, in the direction of the gesture, it reaches up to ~45% of the
 * way to that stop, so a normal gesture carries on to the next moment. Behind, it only
 * catches a stop within a short distance, so small gestures never get dragged back.
 * Keyboard scrolling is left alone.
 */
function magnet(current: number, direction: number, stops: number[], screen: number) {
  let best: number | null = null
  let bestDistance = Infinity
  stops.forEach((stop, i) => {
    const distance = Math.abs(stop - current)
    const ahead = Math.sign(stop - current) === direction
    const previous = stops[i - direction] ?? stop
    const reach = ahead ? Math.abs(stop - previous) * 0.45 : screen * 0.12
    if (distance < reach && distance < bestDistance) {
      best = stop
      bestDistance = distance
    }
  })
  return best
}

/**
 * Smooth scroll (Lenis), feeding the camera path. Lenis's damping settles a scroll tick in
 * ~0.7s, as in the reference; the scene adds a slower secondary settle on top. With reduced
 * motion the page keeps native scrolling and only the progress is tracked.
 */
export function SmoothScroll() {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const { setProgress, setJump } = useJourney.getState()
    let anchors = measure()
    const update = (scroll: number) => setProgress(Math.max(0, toProgress(scroll, anchors)))
    const resize = new ResizeObserver(() => {
      anchors = measure()
      update(window.scrollY)
    })
    resize.observe(document.body)

    if (reducedMotion) {
      const onScroll = () => update(window.scrollY)
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      setJump((progress) => window.scrollTo(0, toScroll(progress, anchors)))
      return () => {
        resize.disconnect()
        window.removeEventListener('scroll', onScroll)
      }
    }

    // Anchors are handled below (fast flights), not by Lenis.
    const lenis = new Lenis({ autoRaf: true, lerp: 0.1 })
    let input: 'gesture' | 'key' = 'gesture'
    let direction = 1
    let snapping = false
    let timer = 0
    const settle = () => {
      if (input === 'key' || snapping || useWork.getState().opened) return
      const stop = magnet(lenis.scroll, direction, stopsAt(anchors), window.innerHeight)
      if (stop === null || Math.abs(stop - lenis.scroll) < 2) return
      snapping = true
      lenis.scrollTo(stop, {
        duration: 0.9,
        easing: (t) => 1 - (1 - t) ** 3,
        onComplete: () => {
          snapping = false
        },
      })
    }
    lenis.on('scroll', () => {
      update(lenis.scroll)
      // The end of the visual loop: the view is now the hero's, so return to the top
      // without a visible cut (wheel / touch only: keyboard users simply reach the end).
      if (input === 'gesture' && lenis.scroll >= toScroll(6.97, anchors)) {
        snapping = false
        lenis.scrollTo(0, { immediate: true, force: true })
        return
      }
      if (lenis.direction) direction = lenis.direction
      window.clearTimeout(timer)
      timer = window.setTimeout(settle, SETTLE)
    })
    const onGesture = () => {
      input = 'gesture'
      snapping = false
    }
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(event.key)) {
        input = 'key'
      }
    }
    // Section links (nav pill, name, list): a quick flight to the place, ~1–2s.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href^="#"]')
      const id = anchor?.getAttribute('href')?.slice(1)
      const progress = id ? PLACE_PROGRESS[id] : undefined
      if (progress === undefined) return
      event.preventDefault()
      sound.flight()
      const target = toScroll(progress, anchors)
      const distance = Math.abs(target - lenis.scroll) / window.innerHeight
      snapping = true
      lenis.scrollTo(target, {
        duration: Math.min(FLIGHT.max, FLIGHT.min + distance * 0.06),
        easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
        force: true,
        onComplete: () => {
          snapping = false
          // Keyboard users land on the section's content.
          document
            .getElementById(id ?? '')
            ?.querySelector<HTMLElement>('a, button')
            ?.focus({ preventScroll: true })
        },
      })
      window.history.replaceState(null, '', `#${id}`)
    }
    document.addEventListener('click', onClick)
    window.addEventListener('wheel', onGesture, { passive: true })
    window.addEventListener('touchstart', onGesture, { passive: true })
    window.addEventListener('keydown', onKey)
    update(lenis.scroll)
    setJump((progress) => lenis.scrollTo(toScroll(progress, anchors), { immediate: true }))
    return () => {
      resize.disconnect()
      window.clearTimeout(timer)
      document.removeEventListener('click', onClick)
      window.removeEventListener('wheel', onGesture)
      window.removeEventListener('touchstart', onGesture)
      window.removeEventListener('keydown', onKey)
      lenis.destroy()
    }
  }, [reducedMotion])

  return null
}
