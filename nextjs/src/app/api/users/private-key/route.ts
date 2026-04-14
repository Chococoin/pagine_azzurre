import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import { authOptions } from '@/lib/auth/config';
import { decryptAccountKey } from '@/lib/crypto/accountKey';

// GET /api/users/private-key - Get authenticated user's private key
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Non autorizzato' },
        { status: 401 }
      );
    }

    await connectDB();

    // M4: look up by the stable session.user.id, not by email. Email is
    // mutable (admin update can change it) and a stale session token after
    // an email rotation would otherwise read a different row.
    const user = await UserModel.findById(session.user.id, { accountKey: 1 });

    if (!user) {
      return NextResponse.json(
        { message: 'Utente non trovato' },
        { status: 404 }
      );
    }

    if (!user.accountKey) {
      return NextResponse.json(
        { message: 'Chiave privata non disponibile' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      accountKey: decryptAccountKey(user.accountKey),
    });
  } catch (error) {
    console.error('Error fetching private key:', error);
    return NextResponse.json(
      { message: 'Errore nel recupero della chiave privata' },
      { status: 500 }
    );
  }
}
