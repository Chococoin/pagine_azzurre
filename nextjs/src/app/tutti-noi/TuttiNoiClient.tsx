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

// Type system stays on the site's Inter stack (inherited from globals.css)
// — only the *proportions* change here: tighter tracking on the masthead,
// fluid clamp() scaling, italic for the subtitle/numerals, and a clean
// vertical rhythm anchored to a major-third type scale.

const TuttiNoiContainer = styled(Container)`
  max-width: 64rem;
  padding: 1.05rem 1.25rem 2.8rem;
  font-feature-settings: 'liga', 'kern';

  @media (max-width: 540px) {
    padding: 0.7rem 1rem 2.1rem;
  }
`;

const Masthead = styled.header`
  text-align: center;
  margin-bottom: 2.1rem;

  @media (max-width: 540px) {
    margin-bottom: 1.6rem;
  }
`;

// Magazine-section kicker: tracked uppercase with thin rules on either
// side, in brand blue. Acts as the eyebrow above the masthead title.
const Kicker = styled.div`
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #2563eb;
  margin-bottom: 0.7rem;

  &::before,
  &::after {
    content: '';
    display: inline-block;
    width: 1.5rem;
    height: 1px;
    background: currentColor;
    vertical-align: middle;
    margin: 0 0.7rem;
    opacity: 0.7;
  }
`;

// Override the imported PageTitle: fluid scaling, tighter letter-spacing,
// deep ink. The clamp ratio aligns title + kicker + subtitle into a
// clean four-tier lockup.
const Title = styled(PageTitle)`
  font-weight: 700;
  font-size: clamp(2rem, 4.6vw, 3rem);
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #0f172a;
  margin: 0 0 0.5rem;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.55;
  color: #475569;
  margin: 0 auto 1.05rem;
  max-width: 32rem;

  @media (max-width: 540px) {
    font-size: 0.95rem;
  }
`;

// Outlined eligibility badge — small-caps with tracked letterspacing,
// the brand blue used as ink, never as fill.
const RuleBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid #c7d2fe;
  background: #ffffff;
  color: #1e3a8a;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;

  & em {
    color: #2563eb;
    font-style: normal;
    font-weight: 700;
  }
`;

const CenterRow = styled.div`
  text-align: center;
`;

const Gallery = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.75rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
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
  border: 1px solid #e5e7eb;
  background: #ffffff;
  transition: transform 220ms ease, box-shadow 220ms ease,
    border-color 220ms ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 32px -16px rgba(15, 23, 42, 0.18);
    border-color: #c7d2fe;
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
  background: #f1f5f9;
`;

const GalleryBody = styled.div`
  padding: 1.15rem 1.35rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const GalleryName = styled.h3`
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: #0f172a;
  margin: 0;
`;

const GalleryDescription = styled.p`
  font-size: 0.9rem;
  line-height: 1.6;
  color: #475569;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ContentCard = styled(CardBase)`
  border-radius: 1rem;
  padding: 1.4rem 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 1.05rem;
  margin-top: 2.1rem;
  border: 1px solid #e5e7eb;

  @media (max-width: 640px) {
    padding: 1.05rem 0.9rem;
    margin-top: 1.6rem;
    gap: 0.85rem;
  }
`;

// Roman numerals in the gutter mark each section as soft anchors. The
// grid collapses to a single column under 640px so the numeral sits
// inline without crowding the heading.
const SectionWrap = styled.section`
  display: grid;
  grid-template-columns: 4rem 1fr;
  align-items: baseline;
  gap: 0.75rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }
`;

const SectionNumber = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: #2563eb;
  letter-spacing: 0.08em;

  @media (max-width: 640px) {
    font-size: 0.78rem;
  }
`;

const SectionContent = styled.div`
  h2 {
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.012em;
    color: #0f172a;
    margin: 0 0 0.75rem;
  }

  p {
    font-size: 1rem;
    line-height: 1.75;
    color: #334155;
    margin: 0;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;

    li {
      position: relative;
      padding-left: 1.25rem;
      color: #334155;
      line-height: 1.6;

      &::before {
        content: '·';
        color: #2563eb;
        position: absolute;
        left: 0.1rem;
        top: -0.05em;
        font-weight: 700;
        font-size: 1.5em;
        line-height: 0.85;
      }
    }
  }
`;

const ButtonContainer = styled.div`
  padding-top: 1.75rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

const PrimaryLinkButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.8rem 1.5rem;
  background-color: #2563eb;
  color: white;
  font-weight: 600;
  font-size: 0.92rem;
  letter-spacing: 0.02em;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: background-color 0.18s;

  &:hover {
    background-color: #1d4ed8;
  }
`;

const SecondaryLinkButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.8rem 1.5rem;
  border: 1.5px solid #2563eb;
  color: #2563eb;
  font-weight: 600;
  font-size: 0.92rem;
  letter-spacing: 0.02em;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: background-color 0.18s;

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
      <Masthead>
        <Kicker>La Comunità</Kicker>
        <Title>Le Pagine Azzurre Siamo Noi</Title>
        <Subtitle>
          La comunità di chi pubblica, condivide e si racconta.
        </Subtitle>
        <CenterRow>
          <RuleBadge>
            Pubblica un annuncio <em>·</em> aggiungi foto e descrizione
          </RuleBadge>
        </CenterRow>
      </Masthead>

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
        <SectionWrap>
          <SectionNumber>I.</SectionNumber>
          <SectionContent>
            <h2>Chi Siamo</h2>
            <p>
              Pagine Azzurre è una piattaforma di scambio dove barattiamo e
              scambiamo con meno Euro e più VAL. Siamo una comunità che
              favorisce ogni scambio di prodotti, servizi e competenze
              finalizzati alla emancipazione umana.
            </p>
          </SectionContent>
        </SectionWrap>

        <SectionWrap>
          <SectionNumber>II.</SectionNumber>
          <SectionContent>
            <h2>La Nostra Missione</h2>
            <p>
              Promuoviamo uno scambio solidale di beni per vantaggi comuni.
              Crediamo nella sovranità e nella consapevolezza economica,
              utilizzando convenzioni monetarie alternative come i VAL.
            </p>
          </SectionContent>
        </SectionWrap>

        <SectionWrap>
          <SectionNumber>III.</SectionNumber>
          <SectionContent>
            <h2>Il VAL</h2>
            <p>
              Il VAL è la nostra unità di scambio alternativa. Preferiamo
              l&apos;utilizzo di:
            </p>
            <ul>
              <li>VAL — Valorizzatore dell&apos;Azione Concordata</li>
              <li>Crediti</li>
              <li>G1</li>
              <li>RISO</li>
            </ul>
          </SectionContent>
        </SectionWrap>

        <SectionWrap>
          <SectionNumber>IV.</SectionNumber>
          <SectionContent>
            <h2>Val.Az.Co</h2>
            <p>
              Pagine Azzurre è un&apos;attività promossa e gestita dal{' '}
              <strong>Banco dei Cittadini Volontari del Val.Az.Co</strong>{' '}
              (VALorizzatore dell&apos;AZione COncordata).
            </p>
          </SectionContent>
        </SectionWrap>

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
