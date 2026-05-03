import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Binary } from 'mongodb';

// Client-Side Field Level Encryption (CSFLE) configuration.
//
// Dev uses a local 96-byte key stored in nextjs/secrets/csfle-master.key
// (gitignored). Prod MUST migrate to a managed KMS provider — AWS, GCP,
// Azure, or KMIP — see docs/csfle-production-setup.md.
//
// Scope (intentionally narrow): only user PII and order shipping addresses
// are encrypted. Public data (products, reviews, seller cards) stays in
// plaintext because it is not personal data under GDPR and because queries
// on those fields need to stay cheap.

const KEY_VAULT_NAMESPACE = 'encryption.__keyVault';
const DEK_ALT_NAME = 'pagine_azzurre_pii_dek_v1';
const DET = 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic';
const RND = 'AEAD_AES_256_CBC_HMAC_SHA_512-Random';

export interface CsfleContext {
  keyVaultNamespace: typeof KEY_VAULT_NAMESPACE;
  kmsProviders: { local: { key: Buffer } };
  dekAltName: typeof DEK_ALT_NAME;
}

/**
 * Load the dev master key from disk. Throws a clear error if the file is
 * missing — that's usually a sign the developer hasn't run csfle-setup yet
 * or forgot to copy the key file from another environment.
 */
export function loadLocalMasterKey(): Buffer {
  const keyPath =
    process.env.CSFLE_LOCAL_KEY_PATH ??
    resolve(process.cwd(), 'secrets/csfle-master.key');
  try {
    const buf = readFileSync(keyPath);
    if (buf.length !== 96) {
      throw new Error(
        `CSFLE local master key must be exactly 96 bytes, got ${buf.length}`
      );
    }
    return buf;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `CSFLE local master key not found at ${keyPath}. ` +
          `Run: node -e "require('fs').writeFileSync('${keyPath}', require('crypto').randomBytes(96))"`
      );
    }
    throw err;
  }
}

export function buildCsfleContext(): CsfleContext {
  return {
    keyVaultNamespace: KEY_VAULT_NAMESPACE,
    kmsProviders: { local: { key: loadLocalMasterKey() } },
    dekAltName: DEK_ALT_NAME,
  };
}

/**
 * Path to the crypt_shared library used by the driver for automatic
 * query analysis. crypt_shared replaces the old mongocryptd daemon; it
 * is a single dylib (macOS) / so (linux) / dll (windows) that ships with
 * MongoDB Enterprise and is downloadable standalone from the MongoDB
 * CDN. See docs/csfle-production-setup.md for prod deployment.
 *
 * Returns null if the library is not installed — callers should then
 * fall back to explicit encryption or raise a clear error.
 */
export function getCryptSharedLibPath(): string | null {
  const override = process.env.CSFLE_CRYPT_SHARED_PATH;
  if (override) return override;
  const defaultPath = resolve(process.cwd(), 'secrets/mongo_crypt_v1.dylib');
  return existsSync(defaultPath) ? defaultPath : null;
}

/**
 * Extract database name from the connection string. CSFLE's schemaMap keys
 * use the full namespace (database.collection), so we need to know the db
 * name at runtime.
 */
export function getDatabaseName(): string {
  const url = process.env.MONGODB_URL;
  if (!url) throw new Error('MONGODB_URL is not set');
  // mongodb://host[:port]/dbname?query  -or-  mongodb+srv://host/dbname?query
  const match = url.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/);
  if (!match) {
    throw new Error(`Cannot parse database name from MONGODB_URL`);
  }
  return decodeURIComponent(match[1]);
}

/**
 * Build the CSFLE schema map for this project. Every encrypted field
 * lists an explicit algorithm and (via encryptMetadata) the keyId that
 * will wrap it. keyId must be an array of Binary UUIDs (BSON subtype 4).
 */
export function buildSchemaMap(keyId: Binary): Record<string, unknown> {
  const dbName = getDatabaseName();
  const metadata = { keyId: [keyId] };

  const userSchema = {
    bsonType: 'object',
    encryptMetadata: metadata,
    properties: {
      // Deterministic — queried by equality (findOne({email}), unique index
      // on cf/partitaIva). Deterministic encryption leaks "same plaintext
      // → same ciphertext" but that is acceptable for unique identifiers.
      email: {
        encrypt: { bsonType: 'string', algorithm: DET },
      },
      cf: {
        encrypt: { bsonType: 'string', algorithm: DET },
      },
      partitaIva: {
        encrypt: { bsonType: 'string', algorithm: DET },
      },
      // Random — never queried, only read for display. Strongest setting:
      // two users with the same phone get different ciphertexts.
      phone: {
        encrypt: { bsonType: 'string', algorithm: RND },
      },
      birthday: {
        encrypt: { bsonType: 'string', algorithm: RND },
      },
      birthplace: {
        encrypt: { bsonType: 'string', algorithm: RND },
      },
      city: {
        encrypt: { bsonType: 'string', algorithm: RND },
      },
      zipCode: {
        encrypt: { bsonType: 'int', algorithm: RND },
      },
    },
  };

  const orderSchema = {
    bsonType: 'object',
    encryptMetadata: metadata,
    properties: {
      shippingAddress: {
        bsonType: 'object',
        properties: {
          fullName: {
            encrypt: { bsonType: 'string', algorithm: RND },
          },
          address: {
            encrypt: { bsonType: 'string', algorithm: RND },
          },
          postalCode: {
            encrypt: { bsonType: 'string', algorithm: RND },
          },
          city: {
            encrypt: { bsonType: 'string', algorithm: RND },
          },
          country: {
            encrypt: { bsonType: 'string', algorithm: RND },
          },
        },
      },
    },
  };

  return {
    [`${dbName}.users`]: userSchema,
    [`${dbName}.orders`]: orderSchema,
  };
}
