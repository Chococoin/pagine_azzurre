import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import { sendPasswordReplacedEmail } from '@/lib/services/email';
import { hashPassword } from '@/lib/security/password';
import {
  enforceRateLimits,
  getClientIp,
} from '@/lib/security/rateLimit';

// POST /api/users/password-replacement - Replace password with recovery ID
export async function POST(request: NextRequest) {
  try {
    // Task 8: rate limit. Each IP may submit 10 replacement attempts per hour
    // — high enough that legitimate re-tries still work, low enough to block
    // guessing of the recovery id.
    const rateLimited = await enforceRateLimits([
      {
        config: { bucket: 'password-replacement-ip', limit: 10, windowMs: 60 * 60 * 1000 },
        identifier: getClientIp(request),
      },
    ]);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { id, newData } = body ?? {};

    // Strict type checks close INJ-VULN-01. An empty-string id is also rejected
    // because recoveryPasswordId defaults to '' in the User model, so matching
    // on '' would wildcard every user who never requested a recovery.
    if (typeof id !== 'string' || id.length === 0) {
      return NextResponse.json(
        { message: 'ID e nuova password richiesti' },
        { status: 400 }
      );
    }

    if (typeof newData !== 'string' || newData.length < 6) {
      return NextResponse.json(
        { message: 'La password deve avere almeno 6 caratteri' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await UserModel.findOne({ recoveryPasswordId: id });

    if (!user || user.recoveryPasswordId !== id) {
      return NextResponse.json(
        { message: 'Link di recupero non valido o scaduto' },
        { status: 404 }
      );
    }

    // Update password and clear recovery ID.
    user.password = hashPassword(newData);
    user.recoveryPasswordId = '';
    await user.save();

    // Send confirmation email
    try {
      await sendPasswordReplacedEmail(user.email, user.username);
    } catch (emailError) {
      console.error('Error sending password replaced email:', emailError);
      // Continue even if email fails
    }

    return NextResponse.json({
      password_replacement: true,
    });
  } catch (error) {
    console.error('Error in password replacement:', error);
    return NextResponse.json(
      { password_replacement: false, loading: false, message: 'Password non sostituita' },
      { status: 500 }
    );
  }
}
