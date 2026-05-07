import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';

// Path prefixes that require an authenticated session.
const protectedPagePrefixes = [
  '/profile',
  '/orderhistory',
  '/order',
  '/shipping',
  '/payment',
  '/placeorder',
  '/admin',
  '/productlist',
];

const protectedApiPrefixes = [
  '/api/orders',
  '/api/users/profile',
  '/api/uploads',
  // Task 12: /api/users/me and /api/users/me/export both need session.
  '/api/users/me',
];

const adminPrefixes = ['/admin', '/api/admin'];

const sellerEditPattern = /^\/seller\/[^/]+\/edit(?:$|\/)/;
const productEditPattern = /^\/product\/[^/]+\/edit(?:$|\/)/;

function isProtectedPath(path: string): boolean {
  return (
    protectedPagePrefixes.some((p) => path === p || path.startsWith(p + '/')) ||
    protectedApiPrefixes.some((p) => path === p || path.startsWith(p + '/')) ||
    sellerEditPattern.test(path) ||
    productEditPattern.test(path)
  );
}

function requiresAdmin(path: string): boolean {
  return adminPrefixes.some((p) => path === p || path.startsWith(p + '/'));
}

function requiresSeller(path: string): boolean {
  return sellerEditPattern.test(path) || productEditPattern.test(path);
}

/**
 * Build the CSP string for a given per-request nonce. `'strict-dynamic'` in
 * script-src means any script loaded by an already-nonced script is trusted,
 * which is exactly what we want for Next.js hydration — the initial bootstrap
 * scripts carry the nonce and then load chunks transitively.
 *
 * style-src keeps 'unsafe-inline' because styled-components injects inline
 * <style> tags that cannot carry a nonce without a full refactor. This is a
 * conscious trade-off: style-src 'unsafe-inline' is a much lower XSS risk
 * than script-src 'unsafe-inline'.
 */
function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = [
    `'self'`,
    `'nonce-${nonce}'`,
    `'strict-dynamic'`,
    // Turbopack HMR in dev needs eval for module loading.
    isDev ? `'unsafe-eval'` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' ws: wss: https:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
  ].join('; ');
}

/**
 * Generate a base64 nonce from 16 random bytes. Web Crypto API is available
 * in the edge runtime that this middleware runs in.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Per-request nonce — regenerated on every request so CSP cannot be
  // bypassed by replaying a leaked value.
  const nonce = generateNonce();

  // Propagate the nonce to the rendering pipeline via a request header.
  // Server Components read this via headers().get('x-nonce') and attach
  // the nonce attribute to their inline <script> tags.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Auth gate for the protected matcher subset. For public paths we skip
  // getToken entirely to keep the edge hop cheap.
  if (isProtectedPath(path)) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      // API calls get a 307 to the NextAuth signin page so the browser
      // flow can resume after login.
      const signinUrl = new URL('/api/auth/signin', request.url);
      signinUrl.searchParams.set(
        'callbackUrl',
        request.nextUrl.pathname + request.nextUrl.search
      );
      return NextResponse.redirect(signinUrl);
    }

    if (requiresAdmin(path) && !token.isAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (requiresSeller(path) && !token.isSeller && !token.isAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const isDev = process.env.NODE_ENV !== 'production';
  const csp = buildCsp(nonce, isDev);
  response.headers.set('Content-Security-Policy', csp);
  // Expose the nonce on the response too so edge tooling can inspect it.
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: [
    // Everything except Next.js internals, static assets, and image files.
    // The CSP + nonce must cover every HTML response in the app, so the
    // matcher cannot be limited to the authenticated subset any more.
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
