import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import { authOptions } from '@/lib/auth/config';
import { sendAdminMessageEmail } from '@/lib/services/email';
import {
  enforceRateLimits,
  getClientIp,
} from '@/lib/security/rateLimit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/users/[id]/email - Admin only: send a direct email to a user
// from the Gestione Utenti table. Subject and body are plain text: tags are
// stripped and length is capped, mirroring /api/orders/mailing.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
    }

    const body = await request.json();
    const rawSubject: unknown = body?.subject;
    const rawEmailBody: unknown = body?.emailBody;
    if (typeof rawSubject !== 'string' || typeof rawEmailBody !== 'string') {
      return NextResponse.json(
        { message: 'Oggetto o messaggio non valido' },
        { status: 400 }
      );
    }

    const subject = rawSubject.slice(0, 200).replace(/<[^>]*>/g, '').trim();
    const emailBody = rawEmailBody.slice(0, 2000).replace(/<[^>]*>/g, '').trim();
    if (!subject || !emailBody) {
      return NextResponse.json(
        { message: 'Oggetto e messaggio sono obbligatori' },
        { status: 400 }
      );
    }

    const rateLimited = await enforceRateLimits([
      {
        config: { bucket: 'admin-user-email-ip', limit: 20, windowMs: 60 * 60 * 1000 },
        identifier: getClientIp(request),
      },
      {
        config: { bucket: 'admin-user-email-sender', limit: 10, windowMs: 60 * 60 * 1000 },
        identifier: session.user.id,
      },
    ]);
    if (rateLimited) return rateLimited;

    await connectDB();

    const user = await UserModel.findById(id).select('email name username deletedAt');
    if (!user?.email || user.deletedAt) {
      return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
    }

    try {
      await sendAdminMessageEmail(
        user.email,
        user.name || user.username || 'Utente',
        subject,
        emailBody
      );
    } catch (emailError) {
      console.error('Error sending admin email:', emailError);
      return NextResponse.json(
        { message: "Errore nell'invio email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { mailStatus: 'Mail Sent.', resp_code: 1 },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error in admin user email:', error);
    return NextResponse.json(
      { message: "Errore nell'invio email" },
      { status: 500 }
    );
  }
}
