'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styled from 'styled-components';
import { Container, PageTitle, CardBase } from '@/lib/styles';
import LoadingBox from '@/components/ui/LoadingBox';
import MessageBox from '@/components/ui/MessageBox';
import { getSellers } from '@/lib/api/users';
import type { User } from '@/types';

// The seller gallery filters at the API level — only sellers with
// hasAd + seller.logo + seller.description make it into the response.
// PII fields (email, phone, ...) are stripped by projectPublicUser.
type GallerySeller = Pick<User, '_id' | 'username' | 'name' | 'seller'>;

const TuttiNoiContainer = styled(Container)`
  max-width: 64rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
`;

const Subtitle = styled.p`
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
  margin: 0.25rem 0 1.75rem;
`;

const RuleBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #eff6ff;
  color: #1e40af;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 500;
  margin: 0.25rem auto 2rem;
`;

const CenterRow = styled.div`
  text-align: center;
`;

const Gallery = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

const GalleryCard = styled(CardBase)`
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.12);
  }
`;

const GalleryLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const GalleryImageWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f3f4f6;
`;

const GalleryBody = styled.div`
  padding: 1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const GalleryName = styled.h3`
  font-size: 1.05rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const GalleryDescription = styled.p`
  font-size: 0.875rem;
  color: #4b5563;
  line-height: 1.55;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ContentCard = styled(CardBase)`
  border-radius: 1rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 3rem;
`;

const Section = styled.section`
  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 1rem;
  }

  p {
    color: #4b5563;
    line-height: 1.75;
  }

  ul {
    list-style-type: disc;
    list-style-position: inside;
    color: #4b5563;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
  }
`;

const ButtonContainer = styled.div`
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

const PrimaryLinkButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  background-color: #2563eb;
  color: white;
  font-weight: 600;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: background-color 0.2s;

  &:hover {
    background-color: #1d4ed8;
  }
`;

const SecondaryLinkButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: 2px solid #2563eb;
  color: #2563eb;
  font-weight: 600;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: background-color 0.2s;

  &:hover {
    background-color: #eff6ff;
  }
`;

export default function TuttiNoiClient() {
  const [sellers, setSellers] = useState<GallerySeller[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getSellers()
      .then((data) => {
        if (cancelled) return;
        setSellers((data ?? []) as GallerySeller[]);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Errore nel caricamento della galleria');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TuttiNoiContainer>
      <PageTitle style={{ textAlign: 'center' }}>
        Le Pagine Azzurre Siamo Noi
      </PageTitle>
      <Subtitle>La comunità di chi pubblica e si racconta.</Subtitle>
      <CenterRow>
        <RuleBadge>
          Per comparire qui: pubblica un annuncio + aggiungi foto e
          descrizione nel profilo.
        </RuleBadge>
      </CenterRow>

      {error && <MessageBox variant="danger">{error}</MessageBox>}

      {sellers === null && !error ? (
        <LoadingBox />
      ) : sellers && sellers.length === 0 ? (
        <MessageBox>
          Nessuno ha ancora completato la propria scheda. Sii il primo!
        </MessageBox>
      ) : (
        <Gallery>
          {(sellers ?? []).map((s) => {
            const logo = s.seller?.logo as string | undefined;
            const desc = s.seller?.description as string | undefined;
            const name = s.seller?.name || s.name || s.username;
            if (!logo || !desc) return null;
            return (
              <GalleryCard key={s._id}>
                <GalleryLink href={`/seller/${s._id}`}>
                  <GalleryImageWrap>
                    <Image
                      src={logo}
                      alt={name}
                      fill
                      sizes="(max-width: 540px) 100vw, (max-width: 900px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  </GalleryImageWrap>
                  <GalleryBody>
                    <GalleryName>{name}</GalleryName>
                    <GalleryDescription>{desc}</GalleryDescription>
                  </GalleryBody>
                </GalleryLink>
              </GalleryCard>
            );
          })}
        </Gallery>
      )}

      <ContentCard>
        <Section>
          <h2>Chi Siamo</h2>
          <p>
            Pagine Azzurre è una piattaforma di scambio dove barattiamo e
            scambiamo con meno Euro e più VAL. Siamo una comunità che
            favorisce ogni scambio di prodotti, servizi e competenze
            finalizzati alla emancipazione umana.
          </p>
        </Section>

        <Section>
          <h2>La Nostra Missione</h2>
          <p>
            Promuoviamo uno scambio solidale di beni per vantaggi comuni.
            Crediamo nella sovranità e nella consapevolezza economica,
            utilizzando convenzioni monetarie alternative come i VAL.
          </p>
        </Section>

        <Section>
          <h2>Il VAL</h2>
          <p>
            Il VAL è la nostra unità di scambio alternativa. Preferiamo
            l&apos;utilizzo di:
          </p>
          <ul>
            <li>VAL - Valorizzatore dell&apos;Azione Concordata</li>
            <li>Crediti</li>
            <li>G1</li>
            <li>RISO</li>
          </ul>
        </Section>

        <Section>
          <h2>Val.Az.Co</h2>
          <p>
            Pagine Azzurre è un&apos;attività promossa e gestita dal{' '}
            <strong>Banco dei Cittadini Volontari del Val.Az.Co</strong>{' '}
            (VALorizzatore dell&apos;AZione COncordata).
          </p>
        </Section>

        <ButtonContainer>
          <PrimaryLinkButton
            href="https://valazco.it"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visita valazco.it
          </PrimaryLinkButton>
          <SecondaryLinkButton href="/newsletter">
            Iscriviti alla Newsletter
          </SecondaryLinkButton>
        </ButtonContainer>
      </ContentCard>
    </TuttiNoiContainer>
  );
}
