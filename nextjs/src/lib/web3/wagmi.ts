import { http, createConfig } from 'wagmi';
import { sepolia, mainnet, localhost } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import type { Chain } from 'wagmi/chains';

// Defensive trim — NEXT_PUBLIC_* values are inlined at build time; trimming
// still runs on the inlined literal so trailing whitespace from Vercel env
// vars is stripped on both server and client.
const trim = (key: string, fallback = '') => (process.env[key] ?? fallback).trim();
const RPC_URL = trim('NEXT_PUBLIC_RPC_URL', 'http://localhost:8545');

// Anvil-compatible chain (local or remote fly.dev deployment).
// Reads the RPC URL from env so browser calls hit the right endpoint.
const anvil: Chain = {
  ...localhost,
  id: 31337,
  name: 'Anvil',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
};

export const wagmiConfig = createConfig({
  chains: [anvil, sepolia, mainnet],
  connectors: [
    injected(), // MetaMask and other injected wallets
  ],
  transports: {
    [anvil.id]: http(RPC_URL),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

// Re-export chains for convenience
export { anvil, sepolia, mainnet };
