import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collaborazione in attesa di perfezionamento — Pagine Azzurre',
  description: 'Questa collaborazione è in attesa di perfezionamento.',
};

export default function CollaborazioneInAttesaPage() {
  return (
    <main
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        padding: '2rem 1rem',
      }}
    >
      <Image
        src="/logos/collaborazione-in-attesa.png"
        alt="Collaborazione in attesa di perfezionamento"
        width={960}
        height={720}
        priority
        style={{
          width: '100%',
          maxWidth: '640px',
          height: 'auto',
          borderRadius: '0.75rem',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
        }}
      />
    </main>
  );
}
