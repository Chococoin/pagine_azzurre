import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    styledComponents: true,
  },

  // Security + indexing headers — static headers stay here; the
  // Content-Security-Policy (which needs a per-request nonce) is set by
  // src/middleware.ts on every response.
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        },
      ],
    },
    {
      // De-index private app pages. They are allowed in robots.txt so Google
      // can crawl them and honor this header, which removes existing entries
      // from the index.
      source:
        '/:segment(profile|cart|checkout|shipping|payment|placeorder|orderlist|orderhistory|order|userlist|productlist|dashboard|change-password|password-recovery|verification|signin|register|user)/:rest*',
      headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ],
    },
  ],

  redirects: async () => [
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'pagineazzurre.net' }],
      destination: 'https://www.pagineazzurre.net/:path*',
      permanent: true,
    },
  ],

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
