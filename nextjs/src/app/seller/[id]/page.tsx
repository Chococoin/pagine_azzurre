import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSellerForSeo } from '@/lib/seo/queries';
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  canonicalUrl,
  truncate,
} from '@/lib/seo/config';
import SellerDetailClient from './SellerDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const seller = await getSellerForSeo(id);

  if (!seller) {
    return {
      title: 'Venditore non trovato',
      description: 'Il venditore richiesto non è disponibile su Pagine Azzurre.',
      robots: { index: false, follow: false },
    };
  }

  const title = `${seller.sellerName} — Venditore su ${SITE_NAME}`;
  const description = truncate(
    seller.description ||
      `Scopri gli annunci di ${seller.sellerName} su Pagine Azzurre${
        seller.city ? `, ${seller.city}` : ''
      }. Prodotti, servizi e competenze con baratto, VAL ed Euro.`
  );

  const canonical = canonicalUrl(`/seller/${seller._id}`);
  const imageUrl = seller.logo || DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      url: canonical,
      title,
      description,
      siteName: SITE_NAME,
      locale: 'it_IT',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: seller.sellerName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SellerPage({ params }: PageProps) {
  const { id } = await params;
  const seller = await getSellerForSeo(id);

  if (!seller) {
    notFound();
  }

  // JSON-LD Store + BreadcrumbList
  const storeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': canonicalUrl(`/seller/${seller._id}`),
    name: seller.sellerName,
    description: seller.description || `Venditore su ${SITE_NAME}`,
    url: canonicalUrl(`/seller/${seller._id}`),
    image: seller.logo || DEFAULT_OG_IMAGE,
    address: seller.city
      ? {
          '@type': 'PostalAddress',
          addressLocality: seller.city,
          addressCountry: seller.country || 'IT',
        }
      : undefined,
    aggregateRating:
      seller.numReviews > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: seller.rating.toFixed(1),
            reviewCount: seller.numReviews,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Top Sellers',
        item: `${SITE_URL}/top-sellers`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: seller.sellerName,
        item: canonicalUrl(`/seller/${seller._id}`),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SellerDetailClient sellerId={id} />
    </>
  );
}
