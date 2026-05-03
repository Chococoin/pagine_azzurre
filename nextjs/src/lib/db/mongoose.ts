import mongoose from 'mongoose';
import { MongoClient, type Binary } from 'mongodb';
import {
  buildCsfleContext,
  buildSchemaMap,
  getCryptSharedLibPath,
} from './csfle';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

/**
 * Resolve the current PII DEK's UUID from the key vault by its keyAltName
 * and build the per-process schema map. Cached for the lifetime of the
 * Node process so we don't re-hit the vault on every connection.
 */
let cachedSchemaMap: Record<string, unknown> | null = null;

async function resolveSchemaMap(): Promise<Record<string, unknown>> {
  if (cachedSchemaMap) return cachedSchemaMap;

  const ctx = buildCsfleContext();
  const url = process.env.MONGODB_URL!;
  const probe = new MongoClient(url);
  try {
    await probe.connect();
    const [db, col] = ctx.keyVaultNamespace.split('.');
    const doc = (await probe
      .db(db)
      .collection(col)
      .findOne({ keyAltNames: ctx.dekAltName })) as { _id: Binary } | null;
    if (!doc) {
      throw new Error(
        `CSFLE DEK with keyAltName "${ctx.dekAltName}" not found in ${ctx.keyVaultNamespace}. ` +
          `Run: npx tsx scripts/csfle-setup.ts`
      );
    }
    cachedSchemaMap = buildSchemaMap(doc._id);
    return cachedSchemaMap;
  } finally {
    await probe.close();
  }
}

export async function connectDB(): Promise<typeof mongoose> {
  const MONGODB_URL = process.env.MONGODB_URL;

  if (!MONGODB_URL) {
    throw new Error('Please define the MONGODB_URL environment variable');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: Record<string, unknown> = {
      bufferCommands: false,
    };

    // Task 15: when CSFLE_ENABLED=true, attach autoEncryption so the
    // driver transparently encrypts PII on write and decrypts on read.
    // Gated behind an env flag so dev environments that haven't run
    // csfle-setup yet keep working with plaintext.
    if (process.env.CSFLE_ENABLED === 'true') {
      const ctx = buildCsfleContext();
      const schemaMap = await resolveSchemaMap();
      const cryptSharedLibPath = getCryptSharedLibPath();
      if (!cryptSharedLibPath) {
        throw new Error(
          'CSFLE_ENABLED=true but crypt_shared library is not installed. ' +
            'Set CSFLE_CRYPT_SHARED_PATH or drop the dylib at secrets/mongo_crypt_v1.dylib. ' +
            'See docs/csfle-production-setup.md.'
        );
      }
      opts.autoEncryption = {
        keyVaultNamespace: ctx.keyVaultNamespace,
        kmsProviders: ctx.kmsProviders,
        schemaMap,
        extraOptions: {
          cryptSharedLibPath,
          cryptSharedLibRequired: true,
        },
      };
    }

    cached.promise = mongoose.connect(MONGODB_URL, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
