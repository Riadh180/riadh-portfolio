import type { Metadata, Viewport } from 'next'
import type { CSSProperties } from 'react'
import { profile } from '@/content/site'
import { siteUrl } from '@/lib/siteUrl'
import { departure, martian } from '@/styles/fonts'
import { cssVariables, palette } from '@/styles/tokens'
import './globals.css'

const title = `${profile.name} — ${profile.role}`
const description = `${profile.tagline} ${profile.summary}`

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title,
  description,
  applicationName: profile.name,
  authors: [{ name: profile.name, url: profile.linkedin }],
  creator: profile.name,
  keywords: [
    'Senior React Developer',
    'React Native',
    'TypeScript',
    'Next.js',
    'Essen',
    'Germany',
    'Remote',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'profile',
    title,
    description,
    siteName: profile.name,
    locale: 'en_US',
    url: '/',
  },
  twitter: { card: 'summary_large_image', title, description },
  robots: { index: true, follow: true },
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
      className={`${departure.variable} ${martian.variable} antialiased`}
    >
      <body>
        <a
          href="#main"
          className="fixed top-3 left-3 z-50 -translate-y-20 bg-text px-3 py-2 ui text-bg focus:translate-y-0 print:hidden"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  )
}
