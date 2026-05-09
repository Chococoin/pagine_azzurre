import bcrypt from 'bcryptjs';

// Current target cost factor for every newly-hashed password. Bumped from
// 8 to 12 in Task 13 (~16x slower, still comfortably under 1s per compare
// on modern hardware). Any existing hash at a lower cost is transparently
// upgraded the next time its owner signs in (see rehashIfNeeded below).
export const BCRYPT_COST = 12;

export function hashPassword(plaintext: string): string {
  return bcrypt.hashSync(plaintext, BCRYPT_COST);
}

export function needsRehash(storedHash: string): boolean {
  try {
    return bcrypt.getRounds(storedHash) < BCRYPT_COST;
  } catch {
    // Unparseable hashes are treated as "needs rehash" so that a legit
    // login with the correct password can heal the row.
    return true;
  }
}
