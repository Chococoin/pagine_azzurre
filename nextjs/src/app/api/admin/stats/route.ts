import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';
import ProductModel from '@/lib/db/models/Product';
import OrderModel from '@/lib/db/models/Order';
import NewsletterModel from '@/lib/db/models/Newsletter';
import { AuthError, requireSession } from '@/lib/auth/require';

export const dynamic = 'force-dynamic';

const SECTIONS = ['offro', 'cerco', 'propongo', 'avviso', 'dono'] as const;

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

export async function GET() {
  try {
    const session = await requireSession();
    // Defense in depth on top of the proxy.ts admin gate.
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Non trovato' }, { status: 404 });
    }

    await connectDB();

    const since7 = daysAgo(7);
    const since30 = daysAgo(30);

    const [
      userCounts,
      newsletterTotal,
      newsletterVerified,
      productTotal,
      productsBySectionAgg,
      topCategoriesAgg,
      topCitiesAgg,
      orderTotal,
      orderPaid,
      orderDelivered,
      newUsers7,
      newUsers30,
      newProducts7,
      newProducts30,
      newOrders7,
      newOrders30,
    ] = await Promise.all([
      UserModel.aggregate([
        { $match: { deletedAt: { $in: [null, undefined] } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sellers: { $sum: { $cond: ['$isSeller', 1, 0] } },
            admins: { $sum: { $cond: ['$isAdmin', 1, 0] } },
            verified: { $sum: { $cond: ['$verify.verified', 1, 0] } },
            withAds: { $sum: { $cond: ['$hasAd', 1, 0] } },
          },
        },
      ]),
      NewsletterModel.countDocuments({}),
      NewsletterModel.countDocuments({ verified: true }),
      ProductModel.countDocuments({}),
      ProductModel.aggregate([
        { $group: { _id: '$section', count: { $sum: 1 } } },
      ]),
      ProductModel.aggregate([
        { $match: { category: { $exists: true, $ne: null, $nin: ['', '_'] } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      ProductModel.aggregate([
        { $match: { city: { $exists: true, $ne: null, $nin: ['', '_'] } } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      OrderModel.countDocuments({}),
      OrderModel.countDocuments({ isPaid: true }),
      OrderModel.countDocuments({ isDelivered: true }),
      UserModel.countDocuments({ createdAt: { $gte: since7 } }),
      UserModel.countDocuments({ createdAt: { $gte: since30 } }),
      ProductModel.countDocuments({ createdAt: { $gte: since7 } }),
      ProductModel.countDocuments({ createdAt: { $gte: since30 } }),
      OrderModel.countDocuments({ createdAt: { $gte: since7 } }),
      OrderModel.countDocuments({ createdAt: { $gte: since30 } }),
    ]);

    const userBucket = userCounts[0] ?? {
      total: 0,
      sellers: 0,
      admins: 0,
      verified: 0,
      withAds: 0,
    };

    const bySection = SECTIONS.reduce<Record<string, number>>((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});
    for (const row of productsBySectionAgg) {
      if (row._id && bySection[row._id] !== undefined) {
        bySection[row._id] = row.count;
      }
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      users: {
        total: userBucket.total,
        sellers: userBucket.sellers,
        admins: userBucket.admins,
        verified: userBucket.verified,
        withAds: userBucket.withAds,
      },
      newsletter: {
        total: newsletterTotal,
        verified: newsletterVerified,
      },
      products: {
        total: productTotal,
        bySection,
        topCategories: topCategoriesAgg.map((r) => ({
          name: r._id,
          count: r.count,
        })),
        topCities: topCitiesAgg.map((r) => ({ name: r._id, count: r.count })),
      },
      orders: {
        total: orderTotal,
        paid: orderPaid,
        delivered: orderDelivered,
      },
      activity: {
        last7d: {
          newUsers: newUsers7,
          newProducts: newProducts7,
          newOrders: newOrders7,
        },
        last30d: {
          newUsers: newUsers30,
          newProducts: newProducts30,
          newOrders: newOrders30,
        },
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return error.response;
    console.error('Error computing admin stats:', error);
    return NextResponse.json(
      { message: 'Errore nel recupero metriche' },
      { status: 500 }
    );
  }
}
