'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import styled from 'styled-components';
import { getProduct, getProductCategories, updateProduct } from '@/lib/api/products';
import { getUserDetails } from '@/lib/api/users';
import { citiesList } from '@/lib/utils/cities';

// Default placeholder images set by the API on creation / save when no
// real image is provided. They should not appear in the seller gallery —
// the gallery only shows uploaded media.
const DEFAULT_IMAGE_PATHS = new Set<string>([
  '/images/offro_prodotto.jpg',
  '/images/offro_servizio.jpg',
  '/images/cerco_prodotto.jpg',
  '/images/cerco_servizio.jpg',
  '/images/avviso.jpg',
  '/images/propongo.jpg',
]);

const isUploadedImage = (url: string) => !!url && !DEFAULT_IMAGE_PATHS.has(url);
import LoadingBox from '@/components/ui/LoadingBox';
import MessageBox from '@/components/ui/MessageBox';
import {
  Container,
  PageTitle,
  CardBase,
  PrimaryButton,
  SecondaryButton,
  FormGroup,
  Label,
  Input,
  Select,
  Textarea,
  LoadingContainer,
  FilterButton,
} from '@/lib/styles';

// Styled Components
const FormCard = styled(CardBase)`
  padding: 2rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
`;

const FormGrid = styled.div<{ $twoCols?: boolean }>`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;

  ${({ $twoCols }) =>
    $twoCols &&
    `
    @media (min-width: 640px) {
      grid-template-columns: repeat(2, 1fr);
    }
  `}
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 1.25rem;
  height: 1.25rem;
  color: #2563eb;
  border-radius: 0.25rem;
`;

/* Image gallery */
const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const ImageThumb = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background-color: #f9fafb;
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  border: none;
  background-color: rgba(220, 38, 38, 0.9);
  color: white;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(185, 28, 28, 1);
  }
`;

const AddImageTile = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: 0.5rem;
  border: 2px dashed #d1d5db;
  background-color: #f9fafb;
  color: #6b7280;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  text-align: center;
  padding: 0.5rem;
  gap: 0.25rem;

  &:hover {
    border-color: #2563eb;
    color: #2563eb;
    background-color: #eff6ff;
  }

  span:first-child {
    font-size: 1.5rem;
    line-height: 1;
  }
`;

const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/* Decimal text input with custom unit-step spinner buttons.
   Used for Prezzo Euro so the user can type with comma as decimal
   separator while still nudging the value by 1 with the arrows. */
const DecimalInputWrapper = styled.div`
  position: relative;
`;

const DecimalSpinner = styled.div`
  position: absolute;
  top: 1px;
  bottom: 1px;
  right: 1px;
  width: 1.75rem;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e5e7eb;
  border-radius: 0 0.5rem 0.5rem 0;
  overflow: hidden;
`;

const DecimalSpinnerBtn = styled.button`
  flex: 1;
  border: none;
  background-color: #f9fafb;
  color: #6b7280;
  font-size: 0.625rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background-color: #e5e7eb;
    color: #111827;
  }

  & + & {
    border-top: 1px solid #e5e7eb;
  }
`;

const SectionButtonsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;

  /* Smaller, tighter pills on mobile */
  @media (max-width: 640px) {
    gap: 0.35rem;

    & > button {
      padding: 0.35rem 0.65rem !important;
      font-size: 0.7rem !important;
    }
  }
`;

type SectionValue = 'offro' | 'cerco' | 'propongo' | 'avviso' | 'dono';

const SECTION_BUTTONS: { value: SectionValue; lines: [string, string] }[] = [
  { value: 'offro', lines: ['Vendo', 'Offro'] },
  { value: 'cerco', lines: ['Cerco', 'Mi serve'] },
  { value: 'propongo', lines: ['Proposte', 'Partnership'] },
  { value: 'avviso', lines: ['Avvisi', 'Eventi'] },
  { value: 'dono', lines: ['Dono', 'Tempo'] },
];

// Default placeholder name pattern set by POST /api/products on draft creation.
// Used to fall back to "Inserisci" mode when ?new=1 is missing (e.g. user
// navigated away mid-creation and came back via the productlist edit button).
const DEFAULT_NAME_RE = /^Annunci(ø|o) n° \d+$/;

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = params.id as string;
  const { data: session, status } = useSession();
  const userInfo = session?.user;

  const [name, setName] = useState('');
  const [priceEuro, setPriceEuro] = useState(0);
  const [priceVal, setPriceVal] = useState(0);
  const [category, setCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [countInStock, setCountInStock] = useState(0);
  const [description, setDescription] = useState('');
  const [section, setSection] = useState<'offro' | 'cerco' | 'propongo' | 'avviso' | 'dono'>('offro');
  const [isService, setIsService] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [referer, setReferer] = useState('');
  const [userCity, setUserCity] = useState('');
  const [userReferers, setUserReferers] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    // Wait for NextAuth to resolve before deciding to redirect
    if (status === 'loading') return;
    if (!userInfo?.isAdmin && !userInfo?.isSeller) {
      router.push('/signin');
      return;
    }
    fetchProduct();
    // Fire-and-forget: load existing categories for the select dropdown
    getProductCategories()
      .then((cats) => setCategories(cats))
      .catch((err) => console.error('Failed to load categories', err));
    // Fire-and-forget: load the seller's own profile to prefill defaults
    // (city, referer) and constrain the Gruppo dropdown to their groups.
    if (userInfo?.id) {
      getUserDetails(userInfo.id)
        .then((u) => {
          setUserCity(u.city ?? '');
          setUserReferers(Array.isArray(u.referer) ? u.referer : []);
        })
        .catch(() => {});
    }
    // IMPORTANT: keep this dep array minimal. useSession() can return a
    // new session.user reference on every render, and if userInfo were
    // in the deps the effect would re-fire → fetchProduct() would
    // overwrite whatever the seller was typing in the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, status]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const product = await getProduct(productId);
      // Coalesce every field so the inputs always start controlled — never
      // toggle from undefined to a number/string after the fetch resolves.
      setName(product.name ?? '');
      setPriceEuro(product.priceEuro ?? 0);
      setPriceVal(product.priceVal ?? 0);
      setCategory(product.category ?? '');
      setCountInStock(product.countInStock ?? 0);
      setDescription(product.description ?? '');
      setSection(product.section ?? 'offro');
      setIsService(product.isService ?? false);
      // Strip the legacy '_' placeholder so the Città input starts empty
      // (and gets prefilled with the seller's own city by the effect below).
      setCity(product.city && product.city !== '_' ? product.city : '');
      setReferer(product.referer ?? '');
      // Strip placeholder defaults so the gallery starts empty when the
      // product only has the auto-assigned default image.
      setImages(
        Array.isArray(product.image)
          ? product.image.filter(isUploadedImage)
          : []
      );
    } catch {
      setError('Errore nel caricamento del prodotto');
    } finally {
      setLoading(false);
    }
  };

  // Once categories are loaded, decide whether the existing product category
  // matches a known one or counts as a custom value.
  useEffect(() => {
    if (!loading && categories.length > 0 && category) {
      if (!categories.includes(category)) {
        setIsCustomCategory(true);
        setCustomCategory(category);
      }
    }
  }, [loading, categories, category]);

  // Prefill Città with the seller's own city when the product doesn't carry
  // one yet (legacy '_' or empty). Only runs if the field is still empty so
  // it never overrides a value the seller just typed.
  useEffect(() => {
    if (!loading && !city && userCity) {
      setCity(userCity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userCity]);

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__altra__') {
      setIsCustomCategory(true);
      setCustomCategory('');
    } else {
      setIsCustomCategory(false);
      setCategory(value);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImageUploading(true);
    setUploadError('');

    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/uploads/s3', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || 'Errore nel caricamento immagine');
        }

        const data = await response.json();
        if (data.url) uploadedUrls.push(data.url);
      }

      setImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Errore upload');
    } finally {
      setImageUploading(false);
      // Reset the file input so re-uploading the same file fires onChange
      e.target.value = '';
    }
  };

  const handleImageRemove = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submitHandler = async (e: FormEvent) => {
    e.preventDefault();

    // Resolve effective category — pick the custom value when "Altra"
    // is selected, otherwise the dropdown value.
    const effectiveCategory = isCustomCategory
      ? customCategory.trim().toUpperCase()
      : category;

    if (!effectiveCategory) {
      setError('La categoria è obbligatoria');
      return;
    }

    try {
      setUpdateLoading(true);
      setError('');
      await updateProduct(productId, {
        name,
        priceEuro,
        priceVal,
        category: effectiveCategory,
        countInStock,
        description,
        section,
        isService,
        image: images,
        city,
        referer,
      });
      setSuccess(true);
      setTimeout(() => router.push('/productlist'), 1500);
    } catch {
      setError('Errore nell\'aggiornamento del prodotto');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) return <LoadingContainer><LoadingBox /></LoadingContainer>;
  if (!userInfo) return null;

  return (
    <Container style={{ maxWidth: '42rem', padding: '2rem 1rem' }}>
      <PageTitle>
        {searchParams.get('new') === '1' || DEFAULT_NAME_RE.test(name)
          ? 'Inserisci Annuncio'
          : 'Modifica Annuncio'}
      </PageTitle>

      <FormCard>
        {error && <MessageBox variant="danger">{error}</MessageBox>}
        {success && <MessageBox variant="success">Prodotto aggiornato!</MessageBox>}

        <form onSubmit={submitHandler} style={{ marginTop: '1rem' }}>
          <FormGroup>
            <Label>Nome *</Label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label>Sezione</Label>
            <SectionButtonsRow>
              {SECTION_BUTTONS.map((btn) => (
                <FilterButton
                  key={btn.value}
                  type="button"
                  onClick={() => setSection(btn.value)}
                  $isActive={section === btn.value}
                  style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    lineHeight: 1.1,
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <span>{btn.lines[0]}</span>
                  <span>{btn.lines[1]}</span>
                </FilterButton>
              ))}
            </SectionButtonsRow>
          </FormGroup>

          {(section === 'offro' || section === 'cerco') && (
            <FormGroup
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: '1.5rem',
              }}
            >
              <CheckboxLabel>
                <Checkbox
                  type="radio"
                  name="isServiceRadio"
                  checked={!isService}
                  onChange={() => setIsService(false)}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Prodotto
                </span>
              </CheckboxLabel>
              <CheckboxLabel>
                <Checkbox
                  type="radio"
                  name="isServiceRadio"
                  checked={isService}
                  onChange={() => setIsService(true)}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Servizio
                </span>
              </CheckboxLabel>
            </FormGroup>
          )}

          {(section === 'offro' || section === 'cerco' || section === 'dono') && (
          <FormGrid $twoCols>
            <FormGroup>
              <Label>Categoria *</Label>
              <Select
                value={isCustomCategory ? '__altra__' : category}
                onChange={handleCategoryChange}
                required
              >
                <option value="">— Seleziona categoria —</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__altra__">Altra (specifica)…</option>
              </Select>
              {isCustomCategory && (
                <Input
                  type="text"
                  placeholder="Nome nuova categoria"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  style={{ marginTop: '0.5rem' }}
                />
              )}
            </FormGroup>
            <FormGroup>
              <Label>Quantità *</Label>
              <DecimalInputWrapper>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={countInStock || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setCountInStock(0);
                      return;
                    }
                    if (/^\d+$/.test(raw)) setCountInStock(Number(raw));
                  }}
                  style={{ paddingRight: '2.25rem' }}
                />
                <DecimalSpinner>
                  <DecimalSpinnerBtn
                    type="button"
                    aria-label="Aumenta di 1"
                    onClick={() => setCountInStock((v) => v + 1)}
                  >
                    ▲
                  </DecimalSpinnerBtn>
                  <DecimalSpinnerBtn
                    type="button"
                    aria-label="Diminuisci di 1"
                    onClick={() => setCountInStock((v) => Math.max(0, v - 1))}
                  >
                    ▼
                  </DecimalSpinnerBtn>
                </DecimalSpinner>
              </DecimalInputWrapper>
            </FormGroup>
          </FormGrid>
          )}

          <FormGrid $twoCols>
            <FormGroup>
              <Label>Città</Label>
              <Input
                type="text"
                list="edit-city-options"
                placeholder="Es. Torino, Roma…"
                value={city}
                onChange={(e) => setCity(e.target.value.toUpperCase())}
              />
              <datalist id="edit-city-options">
                {citiesList.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </FormGroup>
            <FormGroup>
              <Label>Gruppo</Label>
              <Input
                type="text"
                list="edit-referer-options"
                placeholder={
                  userReferers.length ? userReferers[0] : 'Nessun gruppo'
                }
                value={referer}
                onChange={(e) => setReferer(e.target.value.toUpperCase())}
              />
              <datalist id="edit-referer-options">
                {userReferers.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <small
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '0.25rem',
                  display: 'block',
                }}
              >
                Scegli uno dei gruppi dichiarati in registrazione. Per
                aggiungerne altri, modifica il tuo profilo.
              </small>
            </FormGroup>
          </FormGrid>

          <FormGroup>
            <Label>Descrizione *</Label>
            <Textarea
              rows={5}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormGroup>

          {section === 'offro' && (
            <FormGrid $twoCols>
              <FormGroup>
                <Label>Prezzo Euro</Label>
                <DecimalInputWrapper>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={
                      priceEuro
                        ? String(priceEuro).replace('.', ',')
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      if (raw === '') {
                        setPriceEuro(0);
                        return;
                      }
                      if (/^\d*\.?\d*$/.test(raw)) {
                        const parsed = raw === '.' ? 0 : Number(raw);
                        if (!Number.isNaN(parsed)) setPriceEuro(parsed);
                      }
                    }}
                    style={{ paddingRight: '2.25rem' }}
                  />
                  <DecimalSpinner>
                    <DecimalSpinnerBtn
                      type="button"
                      aria-label="Aumenta di 1"
                      onClick={() => setPriceEuro((p) => Math.floor(p) + 1)}
                    >
                      ▲
                    </DecimalSpinnerBtn>
                    <DecimalSpinnerBtn
                      type="button"
                      aria-label="Diminuisci di 1"
                      onClick={() =>
                        setPriceEuro((p) => Math.max(0, Math.floor(p) - 1))
                      }
                    >
                      ▼
                    </DecimalSpinnerBtn>
                  </DecimalSpinner>
                </DecimalInputWrapper>
              </FormGroup>
              <FormGroup>
                <Label>Prezzo VAL *</Label>
                <DecimalInputWrapper>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={priceVal || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setPriceVal(0);
                        return;
                      }
                      if (/^\d+$/.test(raw)) setPriceVal(Number(raw));
                    }}
                    style={{ paddingRight: '2.25rem' }}
                  />
                  <DecimalSpinner>
                    <DecimalSpinnerBtn
                      type="button"
                      aria-label="Aumenta di 1"
                      onClick={() => setPriceVal((v) => v + 1)}
                    >
                      ▲
                    </DecimalSpinnerBtn>
                    <DecimalSpinnerBtn
                      type="button"
                      aria-label="Diminuisci di 1"
                      onClick={() => setPriceVal((v) => Math.max(0, v - 1))}
                    >
                      ▼
                    </DecimalSpinnerBtn>
                  </DecimalSpinner>
                </DecimalInputWrapper>
              </FormGroup>
            </FormGrid>
          )}

          <FormGroup>
            <Label>Immagini ({images.length})</Label>
            <ImageGrid>
              {images.map((url, idx) => (
                <ImageThumb key={`${url}-${idx}`}>
                  <Image
                    src={url}
                    alt={`Immagine ${idx + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 8rem"
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                  <RemoveImageButton
                    type="button"
                    onClick={() => handleImageRemove(idx)}
                    aria-label={`Rimuovi immagine ${idx + 1}`}
                  >
                    ×
                  </RemoveImageButton>
                </ImageThumb>
              ))}
              <AddImageTile>
                <span>＋</span>
                <span>{imageUploading ? 'Caricamento…' : 'Aggiungi'}</span>
                <HiddenFileInput
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={imageUploading}
                  onChange={handleImageUpload}
                />
              </AddImageTile>
            </ImageGrid>
            {uploadError && (
              <div style={{ marginTop: '0.5rem' }}>
                <MessageBox variant="danger">{uploadError}</MessageBox>
              </div>
            )}
          </FormGroup>

          <ButtonGroup>
            <PrimaryButton
              type="submit"
              disabled={updateLoading}
              style={{ flex: 1 }}
            >
              {updateLoading ? 'Salvataggio...' : 'Salva Modifiche'}
            </PrimaryButton>
            <SecondaryButton
              type="button"
              onClick={() => router.push('/productlist')}
              style={{ padding: '0.75rem 1.5rem' }}
            >
              Annulla
            </SecondaryButton>
          </ButtonGroup>
        </form>
      </FormCard>
    </Container>
  );
}
