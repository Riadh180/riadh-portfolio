'use client'

import { useSound } from '@/stores/sound'
import { sound } from '@/lib/sound/engine'

const bars = [0, 0.2, 0.4, 0.1]

/**
 * The sound toggle, as the nav's tiny "signal" glyph: flat and still while sound is off
 * (the default), live while it plays. The choice is remembered.
 */
export function SignalBars() {
  const enabled = useSound((state) => state.enabled)
  const setEnabled = useSound((state) => state.setEnabled)
  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label="Sound"
      title={enabled ? 'Sound on' : 'Sound off'}
      data-cursor="link"
      onClick={() => {
        // Started from the click itself: browsers only allow audio after a gesture.
        sound.setEnabled(!enabled, window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        setEnabled(!enabled)
      }}
      className="group -m-2 flex h-6 items-center p-2"
    >
      <span aria-hidden className="flex h-2.5 items-end gap-[2px]">
        {bars.map((delay) => (
          <span
            key={delay}
            data-on={enabled}
            className="h-full w-[2px] origin-bottom scale-y-[0.2] bg-muted transition-colors duration-(--motion-duration-ui) group-hover:bg-glow data-[on=true]:scale-y-50 data-[on=true]:bg-glow data-[on=true]:motion-safe:animate-[signal_1.4s_ease-in-out_infinite]"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </span>
    </button>
  )
}
