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
  font-size: clamp(1rem, 1.8vw, 1.2rem);
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: #0f172a;
  margin: 0 auto 0.85rem;
  max-width: 36rem;
`;

const Subtitle = styled.p`
  font-size: 0.7rem;
  font-weight: 400;
  line-height: 1.45;
  color: #64748b;
  margin: 0 auto 1.05rem;
  max-width: 24rem;

  @media (max-width: 540px) {
    font-size: 0.66rem;
  }
`;

// Eligibility prompt shown at the FOOT of the gallery (after the seller
// images): tells visitors exactly what to fill in their profile to appear
// here. Outlined brand-blue card, centered, multi-line.
const JoinPrompt = styled.div`
  margin: 0 auto 2.4rem;
  max-width: 34rem;
  text-align: center;
  border: 1px solid #c7d2fe;
  border-radius: 1rem;
  background: #f8faff;
  padding: 1.6rem 1.75rem;

  @media (max-width: 540px) {
    padding: 1.25rem 1rem;
    margin-bottom: 1.8rem;
  }
`;

const JoinPromptIntro = styled.p`
  margin: 0 0 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.5;
  color: #1e3a8a;
`;

const JoinPromptList = styled.ul`
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  li {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #2563eb;
  }
`;

const JoinPromptOutro = styled.p`
  margin: 0;
  font-size: 0.95rem;
  font-style: italic;
  color: #475569;
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

const Prose = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.05rem;

  p {
    font-size: 1rem;
    line-height: 1.75;
    color: #334155;
    margin: 0;
  }

  strong {
    color: #0f172a;
    font-weight: 700;
    letter-spacing: -0.005em;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    gap: 0.35rem 0.85rem;

    li {
      color: #334155;
      line-height: 1.6;
      display: inline-flex;
      align-items: baseline;
    }

    li + li::before {
      content: '·';
      color: #2563eb;
      font-weight: 700;
      font-size: 1.25em;
      line-height: 0.85;
      margin-right: 0.85rem;
    }
  }
`;

const Footnote = styled.p`
  && {
    font-size: 0.82rem;
    line-height: 1.5;
    color: #64748b;
    font-style: italic;
    text-align: center;
    margin-top: 0.35rem;
  }
`;

const ButtonContainer = styled.div`
  padding-top: 1.75rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
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

  // Easter egg: the masthead title stays collapsed/invisible until the "P"
  // of "Pagine" in the global header is hovered for 5s. The header broadcasts
  // a window event; we just mirror it into state. Leaving the "P" hides it.
  const [titleRevealed, setTitleRevealed] = useState(false);

  useEffect(() => {
    const onReveal = (e: Event) => {
      setTitleRevealed((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener('tuttinoi:reveal-title', onReveal);
    return () => window.removeEventListener('tuttinoi:reveal-title', onReveal);
  }, []);

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
      <Masthead
        style={{
          marginBottom: titleRevealed ? '2.1rem' : '0',
          transition: 'margin-bottom 0.7s ease',
        }}
      >
        <Title
          style={{
            opacity: titleRevealed ? 1 : 0,
            maxHeight: titleRevealed ? '20rem' : '0',
            marginBottom: titleRevealed ? '0.85rem' : '0',
            overflow: 'hidden',
            transition: 'opacity 0.7s ease, max-height 0.7s ease, margin-bottom 0.7s ease',
          }}
        >
          Tutti Noi che per l&apos;emancipazione scambiamo prodotti servizi e competenze. Dove c&apos;è scambio c&apos;è vita!
        </Title>
      </Masthead>

      <JoinPrompt>
        <JoinPromptIntro>
          Per essere presente qui in ‘Tutti Noi’ compila nel tuo profilo dei dati personali:
        </JoinPromptIntro>
        <JoinPromptList>
          <li>Logo/immagine che ti rappresenta</li>
          <li>Descrizione della tua attività</li>
        </JoinPromptList>
        <JoinPromptOutro>Questo sarà il tuo mini sito</JoinPromptOutro>
      </JoinPrompt>

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
        <Prose>
          <p>
            <strong>Tutti Noi.</strong> Una comunità che crede nella
            sovranità e nella consapevolezza economica etica solidale.
            Favorisce ogni scambio di prodotti, servizi e competenze per una
            nuova umanità.
          </p>
          <p>
            <strong>La Nostra Missione:</strong> promuovere lo scambio
            solidale di beni e servizi, utilizzando convenzioni di scambio
            monetarie complementari e alternative come il VAL, finalizzate
            ad una emancipazione non monetaria.
          </p>
          <p>
            <strong>Chi Siamo*:</strong> in ordine alfabetico le nostre
            personali presentazioni con esposto il gruppo principale col
            quale collaboriamo, ciò che sappiamo fare e cosa mettiamo a
            disposizione al gruppo e a Tutti noi.
          </p>
          <ul>
            <li>Cerca per Gruppo</li>
            <li>Cerca per luogo</li>
            <li>Cerca per professionalità*</li>
          </ul>
          <Footnote>
            * Alcune funzionalità sono ancora in fase di sviluppo.
          </Footnote>
        </Prose>

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
