import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import NewsletterModel from '@/lib/db/models/Newsletter';
import { sendVerificationEmail } from '@/lib/services/email';
import { encryptAccountKey } from '@/lib/crypto/accountKey';
import { hashPassword } from '@/lib/security/password';
import {
  enforceRateLimits,
  getClientIp,
} from '@/lib/security/rateLimit';

// POST /api/users/register - Register new user
export async function POST(request: NextRequest) {
  try {
    // Task 8: rate limit. 5 registrations/hour per IP to block mass-sign-up
    // abuse and registration-based enumeration.
    const rateLimited = await enforceRateLimits([
      {
        config: { bucket: 'register-ip', limit: 5, windowMs: 60 * 60 * 1000 },
        identifier: getClientIp(request),
      },
    ]);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { username, email, password, sellername, phone, cf, referer, newsletter } = body;

    // Validation
    if (!username || !email || !password || !sellername) {
      return NextResponse.json(
        { message: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Email non valida' },
        { status: 400 }
      );
    }

    // Password validation (min 6 chars)
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'La password deve avere almeno 6 caratteri' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if email already exists. Task 9 (AUTH-VULN-05): don't leak
    // existence via a distinct error message. On collision we pretend the
    // registration succeeded (same 200 response shape). The target inbox
    // already has an account and can sign in through the normal flow; the
    // attacker learns nothing. Username / seller-name conflicts keep their
    // explicit errors because those identifiers are intentionally public.
    const existingEmail = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      console.warn('register: duplicate email suppressed (enum defense)');
      return NextResponse.json({
        message: 'Registration received',
        _id: null,
      });
    }

    // Check if username already exists
    const existingUsername = await UserModel.findOne({ username: username.toUpperCase() });
    if (existingUsername) {
      return NextResponse.json(
        { message: 'Username già in uso' },
        { status: 400 }
      );
    }

    // Check if sellername already exists
    const existingSellerName = await UserModel.findOne({ 'seller.name': sellername });
    if (existingSellerName) {
      return NextResponse.json(
        { message: 'Nome venditore già in uso' },
        { status: 400 }
      );
    }

    // Hash password and create wallet
    const hashedPassword = hashPassword(password);
    // Generate wallet using viem
    const privateKey = generatePrivateKey();
    const walletAccount = privateKeyToAccount(privateKey);
    const trustedLink = uuidv4();

    // Create user — accountKey is encrypted at rest (AES-256-GCM + KEK).
    const user = new UserModel({
      account: walletAccount.address,
      accountKey: encryptAccountKey(privateKey),
      username: username.toUpperCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || undefined,
      cf: cf || undefined,
      referer: referer || undefined,
      seller: { name: sellername },
      isSeller: true,
      // New sign-ups are eligible from day one: hasAd defaults to true so the
      // "metti un prodotto in vetrina" gate no longer blocks them (and they
      // count toward the tutti-noi gallery once they add logo + description).
      hasAd: true,
      verify: { trusted_link: trustedLink, verified: false },
    });

    const createdUser = await user.save();

    // Handle newsletter subscription
    let isNewsletterSubscribed = false;
    if (newsletter) {
      const existingSubscriber = await NewsletterModel.findOne({ email: email.toLowerCase() });
      if (!existingSubscriber) {
        const newsletterEntry = new NewsletterModel({
          email: email.toLowerCase(),
          verified: true,
        });
        await newsletterEntry.save();
      }
      isNewsletterSubscribed = true;
    }

    // Send verification email
    const verificationLink = `${process.env.NEXTAUTH_URL}/verification/${trustedLink}`;
    try {
      await sendVerificationEmail(
        createdUser.email,
        createdUser.username,
        verificationLink,
        isNewsletterSubscribed
      );
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue even if email fails - user can request resend
    }

    return NextResponse.json({
      _id: createdUser._id.toString(),
      account: createdUser.account,
      username: createdUser.username,
      email: createdUser.email,
      phone: createdUser.phone,
      cf: createdUser.cf,
      isSeller: createdUser.isSeller,
      hasAd: createdUser.hasAd,
      referer: createdUser.referer,
      newsletter: isNewsletterSubscribed,
      verified: createdUser.verify.verified,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { message: 'Errore nella registrazione' },
      { status: 500 }
    );
  }
}
