import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/mongoose';
import ProductModel from '@/lib/db/models/Product';
import UserModel from '@/lib/db/models/User';
import { authOptions } from '@/lib/auth/config';
import { extractCity } from '@/lib/utils/cities';

// GET /api/products - Search products with filters
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const pageSize = 12;
    const page = Number(searchParams.get('pageNumber')) || 1;
    const name = searchParams.get('name') || '';
    const category = searchParams.get('category') || '';
    const seller = searchParams.get('seller') || '';
    const section = searchParams.get('section') || '';
    const order = searchParams.get('order') || '';
    const min = Number(searchParams.get('min')) || 0;
    const max = Number(searchParams.get('max')) || 0;
    const rating = Number(searchParams.get('rating')) || 0;
    const cityParam = (searchParams.get('city') || '').toUpperCase();
    const refererParam = (searchParams.get('referer') || '').toUpperCase();

    // Effective city: explicit param wins; otherwise try extracting a known
    // Italian city name from the free-text `name` query (legacy behavior).
    const { city: extractedCity, cleanQuery } = extractCity(name);
    const effectiveCity = cityParam || extractedCity || '';

    // Text search: use MongoDB $text (index: product_fulltext on name+description).
    // Public listings hide draft products that still carry the auto-assigned
    // "Annunciø n° …" placeholder name. Seller dashboards (filter by seller)
    // must still show their own drafts so they can finish editing them.
    const trimmedQuery = cleanQuery.trim();
    const textFilter = trimmedQuery
      ? { $text: { $search: trimmedQuery } }
      : seller
        ? {}
        : { name: { $not: { $regex: 'Annunciø' } } };

    // Referer (group) filter: now stored directly on the product document
    // (backfilled from seller.referer[0]) so the filter is a plain field
    // match — no User lookup needed.
    const refererFilter = refererParam ? { referer: refererParam } : {};

    const sellerFilter = seller ? { seller } : {};
    const sectionFilter = section ? { section } : {};
    const categoryFilter = category ? { category: category.toUpperCase() } : {};
    const priceFilter = min && max ? { priceVal: { $gte: min, $lte: max } } : {};
    const ratingFilterQ = rating ? { rating: { $gte: rating } } : {};
    const cityFilter = effectiveCity ? { city: effectiveCity } : {};

    // Sort order — when doing a text search with no explicit order, sort
    // by textScore descending so more relevant hits come first.
    type SortOrder = { [key: string]: 1 | -1 | { $meta: 'textScore' } };
    let sortOrder: SortOrder;
    switch (order) {
      case 'lowest':
        sortOrder = { priceVal: 1 };
        break;
      case 'highest':
        sortOrder = { priceVal: -1 };
        break;
      case 'toprated':
        sortOrder = { rating: -1 };
        break;
      default:
        sortOrder = trimmedQuery
          ? { score: { $meta: 'textScore' } }
          : { _id: -1 };
    }

    // Build query — note: refererFilter may contain `seller: {$in:[]}`,
    // which correctly returns zero products when the group has no members.
    // Explicit `seller` param takes precedence (e.g., seller dashboards).
    const query = {
      ...refererFilter,
      ...sellerFilter,
      ...sectionFilter,
      ...textFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilterQ,
      ...cityFilter,
      pause: { $ne: true },
    };

    // Count total documents
    const count = await ProductModel.countDocuments(query);

    // Project textScore when doing text search so we can sort by relevance.
    const projection = trimmedQuery
      ? { score: { $meta: 'textScore' } }
      : undefined;

    // Find products
    const products = await ProductModel.find(query, projection)
      .populate('seller', 'seller.name seller.logo')
      .sort(sortOrder)
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    return NextResponse.json({
      products,
      page,
      pages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { message: 'Errore nel recupero prodotti' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create new product (seller/admin only)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }

    if (!session.user.isSeller && !session.user.isAdmin) {
      return NextResponse.json(
        { message: 'Solo i venditori possono creare prodotti' },
        { status: 403 }
      );
    }

    await connectDB();

    // Prefill city + referer from the seller's own profile so newly-created
    // ads are immediately discoverable via the search filters. The seller
    // can override both in the edit form.
    const sellerDoc = await UserModel.findById(session.user.id, {
      city: 1,
      referer: 1,
    }).lean<{ city?: string; referer?: string[] }>();

    const defaultReferer =
      Array.isArray(sellerDoc?.referer) && sellerDoc.referer.length
        ? sellerDoc.referer[0]
        : undefined;

    // Create product with default values
    const product = new ProductModel({
      name: 'Annunciø n° ' + Date.now(),
      seller: session.user.id,
      image: ['/images/offro_prodotto.jpg'],
      rating: 0,
      isService: false,
      numReviews: 0,
      city: sellerDoc?.city || '_',
      referer: defaultReferer,
    });

    const createdProduct = await product.save();

    // Flip hasAd the first time a seller publishes. Without this the
    // "per contattare un offerente devi prima mettere un prodotto in
    // vetrina" warning never goes away even after they create a product.
    // Idempotent: only writes when the flag is still false.
    await UserModel.updateOne(
      { _id: session.user.id, hasAd: { $ne: true } },
      { $set: { hasAd: true } }
    );

    return NextResponse.json({
      message: 'Product Created',
      product: createdProduct,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { message: 'Errore nella creazione prodotto' },
      { status: 500 }
    );
  }
}
