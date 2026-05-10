import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import { projectPublicUser } from '@/lib/auth/require';

// GET /api/users/sellers
//
// Public directory powering the /tutti-noi gallery. Only sellers who have
// completed the gallery entry are returned:
//   - isSeller: true
//   - hasAd: true                 (rule: published at least one ad)
//   - seller.logo non-empty       (personal photo)
//   - seller.description non-empty (personal description)
//
// PII fields (email, phone, cf, partitaIva, ...) are stripped via
// projectPublicUser; the response carries only the columns the legacy
// gallery rendered (username, seller card, hasAd, activity, createdAt).
export async function GET() {
  try {
    await connectDB();

    const sellers = await UserModel.find({
      isSeller: true,
      hasAd: true,
      deletedAt: null,
      'seller.logo': { $exists: true, $nin: [null, ''] },
      'seller.description': { $exists: true, $nin: [null, ''] },
    });

    return NextResponse.json(sellers.map((s) => projectPublicUser(s)));
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json(
      { message: 'Errore nel recupero venditori' },
      { status: 500 }
    );
  }
}
