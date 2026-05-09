'use client';

import styled from 'styled-components';
import { theme } from '@/lib/styles';

export const BannerContainer = styled.div`
  position: relative;
  overflow: hidden;
  background: linear-gradient(to bottom right, #eff6ff, #ffffff, #eff6ff);
  border-radius: ${theme.borderRadius.xl};
  box-shadow: ${theme.shadows.lg};
  margin: ${theme.spacing.xl} auto;
  max-width: 80rem;
  border: 1px solid #dbeafe;
`;

export const DecorativeCircle = styled.div<{ $position: 'top' | 'bottom' }>`
  position: absolute;
  width: 16rem;
  height: 16rem;
  border-radius: 50%;
  filter: blur(48px);

  ${({ $position }) =>
    $position === 'top'
      ? `
    top: 0;
    right: 0;
    background-color: #dbeafe;
    opacity: 0.3;
    transform: translate(50%, -50%);
  `
      : `
    bottom: 0;
    left: 0;
    background-color: #bfdbfe;
    opacity: 0.2;
    transform: translate(-50%, 50%);
  `}
`;

export const ContentWrapper = styled.div`
  position: relative;
  padding: 5px 1.5rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};

  @media (min-width: 768px) {
    padding: 5px 3rem 0.7rem;
  }
`;

export const TitleSection = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const MainTitle = styled.h1`
  font-size: 1.875rem;
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text};
  line-height: 1.2;

  @media (min-width: 768px) {
    font-size: 2.25rem;
  }

  @media (min-width: 1024px) {
    font-size: 3rem;
  }
`;

export const BrandName = styled.span`
  color: ${theme.colors.primary};
`;

export const Subtitle = styled.p`
  font-size: 1.125rem;
  color: ${theme.colors.textSecondary};
  font-weight: ${theme.typography.fontWeight.medium};

  @media (min-width: 768px) {
    font-size: 1.25rem;
  }
`;

export const MissionSection = styled.div`
  max-width: 56rem;
  /* Negative top margin neutralises the ContentWrapper gap between
     TitleSection and MissionSection so the two text blocks sit flush. */
  margin: -${theme.spacing.xl} auto 0;
  width: 100%;
`;

export const MissionText = styled.p`
  font-size: 1rem;
  color: #4b5563;
  text-align: center;
  line-height: 1.75;

  @media (min-width: 768px) {
    font-size: 1.125rem;
  }
`;

export const CurrencyList = styled.span`
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text};
`;

export const PreferredCurrencies = styled.span`
  color: ${theme.colors.primary};
  font-weight: ${theme.typography.fontWeight.semibold};
`;

/* "ecc…" with a hover/focus tooltip — used inside MissionText to surface
   the call-to-action "Avete un vostro sistema di scambio?" only when the
   user explicitly hovers the trigger. */
export const EccWithTooltip = styled.span`
  position: relative;
  cursor: help;
  border-bottom: 1px dotted currentColor;
  outline: none;

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 0.5rem);
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    background-color: ${theme.colors.primary};
    color: ${theme.colors.textLight};
    padding: 0.5rem 0.75rem;
    border-radius: ${theme.borderRadius.md};
    font-size: 0.8125rem;
    font-style: italic;
    font-weight: ${theme.typography.fontWeight.normal};
    line-height: 1.4;
    width: max-content;
    max-width: min(20rem, 80vw);
    text-align: center;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 150ms ease, visibility 150ms ease, transform 150ms ease;
    z-index: 20;
    box-shadow: ${theme.shadows.md};
  }

  &::before {
    content: '';
    position: absolute;
    bottom: calc(100% + 0.125rem);
    left: 50%;
    transform: translateX(-50%);
    border: 0.375rem solid transparent;
    border-top-color: ${theme.colors.primary};
    opacity: 0;
    visibility: hidden;
    transition: opacity 150ms ease, visibility 150ms ease;
    z-index: 20;
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }

  &:hover::before,
  &:focus-visible::before {
    opacity: 1;
    visibility: visible;
  }
`;

export const LogosContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  /* Halve the vertical space added by the ContentWrapper gap (2rem)
     above and below this section. */
  margin-top: -1rem;
  margin-bottom: -1rem;

  @media (min-width: 768px) {
    gap: 2rem;
    /* Wrapper gap at this breakpoint is 2.5rem, halve it. */
    margin-top: -1.25rem;
    margin-bottom: -1.25rem;
  }
`;

export const LogoWrapper = styled.div`
  position: relative;
  width: 4rem;
  height: 4rem;
  transition: transform ${theme.transitions.normal};

  &:hover {
    transform: scale(1.1);
  }

  @media (min-width: 768px) {
    width: 5rem;
    height: 5rem;
  }
`;

export const LogoBackground = styled.div`
  position: absolute;
  inset: 0;
  background: white;
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.md};
  transition: box-shadow ${theme.transitions.normal};

  ${LogoWrapper}:hover & {
    box-shadow: ${theme.shadows.xl};
  }
`;

export const FooterSection = styled.div`
  text-align: center;
`;

export const FooterText = styled.p`
  font-size: 0.875rem;
  color: #4b5563;

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

export const FooterHighlight = styled.span`
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text};
`;

export const LearnMoreLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
  color: ${theme.colors.primary};
  font-weight: ${theme.typography.fontWeight.medium};
  transition: color ${theme.transitions.fast};
  text-decoration: none;

  &:hover {
    color: ${theme.colors.primaryHover};

    svg {
      transform: translateX(4px);
    }
  }

  svg {
    width: 1rem;
    height: 1rem;
    transition: transform ${theme.transitions.fast};
  }
`;
