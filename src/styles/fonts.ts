import { JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'

/** Display: Clash Display (Fontshare, ITF FFL). Preloaded — it carries the hero. */
export const clash = localFont({
  src: '../fonts/ClashDisplay-Variable.woff2',
  variable: '--font-clash',
  weight: '200 700',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
})

/** Body: Satoshi (Fontshare, ITF FFL). */
export const satoshi = localFont({
  src: '../fonts/Satoshi-Variable.woff2',
  variable: '--font-satoshi',
  weight: '300 900',
  display: 'swap',
  adjustFontFallback: 'Arial',
})

/** Mono: metadata, indices, numbers. Self-hosted at build time by next/font. */
export const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false,
})
