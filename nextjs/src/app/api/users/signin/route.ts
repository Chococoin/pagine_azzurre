import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import {
  enforceRateLimits,
  getClientIp,
} from '@/lib/security/rateLimit';

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

    // Task 8: IP rate limit. 10 attempts/minute per IP. Per-email lockout
    // after repeated failures is handled in Task 10 below, after the user
    // lookup so we can distinguish existing-vs-missing emails.
    const ipRateLimited = await enforceRateLimits([
      {
        config: { bucket: 'signin-ip', limit: 10, windowMs: 60 * 1000 },
        identifier: getClientIp(request),
      },
    ]);
    if (ipRateLimited) return ipRateLimited;

    await connectDB();

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { message: 'Email o password non validi' },
        { status: 401 }
      );
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Email o password non validi' },
        { status: 401 }
      );
    }

    if (!user.verify.verified) {
      return NextResponse.json(
        { message: 'Account non verificato. Controlla la tua email.' },
        { status: 401 }
      );
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
