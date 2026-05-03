/**
 * One-time setup for Client-Side Field Level Encryption.
 *
 *   1. Creates a unique index on __keyVault.keyAltNames so duplicate DEK
 *      creation is rejected at the DB level.
 *   2. Creates the PII Data Encryption Key if it does not already exist.
 *
 * Idempotent: re-running reports "already exists" and exits cleanly.
 *
 * Run with:
 *   MONGODB_URL="..." npx tsx scripts/csfle-setup.ts
 */
import { MongoClient, ClientEncryption } from 'mongodb';
import { buildCsfleContext } from '../src/lib/db/csfle';

async function main() {
  const MONGODB_URL = process.env.MONGODB_URL;
  if (!MONGODB_URL) throw new Error('MONGODB_URL is not set');

  const ctx = buildCsfleContext();
  const [kvDb, kvCol] = ctx.keyVaultNamespace.split('.');

  const client = new MongoClient(MONGODB_URL);
  await client.connect();
  console.log('[csfle-setup] connected to', MONGODB_URL.replace(/\/\/[^@]*@/, '//***@'));

  try {
    // Unique index on keyAltNames — recommended by the MongoDB docs so the
    // setup script is naturally idempotent and a duplicate alt name errors
    // out at the write layer instead of silently creating a second DEK.
    await client
      .db(kvDb)
      .collection(kvCol)
      .createIndex(
        { keyAltNames: 1 },
        {
          unique: true,
          partialFilterExpression: { keyAltNames: { $exists: true } },
        }
      );
    console.log('[csfle-setup] key vault index ensured');

    // Check for existing DEK before trying to create one so the happy
    // re-run path doesn't spam errors.
    const existing = await client
      .db(kvDb)
      .collection(kvCol)
      .findOne({ keyAltNames: ctx.dekAltName });

    if (existing) {
      console.log(
        `[csfle-setup] DEK "${ctx.dekAltName}" already exists: _id=${existing._id}`
      );
      return;
    }

    // Create the DEK. ClientEncryption talks to the key vault directly
    // using the MongoClient we pass in; kmsProviders supplies the
    // material used to wrap the new DEK (local key for dev; AWS/GCP/Azure
    // for prod).
    const clientEncryption = new ClientEncryption(client, {
      keyVaultNamespace: ctx.keyVaultNamespace,
      kmsProviders: ctx.kmsProviders,
    });

    const dekId = await clientEncryption.createDataKey('local', {
      keyAltNames: [ctx.dekAltName],
    });

    console.log(
      `[csfle-setup] created DEK "${ctx.dekAltName}": _id=${dekId.toString('hex')}`
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('[csfle-setup] FAILED:', err);
  process.exit(1);
});
