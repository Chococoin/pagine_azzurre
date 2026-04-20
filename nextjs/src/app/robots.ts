import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pagineazzurre.net';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Only block API routes. Private app pages (signin, cart, profile, etc.)
        // are de-indexed via X-Robots-Tag: noindex in next.config.ts so Google
        // can crawl them, read the header, and remove them from the index.
        // Blocking in robots.txt leaves already-indexed URLs as ghost entries
        // because Google cannot reach them to see the noindex.
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
      {
        // Block aggressive AI crawlers from scraping marketplace listings wholesale
        userAgent: ['GPTBot', 'CCBot', 'anthropic-ai', 'ClaudeBot'],
        disallow: ['/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
