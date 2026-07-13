import { Types } from 'mongoose';
import ProductModel from '@/lib/db/models/Product';
import UserModel from '@/lib/db/models/User';

// Recompute a seller's global rating from their products.
//
// Definition (per product decision): the global rating is the average of the
// per-ad ratings — only ads that have received at least one review count, so
// unreviewed ads (rating 0) don't drag the average down. numReviews is the
// total number of reviews received across all the seller's ads.
//
// Called whenever a product review is created; also used by the one-off
// backfill script. Without this, product reviews never propagate to the
// seller's global scheda and it stays at 0.
export async function recomputeSellerRating(sellerId: string | Types.ObjectId) {
  const sellerObjectId =
    typeof sellerId === 'string' ? new Types.ObjectId(sellerId) : sellerId;

  const [stats] = await ProductModel.aggregate([
    { $match: { seller: sellerObjectId, numReviews: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: '$numReviews' },
      },
    },
  ]);

  const rating = stats?.avgRating ?? 0;
  const numReviews = stats?.totalReviews ?? 0;

  await UserModel.updateOne(
    { _id: sellerObjectId },
    { $set: { 'seller.rating': rating, 'seller.numReviews': numReviews } }
  );

  return { rating, numReviews };
}
