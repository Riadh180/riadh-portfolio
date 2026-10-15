'use client'

import { useState } from 'react'
import { Magnetic } from '@/components/ui/Magnetic'
import { Scramble } from '@/components/ui/Scramble'

/**
 * Contact's main action: magnetic, a soft warm glow on hover, and a brief ring of light
 * rippling out on click (the mail client opens as usual).
 */
export function EmailButton({ email }: { email: string }) {
  const [ripple, setRipple] = useState(0)
  return (
    <Magnetic>
      <a
        href={`mailto:${email}`}
        onClick={() => setRipple((n) => n + 1)}
        className="email-button relative inline-flex items-center gap-3 rounded-full border border-warm/60 bg-warm/10 px-6 py-3.5 ui-lg text-text transition-[color,background-color,border-color,box-shadow] duration-(--motion-duration-ui) hover:border-warm hover:bg-warm/20"
      >
        <span aria-hidden>→</span> <Scramble text={email} />
        {ripple > 0 && <span key={ripple} aria-hidden className="email-ripple" />}
      </a>
    </Magnetic>
  )
}
