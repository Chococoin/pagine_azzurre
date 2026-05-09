'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Users } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { citiesList } from '@/lib/utils/cities';
import {
  SearchForm,
  FieldsRow,
  FieldWrapper,
  FieldIcon,
  SearchInput,
  SearchButton,
} from './SearchBox.styles';

export function SearchBox() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [referer, setReferer] = useState('');
  const [referers, setReferers] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ referers?: string[] }>('/users/referers')
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data?.referers) ? res.data.referers : [];
        setReferers(list);
      })
      .catch(() => {
        // Best-effort autocomplete — failure is non-blocking.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const n = name.trim();
    const c = city.trim().toUpperCase();
    const r = referer.trim();

    let url = '/search';
    if (n) url += `/name/${encodeURIComponent(n)}`;
    if (c) url += `/city/${encodeURIComponent(c)}`;
    if (r) url += `/referer/${encodeURIComponent(r)}`;

    if (url === '/search') return;
    router.push(url);
  };

  return (
    <SearchForm onSubmit={submitHandler}>
      <FieldsRow>
        <FieldWrapper>
          <SearchInput
            type="text"
            name="q"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cosa cerchi?"
            aria-label="Cerca per nome"
          />
        </FieldWrapper>
        <FieldWrapper>
          <FieldIcon aria-hidden="true">
            <MapPin size={14} />
          </FieldIcon>
          <SearchInput
            type="text"
            list="searchbox-cities"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Città"
            aria-label="Filtra per città"
            $hasIcon
          />
          <datalist id="searchbox-cities">
            {citiesList.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FieldWrapper>
        <FieldWrapper>
          <FieldIcon aria-hidden="true">
            <Users size={14} />
          </FieldIcon>
          <SearchInput
            type="text"
            list="searchbox-referers"
            value={referer}
            onChange={(e) => setReferer(e.target.value)}
            placeholder="Gruppo"
            aria-label="Filtra per gruppo"
            $hasIcon
          />
          <datalist id="searchbox-referers">
            {referers.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </FieldWrapper>
      </FieldsRow>
      <SearchButton type="submit" aria-label="Cerca">
        <Search size={18} />
      </SearchButton>
    </SearchForm>
  );
}

export default SearchBox;
