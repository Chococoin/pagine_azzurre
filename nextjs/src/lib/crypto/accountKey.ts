import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// AES-256-GCM envelope for User.accountKey (the on-chain private key).
//
// Stored format: "enc:v1:<base64>" where <base64> is a concatenation of
//   IV(12) || CIPHERTEXT(n) || TAG(16).
// A legacy plaintext value (the raw 0x-prefixed hex key) is left alone by
// decryptAccountKey so the code is deployable before the migration runs.
// migrate-accountKey-encryption.ts handles the one-shot upgrade.

const PREFIX = 'enc:v1:';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

let cachedKek: Buffer | null = null;

function getKek(): Buffer {
  if (cachedKek) return cachedKek;
  const raw = process.env.ACCOUNT_KEY_KEK;
  if (!raw) {
    throw new Error(
      'ACCOUNT_KEY_KEK is not set. Set a 32-byte base64-encoded key in the environment.'
    );
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error(
      `ACCOUNT_KEY_KEK must decode to 32 bytes, got ${buf.length}.`
    );
  }
  cachedKek = buf;
  return buf;
}

export function isEncrypted(stored: string | undefined | null): boolean {
  return typeof stored === 'string' && stored.startsWith(PREFIX);
}

export function encryptAccountKey(plaintext: string): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('encryptAccountKey: plaintext must be a non-empty string');
  }
  if (plaintext.startsWith(PREFIX)) return plaintext; // already encrypted
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', getKek(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const envelope = Buffer.concat([iv, ct, tag]);
  return PREFIX + envelope.toString('base64');
}

export function decryptAccountKey(stored: string | undefined | null): string {
  if (!stored) {
    throw new Error('decryptAccountKey: empty stored value');
  }
  if (!stored.startsWith(PREFIX)) {
    // Legacy plaintext. Callers should run the migration and we should
    // eventually reject these, but for now pass through so the app keeps
    // working during the rollout.
    return stored;
  }
  const envelope = Buffer.from(stored.slice(PREFIX.length), 'base64');
  if (envelope.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('decryptAccountKey: envelope too short');
  }
  const iv = envelope.subarray(0, IV_LENGTH);
  const tag = envelope.subarray(envelope.length - TAG_LENGTH);
  const ct = envelope.subarray(IV_LENGTH, envelope.length - TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', getKek(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}
