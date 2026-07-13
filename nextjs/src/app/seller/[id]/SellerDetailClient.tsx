'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getUserProfile } from '@/lib/api/users';
import { getProducts } from '@/lib/api/products';
import LoadingBox from '@/components/ui/LoadingBox';
import MessageBox from '@/components/ui/MessageBox';
import Product from '@/components/ui/Product';
import Rating from '@/components/ui/Rating';
import Pagination from '@/components/ui/Pagination';
import {
  Container,
  SectionTitle,
  CardBase,
  GridContainer,
  LoadingContainer,
  ErrorContainer,
  EmptyContainer
} from '@/lib/styles';
import type { User, Product as ProductType } from '@/types';

// Styled Components
const SellerCard = styled(CardBase)`
  padding: 2rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  margin-bottom: 2rem;
`;

const SellerInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: flex-start;
  }
`;

const SellerLogo = styled.img`
  width: 8rem;
  height: 8rem;
  border-radius: 0.75rem;
  object-fit: cover;
`;

const SellerDetails = styled.div`
  flex: 1;
`;

const SellerName = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
`;

const SellerDescription = styled.p`
  color: #6b7280;
  margin-top: 1rem;
`;

const ProductsGrid = styled(GridContainer)`
  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

interface SellerDetailClientProps {
  sellerId: string;
}

export default function SellerDetailClient({ sellerId }: SellerDetailClientProps) {
  const [seller, setSeller] = useState<User | null>(null);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSellerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, page]);

  const fetchSellerData = async () => {
    try {
      setLoading(true);
      // Filter by seller server-side and hide the seller's unfinished
      // "Annunciø" drafts; paginate through the rest.
      const [sellerData, productsData] = await Promise.all([
        getUserProfile(sellerId),
        getProducts({ seller: sellerId, hideDrafts: true, pageNumber: page }),
      ]);
      setSeller(sellerData);
      setProducts(productsData.products);
      setPages(productsData.pages);
    } catch {
      setError('Errore nel caricamento del venditore');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingContainer><LoadingBox /></LoadingContainer>;
  if (error) return <ErrorContainer><MessageBox variant="danger">{error}</MessageBox></ErrorContainer>;
  if (!seller) return <ErrorContainer><MessageBox variant="danger">Venditore non trovato</MessageBox></ErrorContainer>;

  return (
    <Container style={{ padding: '2rem 1rem' }}>
      {/* Seller Info */}
      <SellerCard>
        <SellerInfo>
          {seller.seller?.logo && (
            <SellerLogo
              src={seller.seller.logo}
              alt={seller.seller.name}
            />
          )}
          <SellerDetails>
            <SellerName>
              {seller.seller?.name || seller.username}
            </SellerName>
            {seller.seller && (
              <div style={{ marginBottom: '1rem' }}>
                <Rating rating={seller.seller.rating} numReviews={seller.seller.numReviews} />
              </div>
            )}
            {seller.seller?.description && (
              <SellerDescription>{seller.seller.description}</SellerDescription>
            )}
          </SellerDetails>
        </SellerInfo>
      </SellerCard>

      {/* Seller Products */}
      <SectionTitle>Prodotti del Venditore</SectionTitle>

      {products.length === 0 ? (
        <EmptyContainer>
          <MessageBox variant="info">Questo venditore non ha ancora prodotti</MessageBox>
        </EmptyContainer>
      ) : (
        <>
          <ProductsGrid>
            {products.map((product) => (
              <Product key={product._id} product={product} />
            ))}
          </ProductsGrid>
          {pages > 1 && (
            <Pagination currentPage={page} totalPages={pages} onPageChange={setPage} />
          )}
        </>
      )}
    </Container>
  );
}
