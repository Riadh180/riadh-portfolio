/** The site's address in production (also set as NEXT_PUBLIC_SITE_URL on Vercel). */
const PRODUCTION = 'https://riadhsouissi.vercel.app'

/**
 * The site's public origin, for canonical URLs, the sitemap, robots and Open Graph:
 * NEXT_PUBLIC_SITE_URL when set, otherwise the production address (never a preview URL).
 */
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION)
