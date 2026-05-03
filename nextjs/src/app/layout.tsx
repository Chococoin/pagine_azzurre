import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { LayoutWrapper } from "@/components/layout";
import { StyledComponentsRegistry, ThemeProvider } from "@/lib/styles";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Web3Provider } from "@/components/providers/Web3Provider";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  TWITTER_HANDLE,
} from "@/lib/seo/config";
import { safeJsonLd } from "@/lib/security/jsonLd";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: 'Banco dei Cittadini Volontari del Val.Az.Co',
  applicationName: SITE_NAME,
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Marketplace solidale italiano`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
    creator: TWITTER_HANDLE,
    site: TWITTER_HANDLE,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'marketplace',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: 'Pagine Azzurre Marketplace',
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: DEFAULT_OG_IMAGE,
  },
  description: DEFAULT_DESCRIPTION,
  founder: {
    '@type': 'Organization',
    name: 'Banco dei Cittadini Volontari del Val.Az.Co',
    url: 'http://valazco.org',
  },
  sameAs: [
    'http://valazco.org',
    'http://valazco.org/scopri-pagine-azzurre.html',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'support@pagineazzurre.net',
    contactType: 'customer support',
    availableLanguage: ['Italian'],
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  inLanguage: 'it-IT',
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/search/name/{search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Task 14: read the per-request nonce set by src/middleware.ts and pass
  // it to every inline <script> so the strict CSP will allow them.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="it">
      <body>
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
        />
        <AuthProvider>
          <Web3Provider>
            <StyledComponentsRegistry>
              <ThemeProvider>
                <LayoutWrapper>{children}</LayoutWrapper>
              </ThemeProvider>
            </StyledComponentsRegistry>
          </Web3Provider>
        </AuthProvider>
      </body>
    </html>
  );
}
