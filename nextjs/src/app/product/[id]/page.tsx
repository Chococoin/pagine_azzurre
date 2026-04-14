import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductForSeo } from '@/lib/seo/queries';
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  canonicalUrl,
  truncate,
} from '@/lib/seo/config';
import ProductDetailClient from './ProductDetailClient';
import { safeJsonLd } from '@/lib/security/jsonLd';

interface PageProps {
  params: Promise<{ id: string }>;
}

const SECTION_LABELS: Record<string, string> = {
  offro: 'Offerta',
  cerco: 'Richiesta',
  propongo: 'Proposta',
  avviso: 'Avviso',
  dono: 'Dono',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductForSeo(id);

  if (!product) {
    return {
      title: 'Prodotto non trovato',
      description: 'Il prodotto richiesto non è disponibile su Pagine Azzurre.',
      robots: { index: false, follow: false },
    };
  }

  const sectionLabel = SECTION_LABELS[product.section] || 'Annuncio';
  const sellerName = product.seller?.name || 'Venditore';
  const price = product.priceEuro
    ? `€${product.priceEuro.toFixed(2)}`
    : `${product.priceVal} VAL`;

  const title = `${product.name} — ${sectionLabel} di ${sellerName}`;
  const description = truncate(
    product.description ||
      `${sectionLabel} su Pagine Azzurre: ${product.name} a ${price}${
        product.city ? `, ${product.city}` : ''
      }. Proposta da ${sellerName}.`
  );

  const imageUrl = product.image?.[0] || DEFAULT_OG_IMAGE;
  const canonical = canonicalUrl(`/product/${product._id}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
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
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    other: {
      'product:price:amount': product.priceEuro ? product.priceEuro.toFixed(2) : '',
      'product:price:currency': product.priceEuro ? 'EUR' : '',
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProductForSeo(id);

  if (!product) {
    notFound();
  }

  // JSON-LD Product + BreadcrumbList
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': canonicalUrl(`/product/${product._id}`),
    name: product.name,
    description: product.description || `${product.name} su ${SITE_NAME}`,
    image: product.image?.length ? product.image : [DEFAULT_OG_IMAGE],
    sku: product._id,
    category: product.category,
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand }
      : undefined,
    aggregateRating:
      product.numReviews > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.rating.toFixed(1),
            reviewCount: product.numReviews,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    offers: product.priceEuro
      ? {
          '@type': 'Offer',
          url: canonicalUrl(`/product/${product._id}`),
          priceCurrency: 'EUR',
          price: product.priceEuro.toFixed(2),
          availability:
            product.countInStock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          seller: product.seller
            ? {
                '@type': 'Organization',
                name: product.seller.name,
                url: canonicalUrl(`/seller/${product.seller._id}`),
              }
            : undefined,
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
        name: SECTION_LABELS[product.section] || 'Annuncio',
        item: `${SITE_URL}/?section=${product.section}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: canonicalUrl(`/product/${product._id}`),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <ProductDetailClient productId={id} />
    </>
  );
}
