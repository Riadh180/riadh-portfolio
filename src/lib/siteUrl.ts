/**
 * The site's public origin, for canonical URLs, the sitemap and Open Graph. Set
 * NEXT_PUBLIC_SITE_URL once the domain exists; on Vercel the production URL is used.
 */
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000'),
)
