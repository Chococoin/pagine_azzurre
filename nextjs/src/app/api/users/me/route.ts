import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import {
  AuthError,
  requireSession,
  projectOwnerUser,
} from '@/lib/auth/require';

// GET /api/users/me — return the authenticated user's current profile.
// Convenience wrapper around GET /api/users/[id] for the owner path so
// clients do not need to know their own id to fetch their profile.
export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();
    const user = await UserModel.findById(session.user.id);
    if (!user || user.deletedAt) {
      return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
    }
    return NextResponse.json(projectOwnerUser(user));
  } catch (err) {
    if (err instanceof AuthError) return err.response;
    console.error('Error in GET /api/users/me:', err);
    return NextResponse.json(
      { message: 'Errore nel recupero profilo' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/me — Task 12a, GDPR Article 17 right to erasure.
// Soft-deletes the authenticated user's row: sets deletedAt=now and
// deletionScheduledFor=+30 days. A separate hard-delete job (TODO) is
// expected to pick up rows whose deletionScheduledFor is in the past.
//
// Until hard delete runs, signin and public lookups treat the row as
// non-existent (see Task 12c). If the user signs in again during the
// grace window, the client is expected to offer a "recover account"
// flow which clears deletedAt — not implemented here, deliberately:
// recovering soft-deleted accounts requires a distinct authenticated
// path that the current signin handler does not expose.
export async function DELETE() {
  try {
    const session = await requireSession();
    await connectDB();

    const user = await UserModel.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'Utente non trovato' },
        { status: 404 }
      );
    }
    if (user.deletedAt) {
      return NextResponse.json(
        { message: 'Account già in attesa di eliminazione' },
        {
          status: 200,
          headers: {
            'X-Deletion-Scheduled-For': user.deletionScheduledFor?.toISOString() ?? '',
          },
        }
      );
    }

    const now = new Date();
    const scheduled = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    user.deletedAt = now;
    user.deletionScheduledFor = scheduled;
    await user.save();

    return NextResponse.json(
      {
        message: 'Account contrassegnato per eliminazione',
        deletedAt: now.toISOString(),
        deletionScheduledFor: scheduled.toISOString(),
        gracePeriodDays: 30,
      },
      { status: 202 }
    );
  } catch (err) {
    if (err instanceof AuthError) return err.response;
    console.error('Error in DELETE /api/users/me:', err);
    return NextResponse.json(
      { message: "Errore nell'eliminazione account" },
      { status: 500 }
    );
  }
}
