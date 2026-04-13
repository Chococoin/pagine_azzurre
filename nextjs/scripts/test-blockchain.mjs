#!/usr/bin/env node
/**
 * Standalone blockchain probe.
 *
 * Usage (from the nextjs/ directory):
 *   node scripts/test-blockchain.mjs
 *
 * Loads the same env vars used by /api/users/verification, then:
 *   1. Snapshots and trims them.
 *   2. Calls the RPC for chain id, block number, and admin balance.
 *   3. Reads the token contract code (to confirm it actually exists).
 *   4. Optionally mints a tiny amount of VLZ to a test recipient and
 *      sends a tiny amount of ETH for gas (only when --mint is passed).
 *
 * No state changes happen unless --mint is explicitly provided.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  defineChain,
  formatEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nextjsRoot = resolve(__dirname, '..');

// ── tiny .env loader ─────────────────────────────────────────────────────
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
  } catch {
    /* file missing is fine */
  }
}

// Next.js gives .env.local precedence over .env. Our loader only writes
// keys that are not yet set, so we have to load the higher-priority file
// first.
loadEnvFile(resolve(nextjsRoot, '.env.local'));
loadEnvFile(resolve(nextjsRoot, '.env'));

const env = (key, fallback = '') => (process.env[key] ?? fallback).trim();

const rawRpc = process.env.NEXT_PUBLIC_RPC_URL ?? '';
const rawChain = process.env.NEXT_PUBLIC_CHAIN_ID ?? '';
const rawContract = process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS ?? '';
const rawAdminKey = process.env.ADMIN_PRIVATE_KEY ?? '';
const rawAdminAddr = process.env.ADMIN_WALLET_ADDRESS ?? '';

const RPC_URL = env('NEXT_PUBLIC_RPC_URL', 'http://localhost:8545');
const CHAIN_ID = Number(env('NEXT_PUBLIC_CHAIN_ID', '31337'));
const CONTRACT_ADDRESS = env(
  'NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS',
  '0x5FbDB2315678afecb367f032d93F642f64180aa3'
);
const ADMIN_PRIVATE_KEY = env('ADMIN_PRIVATE_KEY');
const ADMIN_WALLET_ADDRESS = env(
  'ADMIN_WALLET_ADDRESS',
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
);

const mask = (v) => (v ? `${v.slice(0, 6)}…${v.slice(-4)} (len ${v.length})` : '(empty)');

console.log('─── env snapshot ─────────────────────────────────────────────');
console.log(`NEXT_PUBLIC_RPC_URL                raw=${JSON.stringify(rawRpc)}`);
console.log(`NEXT_PUBLIC_CHAIN_ID               raw=${JSON.stringify(rawChain)} → ${CHAIN_ID}`);
console.log(`NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS raw=${JSON.stringify(rawContract)}`);
console.log(`ADMIN_WALLET_ADDRESS               raw=${JSON.stringify(rawAdminAddr)}`);
console.log(`ADMIN_PRIVATE_KEY                  ${mask(ADMIN_PRIVATE_KEY)} (raw len ${rawAdminKey.length})`);
console.log('');

if (!ADMIN_PRIVATE_KEY) {
  console.error('❌ ADMIN_PRIVATE_KEY is empty.');
  process.exit(1);
}

if (!ADMIN_PRIVATE_KEY.startsWith('0x')) {
  console.error('❌ ADMIN_PRIVATE_KEY must start with "0x".');
  process.exit(1);
}

// ── chain + clients ──────────────────────────────────────────────────────
const chain = defineChain({
  id: CHAIN_ID,
  name: 'Pagine Azzurre',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });

const VALAZCO_ABI = parseAbi([
  'function mint(address to, uint256 value) public',
  'function transfer(address to, uint256 value) public returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
]);

// ── 1. Plain JSON-RPC eth_chainId / eth_blockNumber ──────────────────────
console.log('─── RPC connectivity ─────────────────────────────────────────');
async function jsonRpc(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.code} ${json.error.message}`);
  return json.result;
}

let reportedChainId;
try {
  const hexChain = await jsonRpc('eth_chainId');
  reportedChainId = parseInt(hexChain, 16);
  console.log(`eth_chainId         → 0x${reportedChainId.toString(16)} (${reportedChainId})`);
  if (reportedChainId !== CHAIN_ID) {
    console.log(
      `⚠  CHAIN_ID mismatch: env says ${CHAIN_ID}, RPC reports ${reportedChainId}.`
    );
    console.log(`   Update NEXT_PUBLIC_CHAIN_ID to ${reportedChainId} or you'll get`);
    console.log(`   "chain_id mismatch" failures from viem.`);
  }
} catch (err) {
  console.error(`❌ eth_chainId failed: ${err.message}`);
  console.error('   The RPC URL is unreachable or returning errors. Stop here.');
  process.exit(2);
}

try {
  const hexBlock = await jsonRpc('eth_blockNumber');
  console.log(`eth_blockNumber     → ${parseInt(hexBlock, 16)}`);
} catch (err) {
  console.error(`⚠  eth_blockNumber failed: ${err.message}`);
}

// ── 2. Admin wallet address derivation ──────────────────────────────────
console.log('');
console.log('─── admin wallet ─────────────────────────────────────────────');

let adminAccount;
try {
  adminAccount = privateKeyToAccount(ADMIN_PRIVATE_KEY);
} catch (err) {
  console.error(`❌ ADMIN_PRIVATE_KEY is not a valid private key: ${err.message}`);
  process.exit(2);
}

console.log(`derived address     → ${adminAccount.address}`);
console.log(`env ADMIN_WALLET    → ${ADMIN_WALLET_ADDRESS}`);

if (
  ADMIN_WALLET_ADDRESS &&
  adminAccount.address.toLowerCase() !== ADMIN_WALLET_ADDRESS.toLowerCase()
) {
  console.log(
    '⚠  ADMIN_WALLET_ADDRESS does not match the address derived from'
  );
  console.log('   ADMIN_PRIVATE_KEY. Mints will be signed by the derived');
  console.log('   address, so make sure that is the one with mint rights.');
}

try {
  const adminBalance = await publicClient.getBalance({ address: adminAccount.address });
  console.log(`admin ETH balance   → ${formatEther(adminBalance)} ETH`);
  if (adminBalance === 0n) {
    console.log('❌ Admin wallet has 0 ETH — it cannot pay for gas to mint or fund users.');
  }
} catch (err) {
  console.error(`⚠  getBalance failed: ${err.message}`);
}

// ── 3. Token contract sanity ────────────────────────────────────────────
console.log('');
console.log('─── token contract ───────────────────────────────────────────');
console.log(`contract address    → ${CONTRACT_ADDRESS}`);

try {
  const code = await publicClient.getCode({ address: CONTRACT_ADDRESS });
  if (!code || code === '0x') {
    console.error('❌ No bytecode at this address on the current chain.');
    console.error('   Either the contract is not deployed here or the address is wrong.');
    process.exit(2);
  }
  console.log(`bytecode size       → ${(code.length - 2) / 2} bytes`);
} catch (err) {
  console.error(`❌ getCode failed: ${err.message}`);
  process.exit(2);
}

async function tryRead(label, functionName, args = []) {
  try {
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: VALAZCO_ABI,
      functionName,
      args,
    });
    console.log(`${label.padEnd(20)}→ ${result}`);
    return result;
  } catch (err) {
    console.log(`${label.padEnd(20)}→ ⚠ ${err.shortMessage || err.message}`);
    return undefined;
  }
}

await tryRead('name()', 'name');
await tryRead('symbol()', 'symbol');
await tryRead('decimals()', 'decimals');
await tryRead('totalSupply()', 'totalSupply');
await tryRead('balanceOf(admin)', 'balanceOf', [adminAccount.address]);

// ── 4. Optional: real mint + gas fund (only with --mint) ─────────────────
if (process.argv.includes('--mint')) {
  console.log('');
  console.log('─── --mint: write txs ────────────────────────────────────────');

  const recipient =
    process.argv
      .find((arg) => arg.startsWith('--to='))
      ?.slice('--to='.length) || adminAccount.address;
  console.log(`recipient → ${recipient}`);

  const walletClient = createWalletClient({
    account: adminAccount,
    chain,
    transport: http(RPC_URL),
  });

  // Mint 1 VLZ (with 2 decimals = 100)
  try {
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: VALAZCO_ABI,
      functionName: 'mint',
      args: [recipient, 100n],
    });
    console.log(`✅ mint tx submitted: ${hash}`);
  } catch (err) {
    console.error(`❌ mint failed: ${err.shortMessage || err.message}`);
  }

  // Send 0.001 ETH for gas
  try {
    const hash = await walletClient.sendTransaction({
      to: recipient,
      value: 1_000_000_000_000_000n, // 0.001 ETH
    });
    console.log(`✅ gas transfer tx submitted: ${hash}`);
  } catch (err) {
    console.error(`❌ gas transfer failed: ${err.shortMessage || err.message}`);
  }
}

console.log('');
console.log('Done.');
