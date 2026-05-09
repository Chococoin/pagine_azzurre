import type { MetadataRoute } from 'next';
import connectDB from '@/lib/db/mongoose';
import ProductModel from '@/lib/db/models/Product';
import UserModel from '@/lib/db/models/User';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pagineazzurre.net';

// Regenerate the sitemap at most every hour
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static public routes — always included
  const staticRoutes: Entry[] = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/top-sellers`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/tutti-noi`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/newsletter`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  let productRoutes: Entry[] = [];
  let sellerRoutes: Entry[] = [];

  try {
    await connectDB();

    // Active products only — not paused, not expired
    const products = await ProductModel.find(
      {
        pause: { $ne: true },
        $or: [{ expiry: { $gt: now } }, { expiry: { $exists: false } }],
      },
      { _id: 1, updatedAt: 1 }
    )
      .sort({ updatedAt: -1 })
      .limit(5000)
      .lean();

    productRoutes = products.map((p) => ({
      url: `${SITE_URL}/product/${p._id.toString()}`,
      lastModified: p.updatedAt instanceof Date ? p.updatedAt : now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    // Verified sellers only
    const sellers = await UserModel.find(
      {
        isSeller: true,
        'verify.verified': true,
      },
      { _id: 1, updatedAt: 1 }
    )
      .limit(5000)
      .lean();

    sellerRoutes = sellers.map((u) => ({
      url: `${SITE_URL}/seller/${u._id.toString()}`,
      lastModified: u.updatedAt instanceof Date ? u.updatedAt : now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch (error) {
    // If the DB is unreachable at build/request time, still return a valid
    // sitemap with static routes rather than failing the response
    console.error('[sitemap] Failed to fetch dynamic routes:', error);
  }

  return [...staticRoutes, ...productRoutes, ...sellerRoutes];
}
