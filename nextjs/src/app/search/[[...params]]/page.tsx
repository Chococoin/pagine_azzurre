import type { Metadata } from 'next';
import SearchClient from './SearchClient';
import { SITE_NAME, canonicalUrl } from '@/lib/seo/config';

interface PageProps {
  params: Promise<{ params?: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { params: segments = [] } = await params;
  const isFiltered = segments.length > 0;

  // Try to extract a search term from /search/name/{term}
  let searchTerm: string | undefined;
  const nameIndex = segments.indexOf('name');
  if (nameIndex >= 0 && segments[nameIndex + 1]) {
    try {
      searchTerm = decodeURIComponent(segments[nameIndex + 1]);
    } catch {
      searchTerm = segments[nameIndex + 1];
    }
  }

  const title = searchTerm
    ? `Ricerca: "${searchTerm}" — ${SITE_NAME}`
    : `Ricerca prodotti e servizi — ${SITE_NAME}`;

  const description = searchTerm
    ? `Risultati di ricerca per "${searchTerm}" su Pagine Azzurre — prodotti, servizi e competenze dalla comunità italiana.`
    : 'Cerca prodotti, servizi e competenze su Pagine Azzurre, il marketplace solidale della comunità italiana.';

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl('/search'),
    },
    // Noindex filtered/parameterized search results to avoid thin-content
    // duplicates; the canonical unfiltered /search is enough for discovery.
    robots: isFiltered
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

export default function SearchPage() {
  return <SearchClient />;
}
