'use client'

import { useEffect } from 'react'
import { sound } from '@/lib/sound/engine'
import { useCursor } from '@/stores/cursor'
import { useJourney } from '@/stores/journey'
import { useSound } from '@/stores/sound'
import { useWork } from '@/stores/work'

/**
 * Connects the site to its sound: the remembered choice (resumed on the first gesture,
 * as browsers require), the beds following the journey, and the card / hover sounds.
 */
export function SoundBridge() {
  const enabled = useSound((state) => state.enabled)

  useEffect(() => useSound.getState().restore(), [])

  useEffect(() => {
    if (!enabled) {
      sound.setEnabled(false, false)
      return
    }
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = () => sound.setEnabled(true, calm)
    start()
    // A remembered "on" can only actually start after a gesture.
    window.addEventListener('pointerdown', start, { once: true })
    window.addEventListener('keydown', start, { once: true })
    sound.setProgress(useJourney.getState().progress)
    const offJourney = useJourney.subscribe((state) => sound.setProgress(state.progress))
    const offWork = useWork.subscribe((state, previous) => {
      if (state.opened && state.opened !== previous.opened) sound.open()
      if (!state.opened && previous.opened) sound.close()
    })
    const offCursor = useCursor.subscribe((state, previous) => {
      if (state.scene && state.scene !== previous.scene) sound.tick()
    })
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      offJourney()
      offWork()
      offCursor()
    }
  }, [enabled])

  return null
}
