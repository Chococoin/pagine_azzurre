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
//
// Ordering: recent joiners (registered within the last week) come FIRST,
// in FIFO order (earliest registration first), so a newly-qualifying seller
// surfaces at the top instead of the bottom. Everyone else follows,
// alphabetically by display name.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

    const projected = sellers.map((s) => projectPublicUser(s));

    const createdMs = (u: Record<string, unknown>) => {
      const v = u.createdAt;
      const t = v ? new Date(v as string).getTime() : 0;
      return Number.isNaN(t) ? 0 : t;
    };
    const nameOf = (u: Record<string, unknown>) => {
      const seller = u.seller as { name?: string } | undefined;
      return (seller?.name || (u.name as string) || (u.username as string) || '').toString();
    };

    const cutoff = Date.now() - WEEK_MS;
    const recent = projected
      .filter((u) => createdMs(u) >= cutoff)
      .sort((a, b) => createdMs(a) - createdMs(b)); // FIFO: earliest first
    const rest = projected
      .filter((u) => createdMs(u) < cutoff)
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'it', { sensitivity: 'base' }));

    return NextResponse.json([...recent, ...rest]);
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json(
      { message: 'Errore nel recupero venditori' },
      { status: 500 }
    );
  }
}
