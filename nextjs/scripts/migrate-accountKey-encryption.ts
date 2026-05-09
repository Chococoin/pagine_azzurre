/**
 * One-shot migration: encrypts every User.accountKey that is still stored as
 * plaintext (i.e. not prefixed with "enc:v1:").
 *
 * Run with:
 *   cd nextjs && npx tsx scripts/migrate-accountKey-encryption.ts
 *
 * Idempotent: rows already encrypted are skipped. After a successful run,
 * re-running reports "0 migrated".
 *
 * Preconditions:
 *   - MONGODB_URL set in env (loaded from .env.local by Next.js, but this
 *     script does not auto-load env — export it or use `dotenv -e .env.local`).
 *   - ACCOUNT_KEY_KEK set (32-byte base64).
 */
import mongoose from 'mongoose';
import UserModel from '../src/lib/db/models/User';
import {
  encryptAccountKey,
  isEncrypted,
} from '../src/lib/crypto/accountKey';

async function main() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('MONGODB_URL is not set');
  if (!process.env.ACCOUNT_KEY_KEK) {
    throw new Error('ACCOUNT_KEY_KEK is not set');
  }

  await mongoose.connect(uri);
  console.log('[migrate] connected to', uri.replace(/\/\/[^@]*@/, '//***@'));

  const cursor = UserModel.find({}, { accountKey: 1 })
    .select('+accountKey')
    .lean()
    .cursor();

  let scanned = 0;
  let migrated = 0;
  let already = 0;
  let skippedMissing = 0;

  for await (const row of cursor) {
    scanned++;
    const current = row.accountKey;
    if (!current) {
      skippedMissing++;
      continue;
    }
    if (isEncrypted(current)) {
      already++;
      continue;
    }
    const encrypted = encryptAccountKey(current);
    await UserModel.updateOne(
      { _id: row._id },
      { $set: { accountKey: encrypted } }
    );
    migrated++;
    if (migrated % 50 === 0) {
      console.log(`[migrate] ${migrated} rows migrated so far...`);
    }
  }

  console.log('[migrate] done.', {
    scanned,
    migrated,
    already,
    skippedMissing,
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[migrate] FAILED:', err);
  process.exit(1);
});
