import type { Metadata, Viewport } from 'next'
import type { CSSProperties } from 'react'
import { SceneLoader } from '@/components/canvas/SceneLoader'
import { TopBar } from '@/components/layout/TopBar'
import { profile } from '@/content/site'
import { departure } from '@/styles/fonts'
import { cssVariables, palette } from '@/styles/tokens'
import './globals.css'

export const metadata: Metadata = {
  title: `${profile.name} — ${profile.role}`,
  description: `${profile.tagline} ${profile.summary}`,
}

export const viewport: Viewport = {
  themeColor: palette.bg,
  colorScheme: 'dark',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      style={cssVariables as CSSProperties}
      className={`${departure.variable} antialiased`}
    >
      <body>
        <a
          href="#main"
          className="fixed top-3 left-3 z-50 -translate-y-20 bg-text px-3 py-2 ui text-bg focus:translate-y-0"
        >
          Skip to content
        </a>
        <SceneLoader />
        <TopBar />
        {children}
      </body>
    </html>
  )
}
