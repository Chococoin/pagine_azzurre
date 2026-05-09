#!/usr/bin/env node
/**
 * Quick balance check for arbitrary wallets against the Pagine Azzurre
 * token. Usage:
 *   node scripts/check-balances.mjs 0xAddr1 0xAddr2 ...
 *
 * If no args are passed, falls back to a hardcoded list of test users.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient,
  defineChain,
  http,
  parseAbi,
  formatEther,
} from 'viem';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nextjsRoot = resolve(__dirname, '..');

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}

loadEnvFile(resolve(nextjsRoot, '.env.local'));
loadEnvFile(resolve(nextjsRoot, '.env'));

const env = (key, fallback = '') => (process.env[key] ?? fallback).trim();

const RPC_URL = env('NEXT_PUBLIC_RPC_URL', 'http://localhost:8545');
const CHAIN_ID = Number(env('NEXT_PUBLIC_CHAIN_ID', '31337'));
const CONTRACT = env('NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS', '');

const args = process.argv.slice(2);
const wallets =
  args.length > 0
    ? args.map((a) => ({ name: a.slice(0, 8) + '…', address: a }))
    : [
        { name: 'BUYERTEST',  address: '0x4b4773124118e7D946EE5Beea6650De19cdbA60a' },
        { name: 'SELLERTEST', address: '0x1c09D675F9De482835CF579c7CF250Df54FEd4D0' },
      ];

const chain = defineChain({
  id: CHAIN_ID,
  name: 'Pagine Azzurre',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const client = createPublicClient({ chain, transport: http(RPC_URL) });
const abi = parseAbi(['function balanceOf(address) view returns (uint256)']);

console.log(`RPC      ${RPC_URL}`);
console.log(`chain    ${CHAIN_ID}`);
console.log(`contract ${CONTRACT}`);
console.log('');
console.log('wallet                                     │ VLZ        │ ETH');
console.log('───────────────────────────────────────────┼────────────┼──────────────');

for (const { name, address } of wallets) {
  try {
    const [vlz, eth] = await Promise.all([
      client.readContract({
        address: CONTRACT,
        abi,
        functionName: 'balanceOf',
        args: [address],
      }),
      client.getBalance({ address }),
    ]);
    const vlzNum = (Number(vlz) / 100).toFixed(2);
    const ethNum = formatEther(eth);
    console.log(
      `${address} │ ${vlzNum.padStart(10)} │ ${ethNum.padEnd(14)} (${name})`
    );
  } catch (err) {
    console.log(`${address} │ ERROR: ${err.shortMessage || err.message}`);
  }
}
