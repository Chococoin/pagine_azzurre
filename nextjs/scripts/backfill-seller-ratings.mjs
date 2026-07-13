// One-off backfill: recompute every seller's global rating from their product
// reviews. The global rating is the average of per-ad ratings (only ads with
// reviews count); numReviews is the total reviews across the seller's ads.
//
// Usage (from nextjs/):  MONGODB_URL="..." node scripts/backfill-seller-ratings.mjs
// Reads MONGODB_URL from the environment or .env / .env.local.

import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';

function loadMongoUrl() {
  if (process.env.MONGODB_URL) return process.env.MONGODB_URL;
  for (const file of ['.env.local', '.env']) {
    try {
      const line = readFileSync(file, 'utf8')
        .split('\n')
        .find((l) => l.startsWith('MONGODB_URL'));
      if (line) return line.slice(line.indexOf('=') + 1).trim().replace(/^"|"$/g, '');
    } catch {
      /* file may not exist */
    }
  }
  throw new Error('MONGODB_URL not found in env or .env files');
}

const url = loadMongoUrl();
await mongoose.connect(url);
const db = mongoose.connection.db;
console.log('Connected to', db.databaseName);

const products = db.collection('products');
const users = db.collection('users');

// Aggregate per-seller stats from products that have reviews.
const stats = await products
  .aggregate([
    { $match: { numReviews: { $gt: 0 } } },
    {
      $group: {
        _id: '$seller',
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: '$numReviews' },
      },
    },
  ])
  .toArray();

console.log(`Sellers with reviewed ads: ${stats.length}`);

let updated = 0;
for (const s of stats) {
  const res = await users.updateOne(
    { _id: s._id },
    { $set: { 'seller.rating': s.avgRating, 'seller.numReviews': s.totalReviews } }
  );
  if (res.matchedCount) updated++;
}

// Reset sellers that currently show a stale non-zero global but no reviewed ads.
const reviewedSellerIds = stats.map((s) => s._id);
const resetRes = await users.updateMany(
  {
    _id: { $nin: reviewedSellerIds },
    $or: [{ 'seller.rating': { $gt: 0 } }, { 'seller.numReviews': { $gt: 0 } }],
  },
  { $set: { 'seller.rating': 0, 'seller.numReviews': 0 } }
);

console.log(`Updated ${updated} sellers with reviews; reset ${resetRes.modifiedCount} stale sellers.`);
await mongoose.disconnect();
console.log('Done.');
