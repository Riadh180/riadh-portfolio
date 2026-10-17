'use client'

import { useEffect, useRef, useState } from 'react'
import { loadAssets } from '@/components/canvas/assets'
import { capstone } from '@/content/site'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useWork } from '@/stores/work'

/** The details appear once the panel has flown in and begun to dissolve (ms). */
const APPEAR_DELAY = 1100

/** What an image of the gallery shows (by file name), or its number. */
function describe(src: string, index: number) {
  const file = src.split('/').at(-1) ?? ''
  return capstone.galleryAlt?.[file] ?? `Capstone image ${index + 1}`
}

/**
 * The capstone's opened panel, in small mono at the left over Depth (the same layout as a
 * job's details): the title, the one-liner, the data stack, the repository, its images (the
 * panel shows one at a time: arrows, the arrow keys, or a sideways swipe on phones change it
 * behind a glass wipe) and Close: a modal view. Focus moves in when it opens, stays inside
 * while it is open, and goes back to the "Capstone" button when it closes; Esc closes.
 */
export function CapstoneDetail() {
  const close = useWork((state) => state.close)
  const gallery = useWork((state) => state.gallery)
  const setGallery = useWork((state) => state.setGallery)
  const panel = useRef<HTMLDivElement>(null)
  useFocusTrap(panel, true)
  const [images, setImages] = useState<string[]>([])
  useEffect(() => {
    void loadAssets().then((assets) => setImages(assets.gallery))
  }, [])

  useEffect(() => {
    const count = images.length
    const step = (by: number) => {
      if (count > 1) setGallery((useWork.getState().gallery + by + count) % count)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      else if (event.key === 'ArrowRight') step(1)
      else if (event.key === 'ArrowLeft') step(-1)
    }
    // Phones: a sideways swipe changes the image (an upward one still scrolls the details).
    let start: { x: number; y: number } | null = null
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      start = touch ? { x: touch.clientX, y: touch.clientY } : null
    }
    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      if (!start || !touch) return
      const dx = touch.clientX - start.x
      if (Math.abs(dx) > 50 && Math.abs(touch.clientY - start.y) < 40) step(dx < 0 ? 1 : -1)
      start = null
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [images, close, setGallery])

  useEffect(() => {
    const timer = window.setTimeout(() => panel.current?.focus(), APPEAR_DELAY)
    return () => {
      window.clearTimeout(timer)
      // Back to the button that opened it.
      document.querySelector<HTMLButtonElement>(`[data-work="${capstone.slug}"]`)?.focus()
    }
  }, [])

  const current = images[gallery]
  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="capstone-title"
      tabIndex={-1}
      // Phones: at most half the screen (it scrolls), so the opened panel above stays clear.
      className="detail-in flex max-h-[50svh] w-full max-w-[46ch] flex-col gap-4 overflow-y-auto outline-none lg:max-h-none lg:overflow-visible"
    >
      <p className="ui text-xs text-text/70">
        <span className="text-text">{capstone.role}</span> · {capstone.dates}
      </p>
      <h2 id="capstone-title" className="ui-lg text-base text-text sm:text-lg">
        {capstone.company} — Capstone
      </h2>
      <p className="copy max-w-[44ch] text-sm leading-relaxed text-text/90">{capstone.summary}</p>
      <ul
        className="flex flex-wrap gap-x-3 gap-y-1 ui text-xs text-text/70"
        aria-label="Data stack"
      >
        {capstone.stack.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {images.length > 1 && (
        <nav aria-label="Capstone images" className="flex items-center gap-3 ui text-xs">
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => setGallery((gallery - 1 + images.length) % images.length)}
            className="text-text/70 transition-colors duration-(--motion-duration-ui) hover:text-text"
          >
            ←
          </button>
          <span className="text-text/70" aria-live="polite">
            <span className="text-text">{String(gallery + 1).padStart(2, '0')}</span> /{' '}
            {String(images.length).padStart(2, '0')}
            <span className="sr-only">: {current ? describe(current, gallery) : ''}</span>
          </span>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => setGallery((gallery + 1) % images.length)}
            className="text-text/70 transition-colors duration-(--motion-duration-ui) hover:text-text"
          >
            →
          </button>
          <span className="hidden gap-2 lg:flex">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={describe(src, i)}
                aria-pressed={i === gallery}
                onClick={() => setGallery(i)}
                className="h-7 w-11 overflow-hidden rounded-[0.3rem] border border-line opacity-60 transition-opacity duration-(--motion-duration-ui) hover:opacity-100 aria-pressed:border-text/60 aria-pressed:opacity-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </span>
        </nav>
      )}
      {capstone.repo && (
        <a
          href={capstone.repo}
          target="_blank"
          rel="noopener"
          className="self-start ui text-xs text-violet transition-colors duration-(--motion-duration-ui) hover:text-text"
        >
          Repository on GitHub ↗
        </a>
      )}
      <button
        type="button"
        onClick={close}
        className="self-start ui text-xs text-violet hover:text-text"
      >
        ← Close <span className="text-muted">(Esc)</span>
      </button>
    </div>
  )
}
