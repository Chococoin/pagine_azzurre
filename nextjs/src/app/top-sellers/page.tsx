import type { Metadata } from 'next';
import TopSellersClient from './TopSellersClient';
import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  canonicalUrl,
} from '@/lib/seo/config';

const TITLE = 'Top Sellers — I migliori venditori della comunità';
const DESCRIPTION =
  'Scopri i venditori più attivi e apprezzati di Pagine Azzurre: professionisti, artigiani e volontari della comunità italiana che offrono prodotti, servizi e competenze con VAL ed Euro.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: canonicalUrl('/top-sellers'),
  },
  openGraph: {
    type: 'website',
    url: canonicalUrl('/top-sellers'),
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    locale: 'it_IT',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Top Sellers Pagine Azzurre',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function TopSellersPage() {
  return <TopSellersClient />;
}
