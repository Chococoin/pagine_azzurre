/**
 * Central SEO configuration.
 * Shared metadata defaults, site identity and URL helpers.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pagineazzurre.net';

export const SITE_NAME = 'Pagine Azzurre';

export const DEFAULT_TITLE = 'Pagine Azzurre — Marketplace solidale italiano';

export const DEFAULT_DESCRIPTION =
  'Pagine Azzurre è il marketplace della comunità italiana: barattiamo e scambiamo prodotti, servizi e competenze con meno Euro e più VAL. Offri, cerca, proponi o dona — il Banco dei Cittadini Volontari del Val.Az.Co.';

export const DEFAULT_KEYWORDS = [
  'marketplace italiano',
  'baratto',
  'scambio',
  'VAL',
  'Val.Az.Co',
  'comunità solidale',
  'economia solidale',
  'pagine azzurre',
  'marketplace comunitario',
  'banco dei cittadini volontari',
];

export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

export const TWITTER_HANDLE = '@pagineazzurre';

/** Build a canonical absolute URL from a relative path. */
export function canonicalUrl(path: string = '/'): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/** Truncate a description to a safe length for meta tags (~160 chars). */
export function truncate(text: string | undefined | null, max = 160): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}
