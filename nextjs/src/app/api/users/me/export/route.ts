import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import OrderModel from '@/lib/db/models/Order';
import ProductModel from '@/lib/db/models/Product';
import NewsletterModel from '@/lib/db/models/Newsletter';
import {
  AuthError,
  requireSession,
  projectOwnerUser,
} from '@/lib/auth/require';

// GET /api/users/me/export — Task 12b, GDPR Article 20 right to data portability.
//
// Returns a JSON attachment containing every piece of tenant data that is
// directly scoped to the authenticated user:
//   - profile (the owner projection — same shape the user sees on their
//     own GET /api/users/[id])
//   - orders placed by them (as buyer)
//   - orders fulfilled by them (as seller)
//   - products they own
//   - reviews authored by them (nested inside their products' documents
//     are already included in the products array; this list surfaces
//     reviews the user has written on OTHER sellers' products)
//   - newsletter subscription row, if any
//
// Fields the user never had access to (accountKey, password, loginToken,
// recoveryPasswordId) are explicitly NOT in the export even though the
// row is owner-scoped, because they are not part of the user's "personal
// data" under GDPR — they are authentication material.
export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();

    const user = await UserModel.findById(session.user.id);
    if (!user || user.deletedAt) {
      return NextResponse.json(
        { message: 'Utente non trovato' },
        { status: 404 }
      );
    }

    const [ordersAsBuyer, ordersAsSeller, products, newsletter] =
      await Promise.all([
        OrderModel.find({ user: user._id }).lean(),
        OrderModel.find({ seller: user._id }).lean(),
        ProductModel.find({ seller: user._id }).lean(),
        NewsletterModel.findOne({ email: user.email }).lean(),
      ]);

    // Reviews on products owned by OTHER sellers that this user authored.
    // We walk products whose `reviews.user` includes this user's id and
    // project the matching review.
    const reviewsByUser = await ProductModel.aggregate([
      { $match: { 'reviews.user': user._id } },
      { $unwind: '$reviews' },
      { $match: { 'reviews.user': user._id } },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: '$name',
          review: '$reviews',
        },
      },
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      profile: projectOwnerUser(user),
      newsletter: newsletter ?? null,
      ordersAsBuyer,
      ordersAsSeller,
      products,
      reviewsOnOtherProducts: reviewsByUser,
    };

    const filename = `pagine_azzurre_export_${user._id.toString()}_${Date.now()}.json`;
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        // Discourage caches and intermediaries from holding onto the
        // user's personal data.
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return err.response;
    console.error('Error in GET /api/users/me/export:', err);
    return NextResponse.json(
      { message: "Errore nell'esportazione dei dati" },
      { status: 500 }
    );
  }
}
