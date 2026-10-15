import { Martian_Mono } from 'next/font/google'
import localFont from 'next/font/local'

/** UI, labels and display moments: Departure Mono (Helena Zhang, OFL), on an 11px grid. */
export const departure = localFont({
  src: '../fonts/DepartureMono-Regular.woff2',
  variable: '--font-departure',
  display: 'swap',
  adjustFontFallback: false,
})

/** Longer paragraphs (about, project descriptions): Martian Mono (OFL), easier to read. */
export const martian = Martian_Mono({
  subsets: ['latin'],
  variable: '--font-martian',
  display: 'swap',
  weight: ['300', '400'],
  preload: false,
})

/**
 * Card titles in the 3D scene only: General Sans Light (Indian Type Foundry, Fontshare
 * Free License: free for personal and commercial use; self-hosted). Not preloaded.
 */
export const generalSans = localFont({
  src: '../fonts/GeneralSans-Light.woff2',
  variable: '--font-general',
  weight: '300',
  display: 'swap',
  preload: false,
})
