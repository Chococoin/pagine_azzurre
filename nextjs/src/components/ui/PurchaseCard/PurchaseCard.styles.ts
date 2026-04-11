'use client';

import styled from 'styled-components';
import Link from 'next/link';
import { StickyCard, Select } from '@/lib/styles';

export const Card = styled(StickyCard)``;

export const SellerSection = styled.div`
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 1rem;
`;

export const SellerLabel = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
`;

export const SellerNameLink = styled(Link)`
  font-size: 1.125rem;
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;
  display: inline-block;
  margin-top: 0.125rem;

  &:hover {
    color: #1d4ed8;
  }
`;

export const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;

  &:first-of-type {
    padding-top: 1rem;
  }
`;

export const InfoLabel = styled.span`
  color: #6b7280;
  font-size: 0.9375rem;
`;

export const InfoValue = styled.div`
  text-align: right;
`;

export const PriceValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
`;

export const PriceSecondary = styled.span`
  display: block;
  font-size: 0.9375rem;
  color: #2563eb;
  font-weight: 600;
`;

export const ValGlyph = styled.span`
  display: inline-block;
  margin-right: 0.25rem;
`;

export const AvailabilityBadge = styled.span<{ $available: boolean }>`
  color: ${({ $available }) => ($available ? '#059669' : '#dc2626')};
  font-weight: 500;
`;

export const QtySelect = styled(Select)`
  width: auto;
  padding: 0.5rem 1rem;
`;
