/**
 * Server-side queries used for metadata generation and JSON-LD.
 * These run at request time (or at build when ISR is used) and must
 * be tolerant of unreachable DB / missing documents.
 */

import 'server-only';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import ProductModel from '@/lib/db/models/Product';
import UserModel from '@/lib/db/models/User';

export interface SeoProduct {
  _id: string;
  name: string;
  description?: string;
  image: string[];
  priceEuro?: number;
  priceVal: number;
  rating: number;
  numReviews: number;
  countInStock: number;
  section: string;
  category?: string;
  brand?: string;
  city?: string;
  country?: string;
  createdAt?: string;
  updatedAt?: string;
  seller?: {
    _id: string;
    name: string;
  };
}

export interface SeoSeller {
  _id: string;
  username: string;
  sellerName: string;
  description?: string;
  logo?: string;
  rating: number;
  numReviews: number;
  city?: string;
  country?: string;
}

/** Look up a single product for metadata. Returns null on any failure. */
export async function getProductForSeo(id: string): Promise<SeoProduct | null> {
  if (!mongoose.isValidObjectId(id)) return null;

  try {
    await connectDB();
    const product = await ProductModel.findById(id)
      .populate('seller', 'seller.name username')
      .lean<{
        _id: mongoose.Types.ObjectId;
        name: string;
        description?: string;
        image: string[];
        priceEuro?: number;
        priceVal: number;
        rating: number;
        numReviews: number;
        countInStock: number;
        section: string;
        category?: string;
        brand?: string;
        city?: string;
        country?: string;
        createdAt?: Date;
        updatedAt?: Date;
        seller?: {
          _id: mongoose.Types.ObjectId;
          seller?: { name?: string };
          username?: string;
        };
      }>();

    if (!product) return null;

    return {
      _id: product._id.toString(),
      name: product.name,
      description: product.description,
      image: Array.isArray(product.image) ? product.image : [],
      priceEuro: product.priceEuro,
      priceVal: product.priceVal,
      rating: product.rating ?? 0,
      numReviews: product.numReviews ?? 0,
      countInStock: product.countInStock ?? 0,
      section: product.section,
      category: product.category,
      brand: product.brand,
      city: product.city,
      country: product.country,
      createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : undefined,
      updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined,
      seller: product.seller
        ? {
            _id: product.seller._id.toString(),
            name: product.seller.seller?.name || product.seller.username || 'Venditore',
          }
        : undefined,
    };
  } catch (error) {
    console.error('[seo] getProductForSeo failed:', error);
    return null;
  }
}

/** Look up a seller for metadata. Returns null on any failure. */
export async function getSellerForSeo(id: string): Promise<SeoSeller | null> {
  if (!mongoose.isValidObjectId(id)) return null;

  try {
    await connectDB();
    const user = await UserModel.findById(id)
      .lean<{
        _id: mongoose.Types.ObjectId;
        username: string;
        city?: string;
        country?: string;
        seller?: {
          name: string;
          description?: string;
          logo?: string;
          rating: number;
          numReviews: number;
        };
      }>();

    if (!user || !user.seller) return null;

    return {
      _id: user._id.toString(),
      username: user.username,
      sellerName: user.seller.name || user.username,
      description: user.seller.description,
      logo: user.seller.logo,
      rating: user.seller.rating ?? 0,
      numReviews: user.seller.numReviews ?? 0,
      city: user.city,
      country: user.country,
    };
  } catch (error) {
    console.error('[seo] getSellerForSeo failed:', error);
    return null;
  }
}
