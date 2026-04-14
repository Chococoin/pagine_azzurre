import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import { sendPasswordRecoveryEmail } from '@/lib/services/email';
import {
  enforceRateLimits,
  getClientIp,
} from '@/lib/security/rateLimit';

// POST /api/users/password-recovery - Request password recovery
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (typeof email !== 'string' || email.length === 0) {
      return NextResponse.json(
        { message: 'Email richiesta' },
        { status: 400 }
      );
    }

    // Task 8: rate limit. IP-scoped (5/hour) and email-scoped (3/hour) —
    // blocks both broad scans and targeted harassment of one inbox.
    const rateLimited = await enforceRateLimits([
      {
        config: { bucket: 'password-recovery-ip', limit: 5, windowMs: 60 * 60 * 1000 },
        identifier: getClientIp(request),
      },
      {
        config: { bucket: 'password-recovery-email', limit: 3, windowMs: 60 * 60 * 1000 },
        identifier: email.toLowerCase(),
      },
    ]);
    if (rateLimited) return rateLimited;

    await connectDB();

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    // Task 9 (AUTH-VULN-02): we always return the same response body and
    // status regardless of whether the email exists, closing the
    // enumeration oracle. The real work runs asynchronously and we do not
    // block the response on email delivery.
    const genericResponse = NextResponse.json({
      email: true,
      loading: false,
    });

    if (user) {
      // Task 9: use a cryptographically random recovery id instead of
      // keccak256(user.password). The old scheme was deterministic for any
      // attacker who had seen the password hash (e.g. from a DB dump) and
      // reused the same id across multiple recovery requests.
      const recoveryId = randomBytes(32).toString('hex');
      user.recoveryPasswordId = recoveryId;
      try {
        await user.save();
        const recoveryLink = `${process.env.NEXTAUTH_URL}/password-recovery/${recoveryId}`;
        await sendPasswordRecoveryEmail(user.email, recoveryLink);
      } catch (emailError) {
        // Do not leak the failure to the caller — logging is enough.
        console.error('Error sending recovery email:', emailError);
      }
    } else {
      // Intentional no-op. We could optionally send a "someone tried to
      // reset your password, but you do not have an account" email, but
      // doing so would still reveal existence to the *target* inbox, so
      // we just log and return the generic success shape.
      console.warn('password-recovery: no account for email (silenced)');
    }

    return genericResponse;
  } catch (error) {
    console.error('Error in password recovery:', error);
    return NextResponse.json(
      { message: 'Errore nel processo di recupero password' },
      { status: 500 }
    );
  }
}
