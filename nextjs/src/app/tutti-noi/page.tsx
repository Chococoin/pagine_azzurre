import type { Metadata } from 'next';
import TuttiNoiClient from './TuttiNoiClient';
import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  canonicalUrl,
} from '@/lib/seo/config';

const TITLE = 'Tutti Noi — La comunità di Pagine Azzurre';
const DESCRIPTION =
  'Pagine Azzurre è una comunità di cittadini volontari che promuove il baratto e lo scambio solidale. Scopri chi siamo e come partecipare al Banco dei Cittadini Volontari del Val.Az.Co.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: canonicalUrl('/tutti-noi'),
  },
  openGraph: {
    type: 'article',
    url: canonicalUrl('/tutti-noi'),
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    locale: 'it_IT',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'La comunità di Pagine Azzurre',
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

export default function TuttiNoiPage() {
  return <TuttiNoiClient />;
}
