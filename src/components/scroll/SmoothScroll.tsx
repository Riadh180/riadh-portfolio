'use client'

import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { DESCENT } from '@/components/canvas/journey/descent'
import { jobs } from '@/content/site'
import { useJourney } from '@/stores/journey'
import { useWork } from '@/stores/work'

/** Scroll positions (px) where the path's progress reaches 0, 1, 1 (end of dwell), 2 and 3. */
type Anchors = [number, number, number, number, number]

/** Reads the anchors from the sections: statement arrival and dwell, Work arrival and end. */
function measure(): Anchors {
  const top = (id: string) => document.getElementById(id)?.offsetTop ?? 0
  const height = (id: string) => document.getElementById(id)?.offsetHeight ?? 0
  const screen = window.innerHeight
  const statement = Math.max(1, top('approach'))
  const dwell = Math.max(statement, statement + height('approach') - screen)
  const work = Math.max(dwell + 1, top('work'))
  const end = Math.max(work + 1, work + height('work') - screen)
  return [0, statement, dwell, work, end]
}

/** Scroll position → path progress (piecewise linear between the anchors). */
function toProgress(scroll: number, [, statement, dwell, work, end]: Anchors) {
  if (scroll <= statement) return scroll / statement
  if (scroll <= dwell) return 1
  if (scroll <= work) return 1 + (scroll - dwell) / (work - dwell)
  return Math.min(3, 2 + (scroll - work) / (end - work))
}

/** Path progress → scroll position (the inverse, for jumps). */
function toScroll(progress: number, [, statement, dwell, work, end]: Anchors) {
  if (progress <= 1) return progress * statement
  if (progress <= 2) return dwell + (progress - 1) * (work - dwell)
  return work + (progress - 2) * (end - work)
}

/**
 * Key moments where the scroll settles with a soft magnet, as path progress: the
 * statement, the wireframe beat half-way down, and each job card.
 */
function stopsAt(anchors: Anchors) {
  const [, statement, dwell] = anchors
  const cards = Array.from({ length: jobs.length }, (_, i) => 2 + i / (jobs.length - 1))
  return [
    0,
    (statement + dwell) / 2,
    toScroll(1 + (DESCENT.holdFrom + DESCENT.holdTo) / 2, anchors),
    ...cards.map((progress) => toScroll(progress, anchors)),
  ]
}

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

    const lenis = new Lenis({ autoRaf: true, lerp: 0.1, anchors: true })
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
    window.addEventListener('wheel', onGesture, { passive: true })
    window.addEventListener('touchstart', onGesture, { passive: true })
    window.addEventListener('keydown', onKey)
    update(lenis.scroll)
    setJump((progress) => lenis.scrollTo(toScroll(progress, anchors), { immediate: true }))
    return () => {
      resize.disconnect()
      window.clearTimeout(timer)
      window.removeEventListener('wheel', onGesture)
      window.removeEventListener('touchstart', onGesture)
      window.removeEventListener('keydown', onKey)
      lenis.destroy()
    }
  }, [reducedMotion])

  return null
}
