'use client';

/**
 * PurchaseCard
 *
 * Sticky card on the product detail page that shows the seller, the
 * dual-currency price (Euro / VAL), the availability badge, a quantity
 * selector and the primary CTA. Built as a presentational component:
 * the parent owns the qty state and the click handler.
 *
 * The card is fully self-contained for Storybook — pass `seller`,
 * `priceEuro`, `priceVal`, `countInStock`, `qty`, `onQtyChange`,
 * `onContact`, plus optional flags `showPrices` and `warning`.
 */

import { ReactNode } from 'react';
import Rating from '../Rating';
import { PrimaryButton } from '@/lib/styles';
import {
  Card,
  SellerSection,
  SellerLabel,
  SellerNameLink,
  InfoRow,
  InfoLabel,
  InfoValue,
  PriceValue,
  PriceSecondary,
  ValGlyph,
  AvailabilityBadge,
  QtySelect,
} from './PurchaseCard.styles';

export interface PurchaseCardSeller {
  /** Mongo id used for the /seller/[id] link */
  id: string;
  /** Public seller name shown above the rating */
  name: string;
  /** 0-5 average rating */
  rating: number;
  /** Total reviews count */
  numReviews: number;
}

export interface PurchaseCardProps {
  seller: PurchaseCardSeller;
  /** Stock count. 0 disables the CTA and switches the badge to "Non disponibile". */
  countInStock: number;
  /** Currently selected quantity (controlled). */
  qty: number;
  /** Quantity change callback. */
  onQtyChange: (qty: number) => void;
  /** Click handler for the primary CTA. */
  onContact: () => void;
  /** EUR price. Required when showPrices is true. */
  priceEuro?: number;
  /** VAL price. Required when showPrices is true. */
  priceVal?: number;
  /** Hide the price/qty rows for sections like avviso/propongo/dono. */
  showPrices?: boolean;
  /** Optional CTA label override (default: "Contatta Offerente"). */
  ctaLabel?: string;
  /** Optional slot rendered under the CTA — typically a MessageBox warning. */
  warning?: ReactNode;
}

export function PurchaseCard({
  seller,
  countInStock,
  qty,
  onQtyChange,
  onContact,
  priceEuro,
  priceVal,
  showPrices = true,
  ctaLabel = 'Contatta Offerente',
  warning,
}: PurchaseCardProps) {
  const isAvailable = countInStock > 0;

  return (
    <Card>
      {/* Seller */}
      <SellerSection>
        <SellerLabel>Offerente</SellerLabel>
        <SellerNameLink href={`/seller/${seller.id}`}>{seller.name}</SellerNameLink>
        <Rating rating={seller.rating} numReviews={seller.numReviews} />
      </SellerSection>

      {/* Price */}
      {showPrices && (
        <InfoRow>
          <InfoLabel>Prezzo</InfoLabel>
          <InfoValue>
            <PriceValue>€ {(priceEuro ?? 0).toFixed(2)}</PriceValue>
            <PriceSecondary>
              <ValGlyph>☯</ValGlyph>
              {priceVal ?? 0}
            </PriceSecondary>
          </InfoValue>
        </InfoRow>
      )}

      {/* Availability */}
      <InfoRow>
        <InfoLabel>Disponibilità</InfoLabel>
        <AvailabilityBadge $available={isAvailable}>
          {isAvailable ? 'Disponibile' : 'Non disponibile'}
        </AvailabilityBadge>
      </InfoRow>

      {/* Quantity + CTA — only when in stock */}
      {isAvailable && (
        <>
          <InfoRow>
            <InfoLabel>Quantità</InfoLabel>
            <QtySelect
              value={qty}
              onChange={(e) => onQtyChange(Number(e.target.value))}
              aria-label="Quantità"
            >
              {Array.from({ length: countInStock }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </QtySelect>
          </InfoRow>

          <PrimaryButton type="button" onClick={onContact} style={{ marginTop: '1rem' }}>
            {ctaLabel}
          </PrimaryButton>

          {warning && <div style={{ marginTop: '0.75rem' }}>{warning}</div>}
        </>
      )}
    </Card>
  );
}

export default PurchaseCard;
