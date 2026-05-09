'use client';

import styled from 'styled-components';
import { theme } from '@/lib/styles';

export const SearchForm = styled.form`
  display: flex;
  align-items: stretch;
  gap: ${theme.spacing.sm};
  width: 100%;
`;

export const FieldsRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: ${theme.spacing.xs};
  flex: 1;
  min-width: 0;

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

export const FieldWrapper = styled.div`
  position: relative;
  min-width: 0;
`;

export const FieldIcon = styled.span`
  position: absolute;
  left: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  display: inline-flex;
  pointer-events: none;
`;

export const SearchInput = styled.input<{ $hasIcon?: boolean }>`
  width: 100%;
  padding: 0.5rem ${theme.spacing.md};
  padding-left: ${(p) => (p.$hasIcon ? '1.85rem' : theme.spacing.md)};
  background-color: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.typography.fontSize.sm};
  transition: all ${theme.transitions.normal};

  &::placeholder {
    color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    background-color: white;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

export const SearchButton = styled.button`
  flex: 0 0 auto;
  background: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.lg};
  padding: 0 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background ${theme.transitions.normal};

  &:hover {
    background: ${theme.colors.primaryHover};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;
