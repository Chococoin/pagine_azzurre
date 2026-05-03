import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PurchaseCard } from './PurchaseCard';
import MessageBox from '../MessageBox';

const meta: Meta<typeof PurchaseCard> = {
  title: 'UI/PurchaseCard',
  component: PurchaseCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sticky card della pagina prodotto: mostra venditore, prezzo dual-currency (€ / VAL), disponibilità, selettore quantità e CTA principale. Componente presentazionale: lo stato `qty` e il click sono gestiti dal parent.',
      },
    },
  },
  argTypes: {
    countInStock: {
      control: { type: 'number', min: 0, max: 99 },
      description: 'Numero di unità disponibili. 0 disabilita la CTA.',
    },
    qty: {
      control: { type: 'number', min: 1, max: 99 },
      description: 'Quantità selezionata (controllata dal parent).',
    },
    priceEuro: {
      control: { type: 'number', min: 0, step: 0.01 },
    },
    priceVal: {
      control: { type: 'number', min: 0 },
    },
    showPrices: {
      control: 'boolean',
      description: 'Nasconde le righe Prezzo / Quantità per le sezioni avviso/propongo/dono.',
    },
    ctaLabel: {
      control: 'text',
    },
    onContact: { action: 'contact clicked' },
    onQtyChange: { action: 'qty changed' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '24rem' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PurchaseCard>;

const baseSeller = {
  id: '650000000000000000000001',
  name: 'matteo',
  rating: 0,
  numReviews: 0,
};

/* ─── Stories ─────────────────────────────────────────────────────────── */

export const Default: Story = {
  args: {
    seller: baseSeller,
    countInStock: 1,
    qty: 1,
    priceEuro: 60,
    priceVal: 60,
    showPrices: true,
    ctaLabel: 'Contatta Offerente',
  },
};

export const WithRatedSeller: Story = {
  args: {
    ...Default.args,
    seller: {
      id: '650000000000000000000002',
      name: 'Antonella · Bottega Sole',
      rating: 4.5,
      numReviews: 23,
    },
  },
};

export const FreeItem: Story = {
  args: {
    ...Default.args,
    priceEuro: 0,
    priceVal: 10,
  },
  parameters: {
    docs: {
      description: {
        story: 'Annuncio gratis: prezzo Euro a 0, prezzo VAL valorizzato.',
      },
    },
  },
};

export const HighStock: Story = {
  args: {
    ...Default.args,
    countInStock: 25,
    qty: 3,
  },
};

export const OutOfStock: Story = {
  args: {
    ...Default.args,
    countInStock: 0,
  },
  parameters: {
    docs: {
      description: {
        story: 'Quando non ci sono unità disponibili la CTA e il selettore quantità vengono nascosti.',
      },
    },
  },
};

export const WithoutPrices: Story = {
  args: {
    ...Default.args,
    showPrices: false,
    ctaLabel: 'Rispondi all\'avviso',
  },
  parameters: {
    docs: {
      description: {
        story: 'Variante usata per le sezioni avviso / propongo / dono dove non c\'è prezzo.',
      },
    },
  },
};

export const WithWarning: Story = {
  args: {
    ...Default.args,
    warning: (
      <MessageBox variant="warning">
        Per contattare un offerente devi prima mettere un prodotto in vetrina.
      </MessageBox>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Slot opzionale `warning` sotto la CTA per mostrare requisiti come "metti un prodotto in vetrina prima".',
      },
    },
  },
};

/* Interactive playground — qty controllato dallo state della story */
export const Interactive: Story = {
  render: (args) => {
    function Wrapper() {
      const [qty, setQty] = useState(1);
      return <PurchaseCard {...args} qty={qty} onQtyChange={setQty} />;
    }
    return <Wrapper />;
  },
  args: {
    seller: baseSeller,
    countInStock: 5,
    priceEuro: 60,
    priceVal: 60,
    showPrices: true,
  },
};
