#!/usr/bin/env node
/**
 * One-off migration: backfill Product.city and Product.referer from the
 * seller's own profile for legacy products that were created before the
 * edit form exposed these fields.
 *
 * Safe to re-run — only touches products whose city === '_' or whose
 * referer is missing/empty.
 *
 * Usage:
 *   node scripts/backfill-product-city-referer.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nextjsRoot = resolve(__dirname, '..');

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}

loadEnvFile(resolve(nextjsRoot, '.env.local'));
loadEnvFile(resolve(nextjsRoot, '.env'));

const MONGODB_URL = (process.env.MONGODB_URL ?? '').trim();
if (!MONGODB_URL) {
  console.error('MONGODB_URL is not set. Aborting.');
  process.exit(1);
}

console.log('Connecting to MongoDB…');
await mongoose.connect(MONGODB_URL);
console.log('Connected.');

const db = mongoose.connection.db;
const products = db.collection('products');
const users = db.collection('users');

// Pull candidates: any product missing city or referer.
const candidates = await products
  .find({
    $or: [
      { city: '_' },
      { city: { $exists: false } },
      { referer: { $in: [null, ''] } },
      { referer: { $exists: false } },
    ],
  })
  .toArray();

console.log(`Scanning ${candidates.length} candidate products…`);

// Batch-fetch the relevant sellers to avoid N round-trips.
const sellerIds = [...new Set(candidates.map((p) => String(p.seller)))].map(
  (id) => new mongoose.Types.ObjectId(id)
);
const sellerDocs = await users
  .find(
    { _id: { $in: sellerIds } },
    { projection: { city: 1, referer: 1 } }
  )
  .toArray();

const sellerMap = new Map(sellerDocs.map((u) => [String(u._id), u]));

let citySet = 0;
let refererSet = 0;
let skipped = 0;
let untouched = 0;

for (const product of candidates) {
  const seller = sellerMap.get(String(product.seller));
  const updates = {};

  // City: replace '_' or missing with seller.city if available.
  const needsCity =
    !product.city || product.city === '_' || product.city.trim() === '';
  if (needsCity && seller?.city) {
    updates.city = String(seller.city).toUpperCase();
  }

  // Referer: fill if missing/empty AND seller declared at least one.
  const needsReferer =
    product.referer == null || product.referer === '';
  if (
    needsReferer &&
    Array.isArray(seller?.referer) &&
    seller.referer.length > 0
  ) {
    updates.referer = String(seller.referer[0]).toUpperCase();
  }

  if (Object.keys(updates).length === 0) {
    if (!seller) skipped++;
    else untouched++;
    continue;
  }

  await products.updateOne({ _id: product._id }, { $set: updates });
  if (updates.city) citySet++;
  if (updates.referer) refererSet++;
}

console.log('');
console.log('Summary:');
console.log(`  city backfilled:    ${citySet}`);
console.log(`  referer backfilled: ${refererSet}`);
console.log(`  seller not found:   ${skipped}`);
console.log(`  nothing to do:      ${untouched}`);

await mongoose.disconnect();
console.log('Done.');
