import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';

// GET /api/users/referers — distinct list of groups/organizations declared
// by users at registration. Powers the search page's "Gruppo" autocomplete.
// Public endpoint (no session check) since group names are not PII.
export async function GET() {
  try {
    await connectDB();
    const raw = (await UserModel.distinct('referer')) as unknown[];
    // distinct() may return values that differ only by trailing whitespace
    // or casing — dedupe after normalization so the search filter sees
    // exactly one entry per group name.
    const seen = new Set<string>();
    const list: string[] = [];
    for (const v of raw) {
      if (typeof v !== 'string') continue;
      const normalized = v.trim().toUpperCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      list.push(normalized);
    }
    list.sort((a, b) => a.localeCompare(b, 'it'));
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching referers:', error);
    return NextResponse.json(
      { message: 'Errore nel recupero gruppi' },
      { status: 500 }
    );
  }
}
