#!/usr/bin/env node
/**
 * Fund a test user with VLZ + ETH so they can run through the
 * pay→deliver flow without running out of balance.
 *
 * Usage:
 *   node scripts/fund-test-user.mjs 0xWalletAddr [vlzAmount] [ethAmount]
 *
 * Defaults: 100 VLZ, 0.05 ETH.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createWalletClient,
  defineChain,
  http,
  parseAbi,
  parseEther,
  formatEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

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
const CONTRACT = env(
  'NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS',
  '0x5FbDB2315678afecb367f032d93F642f64180aa3'
);
const ADMIN_KEY = env('ADMIN_PRIVATE_KEY');

const recipient = process.argv[2];
if (!recipient || !recipient.startsWith('0x')) {
  console.error('Usage: node scripts/fund-test-user.mjs 0xWalletAddr [vlz] [eth]');
  process.exit(1);
}
const vlzWhole = Number(process.argv[3] ?? 100);
const ethWhole = process.argv[4] ?? '0.05';

const chain = defineChain({
  id: CHAIN_ID,
  name: 'Pagine Azzurre',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const account = privateKeyToAccount(ADMIN_KEY);
const wallet = createWalletClient({ account, chain, transport: http(RPC_URL) });
const abi = parseAbi(['function mint(address to, uint256 value) public']);

console.log(`admin   → ${account.address}`);
console.log(`target  → ${recipient}`);
console.log(`mint    → ${vlzWhole} VLZ`);
console.log(`fund    → ${ethWhole} ETH`);
console.log('');

try {
  const mintHash = await wallet.writeContract({
    address: CONTRACT,
    abi,
    functionName: 'mint',
    args: [recipient, BigInt(vlzWhole * 100)], // 2 decimals
  });
  console.log(`✅ mint  tx: ${mintHash}`);
} catch (err) {
  console.error(`❌ mint failed: ${err.shortMessage || err.message}`);
}

try {
  const ethHash = await wallet.sendTransaction({
    to: recipient,
    value: parseEther(ethWhole),
  });
  console.log(`✅ ether tx: ${ethHash} (${formatEther(parseEther(ethWhole))} ETH)`);
} catch (err) {
  console.error(`❌ ether failed: ${err.shortMessage || err.message}`);
}
