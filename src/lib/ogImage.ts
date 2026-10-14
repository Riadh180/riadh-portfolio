import { profile } from '@/content/site'

/**
 * The shared Open Graph image (src/app/opengraph-image.png). Pages that set their own
 * `openGraph` replace the inherited one, so they list it explicitly.
 */
export const ogImage = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: `${profile.name}, ${profile.role}`,
}
