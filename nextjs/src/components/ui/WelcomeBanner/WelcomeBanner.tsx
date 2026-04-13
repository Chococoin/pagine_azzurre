'use client';

import Image from 'next/image';
import {
  BannerContainer,
  DecorativeCircle,
  ContentWrapper,
  TitleSection,
  MainTitle,
  BrandName,
  Subtitle,
  MissionSection,
  MissionText,
  CurrencyList,
  PreferredCurrencies,
  EccWithTooltip,
  LogosContainer,
  LogoWrapper,
  LogoBackground,
  FooterSection,
  FooterText,
  FooterHighlight,
} from './WelcomeBanner.styles';

// Per-logo padding tuning:
//  - logos 1, 2, 4 (round/centered marks) get +33% padding for breathing room
//  - logos 3, 5, 6 (wide banner-shaped marks) get near-zero horizontal padding
//    so they fill the tile horizontally
const PAD_BIG = '0.665rem';                  // 0.5rem * 1.33
const PAD_WIDE = '0.5rem 0.1rem';            // tight horizontal, normal vertical

const logos = [
  { src: '/logos/coseinUtili.jpeg', alt: 'Cose(in)utili — cambia l\'inutile in utile', href: 'https://coseinutili.online', padding: PAD_WIDE },
  { src: '/logos/valazco-banner.jpg', alt: 'Val.Az.Co — VALorizzatore AZioni COncordate', href: 'https://valazco.org/', padding: PAD_WIDE },
  { src: '/logos/banco-cittadini.jpg', alt: 'Il Banco dei Cittadini Volontari', href: 'https://valazco.org/', padding: PAD_WIDE },
  { src: '/logos/valazco-logo.png', alt: 'Valazco — app.valazco.org', href: 'https://app.valazco.org', padding: PAD_BIG },
  { src: '/logos/bannerblu.jpg', alt: 'Scopri di più su Pagine Azzurre', href: 'http://valazco.org/scopri-pagine-azzurre.html', padding: PAD_WIDE },
  { src: '/logos/comunitasolidali.png', alt: 'Comunita Solidali', href: 'https://mercato.comunitasolidali.it', padding: PAD_BIG },
];

export function WelcomeBanner() {
  return (
    <BannerContainer>
      <DecorativeCircle $position="top" />
      <DecorativeCircle $position="bottom" />

      <ContentWrapper>
        {/* Welcome Title */}
        <TitleSection>
          {/* Hidden temporarily — MainTitle "Benvenuti in Pagine Azzurre" */}
          {/* <MainTitle>
            Benvenuti in <BrandName>Pagine Azzurre</BrandName>
          </MainTitle> */}
          <Subtitle>
            Piazza diffusa dove
            barattiamo e scambiamo con più <span style={{ fontSize: '1.25em' }}>☯</span> VAL e meno Euro.
          </Subtitle>
        </TitleSection>

        {/* Mission Statement */}
        <MissionSection>
          <MissionText>
            Per l&apos;emancipazione della dimensione umana favoriamo lo scambio di
            valori umani con le convenzioni:
            <br />
            <PreferredCurrencies>
              VAL, Co-In, G1, RISO, SCEC, Din,{' '}
              <EccWithTooltip
                tabIndex={0}
                aria-label="Avete un vostro sistema di scambio? Proponetelo"
                data-tooltip="Avete un vostro sistema di scambio? Proponetelo!"
              >
                ecc…
              </EccWithTooltip>
            </PreferredCurrencies>
            <br />
            Si accettano complementariamente le convenzioni monetarie:{' '}
            <CurrencyList>Euro, USD, FS, cripto</CurrencyList>
          </MissionText>
        </MissionSection>

        {/* Logos Container */}
        <LogosContainer>
          {logos.map((logo, index) => {
            const logoImage = (
              <LogoWrapper>
                <LogoBackground />
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={80}
                  height={80}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    padding: logo.padding,
                    borderRadius: '0.75rem',
                  }}
                />
              </LogoWrapper>
            );

            return logo.href ? (
              <a
                key={index}
                href={logo.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                {logoImage}
              </a>
            ) : (
              <div key={index}>{logoImage}</div>
            );
          })}
        </LogosContainer>

        {/* Footer Info */}
        <FooterSection>
          <FooterText>
            Pagineazzurre e una attivita promossa e gestita dal{' '}
            <FooterHighlight>Banco dei Cittadini Volontari del Val.Az.Co</FooterHighlight>
          </FooterText>
        </FooterSection>
      </ContentWrapper>
    </BannerContainer>
  );
}

export default WelcomeBanner;
