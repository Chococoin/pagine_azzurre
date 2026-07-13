'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/api/client';
import LoadingBox from '@/components/ui/LoadingBox';
import MessageBox from '@/components/ui/MessageBox';
import type { User } from '@/types';
import styled from 'styled-components';
import { Container, PageTitle, CardBase, FormGroup, Label, Input, PrimaryButton, SecondaryButton } from '@/lib/styles';

const EmailContainer = styled(Container)`
  max-width: 42rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
`;

const EmailCard = styled(CardBase)`
  border-radius: 1rem;
  padding: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1rem;
`;

const Recipient = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;

  strong {
    color: #111827;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 12rem;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #2563eb;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
`;

export default function UserEmailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { data: session, status } = useSession();
  const userInfo = session?.user;

  const [recipient, setRecipient] = useState<User | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!userInfo?.isAdmin) {
      router.push('/signin');
      return;
    }
    fetchRecipient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchRecipient = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/users/${userId}`);
      setRecipient(data);
    } catch {
      setError('Errore nel caricamento dell\'utente');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('Oggetto e messaggio sono obbligatori');
      return;
    }
    try {
      setSending(true);
      setError('');
      await apiClient.post(`/users/${userId}/email`, {
        subject,
        emailBody: message,
      });
      setSuccess(true);
      setTimeout(() => router.push('/userlist'), 1500);
    } catch {
      setError('Errore nell\'invio email');
    } finally {
      setSending(false);
    }
  };

  if (!userInfo) return null;

  return (
    <EmailContainer>
      <PageTitle>Invia Email</PageTitle>

      {loading ? (
        <LoadingBox />
      ) : !recipient ? (
        <MessageBox variant="danger">{error || 'Utente non trovato'}</MessageBox>
      ) : (
        <EmailCard>
          <Recipient>
            Destinatario: <strong>{recipient.username}</strong> ({recipient.email})
          </Recipient>

          {success ? (
            <MessageBox variant="success">Email inviata con successo</MessageBox>
          ) : (
            <Form onSubmit={handleSubmit}>
              {error && <MessageBox variant="danger">{error}</MessageBox>}

              <FormGroup>
                <Label htmlFor="subject">Oggetto</Label>
                <Input
                  id="subject"
                  type="text"
                  value={subject}
                  maxLength={200}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Oggetto dell'email"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="message">Messaggio</Label>
                <Textarea
                  id="message"
                  value={message}
                  maxLength={2000}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Scrivi il messaggio per l'utente…"
                  required
                />
              </FormGroup>

              <ButtonRow>
                <PrimaryButton type="submit" disabled={sending}>
                  {sending ? 'Invio in corso…' : 'Invia'}
                </PrimaryButton>
                <SecondaryButton type="button" onClick={() => router.push('/userlist')}>
                  Annulla
                </SecondaryButton>
              </ButtonRow>
            </Form>
          )}
        </EmailCard>
      )}
    </EmailContainer>
  );
}
