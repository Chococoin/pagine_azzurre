import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import NewsletterModel from '@/lib/db/models/Newsletter';
import {
  enforceRateLimits,
  getClientIp,
} from '@/lib/security/rateLimit';

// GET /api/users/newsletter/unsubscribe?token=...
//
// Public, no-auth endpoint invoked from newsletter email footer links.
// Uses GET because every mail client follows link clicks as GET — this
// violates REST purity but is the standard for one-click unsubscribe.
//
// The token is a random per-subscription UUID stored on the Newsletter
// row. On match we set verified=false and return a small confirmation
// HTML page. If the token is missing or invalid, we return a neutral
// "nothing happened" page — never leak which tokens exist.

function renderPage(title: string, message: string, status: number) {
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Pagine Azzurre</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; color: #111827; margin: 0; padding: 40px 20px; }
    .box { max-width: 480px; margin: 0 auto; background: #fff; padding: 40px 32px; border-radius: 16px; border: 1px solid #e5e7eb; text-align: center; }
    h1 { margin: 0 0 16px; font-size: 24px; }
    p { margin: 0 0 24px; color: #6b7280; line-height: 1.6; }
    a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${title}</h1>
    <p>${message}</p>
    <p><a href="/">Torna al sito</a></p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: NextRequest) {
  // Light rate limit so an attacker cannot scan token space (tokens are
  // 122-bit UUIDs so this is defensive, not primary protection).
  const rateLimited = await enforceRateLimits([
    {
      config: { bucket: 'newsletter-unsubscribe-ip', limit: 30, windowMs: 60 * 60 * 1000 },
      identifier: getClientIp(request),
    },
  ]);
  if (rateLimited) return rateLimited;

  const token = request.nextUrl.searchParams.get('token');
  if (typeof token !== 'string' || token.length === 0) {
    return renderPage(
      'Link non valido',
      'Il link di disiscrizione non è valido o è scaduto. Se hai domande contattaci a support@pagineazzurre.net.',
      400
    );
  }

  try {
    await connectDB();
    const subscriber = await NewsletterModel.findOne({ unsubscribeToken: token });
    if (!subscriber) {
      // Neutral response to avoid confirming or denying token existence.
      return renderPage(
        'Disiscrizione completata',
        'Se eri iscritto alla newsletter, ora sei stato rimosso.',
        200
      );
    }

    if (subscriber.verified) {
      subscriber.verified = false;
      await subscriber.save();
    }

    return renderPage(
      'Disiscrizione completata',
      `${subscriber.email} non riceverà più la nostra newsletter. Se è stato un errore, puoi iscriverti di nuovo dal tuo profilo.`,
      200
    );
  } catch (err) {
    console.error('Error in newsletter unsubscribe:', err);
    return renderPage(
      'Si è verificato un errore',
      'Non è stato possibile processare la tua richiesta. Riprova più tardi o contattaci a support@pagineazzurre.net.',
      500
    );
  }
}
