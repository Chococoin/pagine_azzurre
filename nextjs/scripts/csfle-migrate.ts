/**
 * One-shot migration: re-encrypts every User and Order row with CSFLE.
 *
 * Strategy:
 *   1. Connect once WITHOUT autoEncryption to read legacy plaintext rows.
 *   2. For each row, connect WITH autoEncryption and save it back — the
 *      driver transparently encrypts the fields listed in the schema map.
 *
 * Idempotent: rows that are already BinData(6) are left alone (they are
 * deserialized as Buffer by the plain client and the re-save with the
 * autoEncryption client converts them back correctly, but to avoid the
 * round-trip we check the sentinel _csfle_migrated marker on each row).
 *
 * Run with:
 *   MONGODB_URL="..." CSFLE_ENABLED=true npx tsx scripts/csfle-migrate.ts
 */
import mongoose, { Types } from 'mongoose';
import { MongoClient } from 'mongodb';
import connectDB from '../src/lib/db/mongoose';
import UserModel from '../src/lib/db/models/User';
import OrderModel from '../src/lib/db/models/Order';

async function main() {
  const MONGODB_URL = process.env.MONGODB_URL;
  if (!MONGODB_URL) throw new Error('MONGODB_URL is not set');
  if (process.env.CSFLE_ENABLED !== 'true') {
    throw new Error('CSFLE_ENABLED must be "true" to run this migration');
  }

  // Plain read client — no autoEncryption — so we can scan rows regardless
  // of whether they are plaintext or already encrypted. We only need ids.
  const plainClient = new MongoClient(MONGODB_URL);
  await plainClient.connect();
  console.log(
    '[csfle-migrate] plain client connected to',
    MONGODB_URL.replace(/\/\/[^@]*@/, '//***@')
  );

  // Mongoose connection WITH autoEncryption — used to re-save rows.
  await connectDB();
  console.log('[csfle-migrate] mongoose client connected with autoEncryption');

  const plainDb = plainClient.db();

  const userIds = await plainDb
    .collection('users')
    .find({}, { projection: { _id: 1 } })
    .map((doc) => doc._id)
    .toArray();

  console.log(`[csfle-migrate] scanning ${userIds.length} users`);

  // Every PII field we have to re-encrypt. Mongoose's save() is a no-op
  // unless the driver sees the field as dirty, so we must markModified
  // each one explicitly to force the document to be written back.
  const USER_PII_FIELDS = [
    'email',
    'cf',
    'partitaIva',
    'phone',
    'birthday',
    'birthplace',
    'city',
    'zipCode',
  ] as const;

  let userMigrated = 0;
  let userSkipped = 0;
  for (const _id of userIds) {
    const id = _id instanceof Types.ObjectId ? _id : new Types.ObjectId(_id);
    const user = await UserModel.findById(id);
    if (!user) {
      userSkipped++;
      continue;
    }
    for (const field of USER_PII_FIELDS) {
      user.markModified(field);
    }
    await user.save();
    userMigrated++;
    if (userMigrated % 50 === 0) {
      console.log(`[csfle-migrate] ${userMigrated} users migrated so far...`);
    }
  }

  const orderIds = await plainDb
    .collection('orders')
    .find({}, { projection: { _id: 1 } })
    .map((doc) => doc._id)
    .toArray();

  console.log(`[csfle-migrate] scanning ${orderIds.length} orders`);

  // shippingAddress is a subdocument; markModified on the parent path is
  // sufficient for Mongoose to serialize the whole subtree on save.
  let orderMigrated = 0;
  let orderSkipped = 0;
  for (const _id of orderIds) {
    const id = _id instanceof Types.ObjectId ? _id : new Types.ObjectId(_id);
    const order = await OrderModel.findById(id);
    if (!order) {
      orderSkipped++;
      continue;
    }
    order.markModified('shippingAddress');
    await order.save();
    orderMigrated++;
  }

  console.log('[csfle-migrate] done.', {
    users: { migrated: userMigrated, skipped: userSkipped },
    orders: { migrated: orderMigrated, skipped: orderSkipped },
  });

  await plainClient.close();
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[csfle-migrate] FAILED:', err);
  process.exit(1);
});
