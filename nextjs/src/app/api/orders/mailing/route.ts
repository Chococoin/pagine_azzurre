import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/mongoose';
import OrderModel from '@/lib/db/models/Order';
import UserModel from '@/lib/db/models/User';
import { authOptions } from '@/lib/auth/config';
import { sendOrderMailingToOfferer } from '@/lib/services/email';
import {
  enforceRateLimits,
  getClientIp,
} from '@/lib/security/rateLimit';

// POST /api/orders/mailing - Send a follow-up email to the seller of an
// order (e.g. "hi, any update on shipping?"). Only the buyer or the seller
// of that order may invoke it. All identifiers are fetched from the DB;
// none of the caller's order/seller fields are trusted.
//
// Closed: audit finding "New #1" (phishing vector, see docs/authz-audit.md).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }

    const body = await request.json();
    const orderId: unknown = body?.order?._id ?? body?.orderId;
    const rawEmailBody: unknown = body?.emailBody;

    if (typeof orderId !== 'string' || !mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { message: 'ID ordine non valido' },
        { status: 400 }
      );
    }
    if (typeof rawEmailBody !== 'string') {
      return NextResponse.json(
        { message: 'Corpo del messaggio non valido' },
        { status: 400 }
      );
    }

    // Cap the body length and strip HTML tags to neutralize the mailer as a
    // phishing surface.
    const emailBody = rawEmailBody
      .slice(0, 2000)
      .replace(/<[^>]*>/g, '')
      .trim();

    // Rate limit: per IP (20/hour) and per authenticated sender (10/hour).
    // Blocks both spamming from one machine and abuse via stolen sessions.
    const rateLimited = await enforceRateLimits([
      {
        config: { bucket: 'orders-mailing-ip', limit: 20, windowMs: 60 * 60 * 1000 },
        identifier: getClientIp(request),
      },
      {
        config: { bucket: 'orders-mailing-sender', limit: 10, windowMs: 60 * 60 * 1000 },
        identifier: session.user.id,
      },
    ]);
    if (rateLimited) return rateLimited;

    await connectDB();

    // Authoritative order load — do NOT trust body.order.*.
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { message: 'Ordine non trovato' },
        { status: 404 }
      );
    }

    // Ownership: caller must be the buyer, the seller, or admin.
    const callerId = session.user.id;
    const isBuyer = order.user?.toString() === callerId;
    const isSeller = order.seller?.toString() === callerId;
    if (!isBuyer && !isSeller && !session.user.isAdmin) {
      return NextResponse.json(
        { message: 'Ordine non trovato' },
        { status: 404 }
      );
    }

    // Resolve the counterparties from the DB, not from the request body.
    const seller = await UserModel.findById(order.seller).select('email name username');
    if (!seller?.email) {
      return NextResponse.json(
        { message: 'Venditore non disponibile' },
        { status: 404 }
      );
    }
    const buyer = await UserModel.findById(order.user).select('name username');

    const orderNames = (order.orderItems || [])
      .map((item: { name: string }) => item.name)
      .join(', ');

    try {
      await sendOrderMailingToOfferer(
        seller.email,
        seller.name || seller.username || 'Venditore',
        buyer?.name || buyer?.username || 'Acquirente',
        orderNames,
        emailBody
      );
    } catch (emailError) {
      console.error('Error sending mailing email:', emailError);
      return NextResponse.json(
        { message: "Errore nell'invio email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { mailStatus: 'Mail Sent.', resp_code: 1 },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error in order mailing:', error);
    return NextResponse.json(
      { message: "Errore nell'invio comunicazione" },
      { status: 500 }
    );
  }
}
