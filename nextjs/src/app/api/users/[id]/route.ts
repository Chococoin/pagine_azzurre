import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import NewsletterModel from '@/lib/db/models/Newsletter';
import { authOptions } from '@/lib/auth/config';
import {
  AuthError,
  requireSession,
  projectPublicUser,
  projectOwnerUser,
} from '@/lib/auth/require';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id]
// AUTHZ-VULN-02: was fully public and returned every PII field.
// Now: requires a valid session; full profile only for the owner or admin;
// everyone else receives the minimal public projection (username, seller card, ...).
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
    }

    await connectDB();

    const user = await UserModel.findById(id);

    if (!user) {
      return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
    }

    const isOwner = session.user.id === user._id.toString();
    const canSeeFullProfile = isOwner || session.user.isAdmin;

    if (!canSeeFullProfile) {
      return NextResponse.json(projectPublicUser(user));
    }

    // Owner or admin: full projection + newsletter subscription status (PII).
    const newsletter = await NewsletterModel.findOne({ email: user.email });
    const newsletterStatus = newsletter?.verified ? 'Verified' : 'Not Verified';

    return NextResponse.json({
      ...projectOwnerUser(user),
      newsletter: newsletterStatus,
    });
  } catch (error) {
    if (error instanceof AuthError) return error.response;
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { message: 'Errore nel recupero utente' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Admin only: update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const user = await UserModel.findById(id);

    if (!user) {
      return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
    }

    // Admin can update these fields
    user.name = body.name || user.name;
    user.email = body.email || user.email;
    user.isSeller = typeof body.isSeller === 'boolean' ? body.isSeller : user.isSeller;
    user.isAdmin = typeof body.isAdmin === 'boolean' ? body.isAdmin : user.isAdmin;

    const updatedUser = await user.save();

    return NextResponse.json({
      message: 'Utente aggiornato',
      user: updatedUser.toJSON(),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { message: 'Errore nell\'aggiornamento utente' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Admin only: delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const user = await UserModel.findById(id);

    if (!user) {
      return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
    }

    // Prevent deleting admin user
    if (user.email === 'admin@example.com') {
      return NextResponse.json(
        { message: 'Non è possibile eliminare l\'utente admin' },
        { status: 400 }
      );
    }

    await UserModel.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'Utente eliminato',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { message: 'Errore nell\'eliminazione utente' },
      { status: 500 }
    );
  }
}
