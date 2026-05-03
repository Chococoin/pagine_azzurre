import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/mongoose';
import OrderModel from '@/lib/db/models/Order';
import UserModel from '@/lib/db/models/User';
import { authOptions } from '@/lib/auth/config';
import {
  sendOrderNotificationToOfferer,
  sendOrderNotificationToBuyer,
} from '@/lib/services/email';

// GET /api/orders - Get all orders (seller/admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }

    if (!session.user.isSeller && !session.user.isAdmin) {
      return NextResponse.json(
        { message: 'Solo venditori e admin possono vedere tutti gli ordini' },
        { status: 403 }
      );
    }

    await connectDB();

    // AUTHZ-VULN-03: the seller query param was honored for every caller,
    // letting seller A list seller B's orders. Now:
    //   - admin: may filter by any seller (query param honored).
    //   - seller (non-admin): filter is forced to their own user id, no matter
    //     what the caller sent, so it's impossible to see other sellers' orders.
    const searchParams = request.nextUrl.searchParams;
    let sellerFilter: { seller?: string } = {};
    if (session.user.isAdmin) {
      const seller = searchParams.get('seller');
      if (typeof seller === 'string' && seller.length > 0) {
        sellerFilter = { seller };
      }
    } else {
      sellerFilter = { seller: session.user.id };
    }

    const orders = await OrderModel.find(sellerFilter).populate('user', 'name');

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { message: 'Errore nel recupero ordini' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.orderItems || body.orderItems.length === 0) {
      return NextResponse.json(
        { message: 'Il carrello è vuoto' },
        { status: 400 }
      );
    }

    await connectDB();

    // Normalize cart items into the Order schema shape:
    //  - Order.image is `string[]`, cart passes a single `string`
    //  - Order stores `priceEuro`, cart stores `price`
    //  - Drop fields the schema doesn't know about (countInStock, etc.)
    type IncomingItem = {
      product: string;
      name: string;
      qty: number;
      priceVal: number;
      image?: string | string[];
      price?: number;
      priceEuro?: number;
      seller?: string;
    };
    const normalizedOrderItems = (body.orderItems as IncomingItem[]).map((item) => ({
      product: item.product,
      name: item.name,
      qty: item.qty,
      priceVal: item.priceVal,
      priceEuro: item.priceEuro ?? item.price,
      image: Array.isArray(item.image)
        ? item.image.filter(Boolean)
        : item.image
          ? [item.image]
          : [],
      seller: item.seller,
    }));

    const order = new OrderModel({
      seller: body.orderItems[0].seller,
      orderItems: normalizedOrderItems,
      shippingAddress: body.shippingAddress,
      paymentMethod: body.paymentMethod,
      itemsPriceVal: body.itemsPriceVal,
      itemsPriceEuro: body.itemsPriceEuro,
      totalPriceVal: body.totalPriceVal,
      totalPriceEuro: body.totalPriceEuro,
      shippingPrice: body.shippingPrice,
      user: session.user.id,
    });

    const createdOrder = await order.save();

    // Fire-and-forget order notifications. We don't block the response on
    // the mailer: if Mailtrap is down the order is still valid and the
    // buyer lands on /order/[id] normally. Errors are logged server-side.
    try {
      const [buyerUser, sellerUser] = await Promise.all([
        UserModel.findById(session.user.id).lean<{
          email?: string;
          username?: string;
          name?: string;
        }>(),
        UserModel.findById(createdOrder.seller).lean<{
          email?: string;
          username?: string;
          seller?: { name?: string };
        }>(),
      ]);

      const orderItemsSummary = (createdOrder.orderItems || [])
        .map((item: { name: string; qty: number }) => `${item.qty}× ${item.name}`)
        .join(', ');

      const shippingAddress = createdOrder.shippingAddress
        ? [
            createdOrder.shippingAddress.fullName,
            createdOrder.shippingAddress.address,
            [createdOrder.shippingAddress.postalCode, createdOrder.shippingAddress.city]
              .filter(Boolean)
              .join(' '),
            createdOrder.shippingAddress.country,
          ]
            .filter(Boolean)
            .join(', ')
        : '—';

      const notification = {
        offererEmail: sellerUser?.email || '',
        offererName:
          sellerUser?.seller?.name || sellerUser?.username || 'Venditore',
        buyerEmail: buyerUser?.email || '',
        buyerName: buyerUser?.name || buyerUser?.username || 'Acquirente',
        orderItems: orderItemsSummary,
        totalPrice: createdOrder.totalPriceVal ?? 0,
        shippingAddress,
      };

      if (notification.offererEmail) {
        await sendOrderNotificationToOfferer(notification).catch((err) =>
          console.error('[orders] offerer notification failed:', err)
        );
      }
      if (notification.buyerEmail) {
        await sendOrderNotificationToBuyer(notification).catch((err) =>
          console.error('[orders] buyer notification failed:', err)
        );
      }
    } catch (notifyError) {
      console.error('[orders] notification pipeline failed:', notifyError);
    }

    return NextResponse.json(
      { message: 'New Order Created', order: createdOrder },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { message: 'Errore nella creazione ordine' },
      { status: 500 }
    );
  }
}
