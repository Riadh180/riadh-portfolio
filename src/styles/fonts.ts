import localFont from 'next/font/local'

/** UI face: Departure Mono (Helena Zhang, OFL). Pixel mono drawn on an 11px grid. */
export const departure = localFont({
  src: '../fonts/DepartureMono-Regular.woff2',
  variable: '--font-departure',
  display: 'swap',
  adjustFontFallback: false,
})
