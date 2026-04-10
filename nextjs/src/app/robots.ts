import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pagineazzurre.net';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/profile',
          '/profile/',
          '/cart',
          '/checkout',
          '/shipping',
          '/payment',
          '/placeorder',
          '/orderlist',
          '/orderhistory',
          '/order/',
          '/userlist',
          '/productlist',
          '/dashboard',
          '/change-password/',
          '/password-recovery',
          '/password-recovery/',
          '/verification/',
          '/signin',
          '/register',
          '/user/',
        ],
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
