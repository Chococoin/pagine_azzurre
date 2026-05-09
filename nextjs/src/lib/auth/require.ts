import { NextResponse } from 'next/server';
import { getServerSession, type Session } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import type { User, UserDocument } from '@/lib/db/models/User';

export class AuthError extends Error {
  constructor(public readonly response: NextResponse) {
    super('auth error');
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError(
      NextResponse.json({ message: 'Non autorizzato' }, { status: 401 })
    );
  }
  return session;
}

export function requireOwnerOrAdmin(
  session: Session,
  ownerId: string | null | undefined
): void {
  if (session.user.isAdmin) return;
  if (ownerId && session.user.id === ownerId) return;
  throw new AuthError(
    NextResponse.json({ message: 'Non trovato' }, { status: 404 })
  );
}

export async function withAuth<T>(
  handler: (session: Session) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const session = await requireSession();
    return await handler(session);
  } catch (err) {
    if (err instanceof AuthError) return err.response;
    throw err;
  }
}

const PUBLIC_USER_FIELDS = [
  'username',
  'name',
  'isSeller',
  'hasAd',
  'activity',
  'seller',
  'createdAt',
] as const;

const OWNER_USER_FIELDS = [
  ...PUBLIC_USER_FIELDS,
  'account',
  'email',
  'surname',
  'birthday',
  'birthplace',
  'gender',
  'cf',
  'partitaIva',
  'city',
  'zipCode',
  'phone',
  'isAdmin',
  'verify',
  'updatedAt',
] as const;

type ProjectedUser = Record<string, unknown>;

function pickFields(
  user: Pick<UserDocument, '_id'> & Partial<User>,
  fields: readonly string[]
): ProjectedUser {
  const source = user as unknown as Record<string, unknown>;
  const out: ProjectedUser = { _id: user._id.toString() };
  for (const field of fields) {
    if (source[field] !== undefined) out[field] = source[field];
  }
  return out;
}

export function projectPublicUser(
  user: Pick<UserDocument, '_id'> & Partial<User>
): ProjectedUser {
  return pickFields(user, PUBLIC_USER_FIELDS);
}

export function projectOwnerUser(
  user: Pick<UserDocument, '_id'> & Partial<User>
): ProjectedUser {
  return pickFields(user, OWNER_USER_FIELDS);
}
