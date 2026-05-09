'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styled from 'styled-components';
import {
  Container,
  PageTitle,
  CardBase,
  LoadingContainer,
} from '@/lib/styles';
import LoadingBox from '@/components/ui/LoadingBox';
import MessageBox from '@/components/ui/MessageBox';
import apiClient from '@/lib/api/client';

type SectionKey = 'offro' | 'cerco' | 'propongo' | 'avviso' | 'dono';

interface Stats {
  generatedAt: string;
  users: {
    total: number;
    sellers: number;
    admins: number;
    verified: number;
    withAds: number;
  };
  newsletter: { total: number; verified: number };
  products: {
    total: number;
    bySection: Record<SectionKey, number>;
    topCategories: { name: string; count: number }[];
    topCities: { name: string; count: number }[];
  };
  orders: { total: number; paid: number; delivered: number };
  activity: {
    last7d: { newUsers: number; newProducts: number; newOrders: number };
    last30d: { newUsers: number; newProducts: number; newOrders: number };
  };
}

const SECTION_LABELS: Record<SectionKey, string> = {
  offro: 'Vendo / Offro',
  cerco: 'Cerco / Mi serve',
  propongo: 'Proposte / Partnership',
  avviso: 'Avvisi / Eventi',
  dono: 'Dono / Tempo',
};

const Grid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: repeat(${(p) => p.$cols ?? 4}, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

const KpiCard = styled(CardBase)`
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const KpiLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const KpiValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
`;

const KpiSub = styled.div`
  font-size: 0.78rem;
  color: #6b7280;
`;

const SectionHeading = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
  margin: 2rem 0 1rem;
`;

const ListCard = styled(CardBase)`
  padding: 1.25rem;
`;

const ListRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.9rem;

  &:last-child {
    border-bottom: none;
  }
`;

const ListName = styled.span`
  color: #111827;
`;

const ListCount = styled.span`
  color: #2563eb;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const Note = styled.p`
  font-size: 0.8rem;
  color: #6b7280;
  margin: 1.25rem 0 0;
  line-height: 1.5;
`;

const Refresh = styled.button`
  margin-left: auto;
  background: transparent;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 0.4rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.8rem;
  cursor: pointer;
  &:hover { background: #f9fafb; }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
`;

const num = (n: number) => n.toLocaleString('it-IT');

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get<Stats>('/admin/stats');
      setStats(data);
    } catch {
      setError('Errore nel caricamento delle metriche');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.push('/signin');
      return;
    }
    if (!session.user.isAdmin) {
      router.push('/');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id, session?.user?.isAdmin]);

  if (loading) {
    return (
      <LoadingContainer>
        <LoadingBox />
      </LoadingContainer>
    );
  }

  if (error || !stats) {
    return (
      <Container style={{ maxWidth: '64rem', padding: '2rem 1rem' }}>
        <PageTitle>Pannello di controllo</PageTitle>
        <MessageBox variant="danger">{error || 'Nessun dato'}</MessageBox>
      </Container>
    );
  }

  const generated = new Date(stats.generatedAt).toLocaleString('it-IT');
  const sectionRows = (
    Object.keys(SECTION_LABELS) as SectionKey[]
  ).map((key) => ({
    key,
    label: SECTION_LABELS[key],
    count: stats.products.bySection[key] ?? 0,
  }));

  return (
    <Container style={{ maxWidth: '72rem', padding: '2rem 1rem' }}>
      <Header>
        <PageTitle style={{ margin: 0 }}>Pannello di controllo</PageTitle>
        <Refresh type="button" onClick={load}>Aggiorna</Refresh>
      </Header>
      <Note style={{ margin: '0.25rem 0 1.5rem' }}>
        Ultimo aggiornamento: {generated}
      </Note>

      {/* KPI principales */}
      <Grid $cols={4}>
        <KpiCard>
          <KpiLabel>Utenti</KpiLabel>
          <KpiValue>{num(stats.users.total)}</KpiValue>
          <KpiSub>
            {num(stats.users.sellers)} venditori · {num(stats.users.admins)} admin
          </KpiSub>
        </KpiCard>
        <KpiCard>
          <KpiLabel>Annunci</KpiLabel>
          <KpiValue>{num(stats.products.total)}</KpiValue>
          <KpiSub>
            {num(stats.users.withAds)} venditori con almeno un annuncio
          </KpiSub>
        </KpiCard>
        <KpiCard>
          <KpiLabel>Ordini</KpiLabel>
          <KpiValue>{num(stats.orders.total)}</KpiValue>
          <KpiSub>
            {num(stats.orders.paid)} pagati · {num(stats.orders.delivered)} consegnati
          </KpiSub>
        </KpiCard>
        <KpiCard>
          <KpiLabel>Newsletter</KpiLabel>
          <KpiValue>{num(stats.newsletter.verified)}</KpiValue>
          <KpiSub>su {num(stats.newsletter.total)} iscrizioni</KpiSub>
        </KpiCard>
      </Grid>

      {/* Activity 7d/30d */}
      <SectionHeading>Attività recente</SectionHeading>
      <Grid $cols={3}>
        <KpiCard>
          <KpiLabel>Nuovi utenti</KpiLabel>
          <KpiValue>{num(stats.activity.last7d.newUsers)}</KpiValue>
          <KpiSub>
            ultimi 7 giorni · {num(stats.activity.last30d.newUsers)} in 30g
          </KpiSub>
        </KpiCard>
        <KpiCard>
          <KpiLabel>Nuovi annunci</KpiLabel>
          <KpiValue>{num(stats.activity.last7d.newProducts)}</KpiValue>
          <KpiSub>
            ultimi 7 giorni · {num(stats.activity.last30d.newProducts)} in 30g
          </KpiSub>
        </KpiCard>
        <KpiCard>
          <KpiLabel>Nuovi ordini</KpiLabel>
          <KpiValue>{num(stats.activity.last7d.newOrders)}</KpiValue>
          <KpiSub>
            ultimi 7 giorni · {num(stats.activity.last30d.newOrders)} in 30g
          </KpiSub>
        </KpiCard>
      </Grid>

      {/* Distribuciones */}
      <SectionHeading>Distribuzione annunci</SectionHeading>
      <Grid $cols={3}>
        <ListCard>
          <KpiLabel style={{ marginBottom: '0.5rem' }}>Per sezione</KpiLabel>
          {sectionRows.map((row) => (
            <ListRow key={row.key}>
              <ListName>{row.label}</ListName>
              <ListCount>{num(row.count)}</ListCount>
            </ListRow>
          ))}
        </ListCard>
        <ListCard>
          <KpiLabel style={{ marginBottom: '0.5rem' }}>Top categorie</KpiLabel>
          {stats.products.topCategories.length === 0 && (
            <ListRow>
              <ListName style={{ color: '#9ca3af' }}>Nessun dato</ListName>
            </ListRow>
          )}
          {stats.products.topCategories.map((row) => (
            <ListRow key={row.name}>
              <ListName>{row.name}</ListName>
              <ListCount>{num(row.count)}</ListCount>
            </ListRow>
          ))}
        </ListCard>
        <ListCard>
          <KpiLabel style={{ marginBottom: '0.5rem' }}>Top città</KpiLabel>
          {stats.products.topCities.length === 0 && (
            <ListRow>
              <ListName style={{ color: '#9ca3af' }}>Nessun dato</ListName>
            </ListRow>
          )}
          {stats.products.topCities.map((row) => (
            <ListRow key={row.name}>
              <ListName>{row.name}</ListName>
              <ListCount>{num(row.count)}</ListCount>
            </ListRow>
          ))}
        </ListCard>
      </Grid>

      <Note>
        I dati di traffico (visite, utenti unici, top pagine) richiedono un
        provider di analytics dedicato. Per abilitare le metriche di traffico
        installa <code>@vercel/analytics</code> e abilita Web Analytics nel
        progetto Vercel — i numeri appariranno qui dopo qualche giorno di dati.
      </Note>
    </Container>
  );
}
