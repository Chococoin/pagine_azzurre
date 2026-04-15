import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import {
  BCRYPT_COST,
  hashPassword,
  needsRehash,
} from '@/lib/security/password';
import {
  consumeRateLimit,
  enforceRateLimits,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rateLimit';

// Fixed bcrypt hash used to pad the response time when the user does not
// exist. Without this, a missing email returns in ~1ms while a real email
// takes ~80ms (bcrypt.compareSync), giving a reliable timing oracle
// (AUTH-VULN-11). The cost factor matches BCRYPT_COST so timing converges
// to the same baseline for every request once legacy hashes have been
// upgraded on login (see needsRehash below).
const DUMMY_BCRYPT_HASH = bcrypt.hashSync('timing-padding-placeholder', BCRYPT_COST);

const LOGIN_FAIL_LOCKOUT = {
  bucket: 'signin-email-failure',
  limit: 5,
  windowMs: 15 * 60 * 1000,
};

// POST /api/users/signin - User login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (typeof email !== 'string' || typeof password !== 'string' || email.length === 0 || password.length === 0) {
      return NextResponse.json(
        { message: 'Email e password richiesti' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Task 8: IP rate limit. 10 attempts/minute per IP.
    const ipRateLimited = await enforceRateLimits([
      {
        config: { bucket: 'signin-ip', limit: 10, windowMs: 60 * 1000 },
        identifier: getClientIp(request),
      },
    ]);
    if (ipRateLimited) return ipRateLimited;

    // Task 10: per-email lockout. We peek (no increment) before doing the
    // expensive bcrypt work. If the email is already over the failure
    // threshold, return 429 without leaking whether the password would have
    // matched.
    await connectDB();
    const failuresPreview = await consumeRateLimit(
      { ...LOGIN_FAIL_LOCKOUT },
      normalizedEmail
    );
    if (!failuresPreview.ok) {
      // Note: we consumed one slot above. That's intentional — attackers
      // should not be able to probe lockout status for free. Legitimate
      // users see the lockout window reset after 15 minutes.
      return rateLimitResponse(failuresPreview);
    }

    const user = await UserModel.findOne({ email: normalizedEmail });

    // Task 9 (AUTH-VULN-11): always run bcrypt.compareSync, even when the
    // user does not exist, so the timing oracle is closed.
    const hashToCompare = user?.password ?? DUMMY_BCRYPT_HASH;
    const bcryptOk = bcrypt.compareSync(password, hashToCompare);

    // Task 9 (AUTH-VULN-02/03): one generic failure response for every
    // negative path — missing user, bad password, unverified — so the
    // caller cannot distinguish.
    const genericFailure = NextResponse.json(
      { message: 'Email o password non validi' },
      { status: 401 }
    );

    if (!user || !bcryptOk) {
      // The slot we consumed above already counts this failure. We do not
      // double-count here.
      return genericFailure;
    }

    if (!user.verify.verified) {
      return genericFailure;
    }

    // Task 12c: users that have requested GDPR deletion cannot sign in,
    // even during the 30-day grace window. (Allowing login during grace
    // would require a distinct "account recovery" UX that isn't built
    // yet; the generic failure response keeps the enum oracle closed.)
    if (user.deletedAt) {
      return genericFailure;
    }

    // Success: reset the per-email failure counter so repeat offenders who
    // *do* eventually log in don't stay locked out of their own account.
    // Escape the email when building the regex — unescaped user input
    // would let someone register `foo.*@x.com` and reset other users'
    // lockout counters (`fooXXX@x.com`).
    try {
      const db = mongoose.connection?.db;
      if (db) {
        const escaped = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        await db.collection('rate_limits').deleteMany({
          key: { $regex: `^${LOGIN_FAIL_LOCKOUT.bucket}:${escaped}:` },
        });
      }
    } catch (err) {
      console.warn('signin: failed to reset failure counter', err);
    }

    // Task 13: transparent password rehash. If the stored hash is at a
    // cost factor below the current target (bumped from 8 to 12), upgrade
    // it now that we know the plaintext. Failure here is non-fatal — the
    // user is already signed in; we only miss the upgrade for this cycle.
    if (needsRehash(user.password)) {
      try {
        user.password = hashPassword(password);
        await user.save();
      } catch (err) {
        console.warn('signin: transparent rehash failed', err);
      }
    }

    // Return user data (excluding sensitive fields)
    return NextResponse.json({
      _id: user._id.toString(),
      account: user.account,
      username: user.username,
      name: user.name,
      surname: user.surname,
      email: user.email,
      city: user.city,
      zipCode: user.zipCode,
      phone: user.phone,
      isAdmin: user.isAdmin,
      isSeller: user.isSeller,
      hasAd: user.hasAd,
      activity: user.activity,
      verify: user.verify,
      seller: user.seller,
    });
  } catch (error) {
    console.error('Error during signin:', error);
    return NextResponse.json(
      { message: 'Errore durante il login' },
      { status: 500 }
    );
  }
}
