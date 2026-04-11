#!/usr/bin/env node
/**
 * Standalone S3 upload probe.
 *
 * Usage (from the nextjs/ directory):
 *   node scripts/test-s3.mjs
 *
 * It loads the same env vars the production endpoint uses, does an
 * anonymous HEAD to discover the real bucket region, then attempts a
 * small PutObject with those credentials. Verbose output so we can see
 * exactly why uploads fail without having to redeploy.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  GetBucketPolicyCommand,
  GetPublicAccessBlockCommand,
  PutPublicAccessBlockCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nextjsRoot = resolve(__dirname, '..');

// ── tiny .env parser so we don't depend on next/dotenv ────────────────────
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
      // Strip quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Unescape \n literal → actual newline? No — we actually want
      // to preserve whatever was there so we can see whitespace bugs.
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* file missing is fine */
  }
}

// Mirror Next.js loading order: .env.local overrides .env
loadEnvFile(resolve(nextjsRoot, '.env'));
loadEnvFile(resolve(nextjsRoot, '.env.local'));

const env = (key, fallback = '') => (process.env[key] ?? fallback).trim();

const rawRegion = process.env.AWS_REGION ?? '';
const rawKey = process.env.S3_KEY_ID ?? '';
const rawSecret = process.env.S3_ACCESS_KEY ?? '';
const rawBucket = process.env.S3_BUCKET_NAME ?? '';

const region = env('AWS_REGION', 'eu-west-1');
const bucket = env('S3_BUCKET_NAME', 'pagineazzurre2');
const keyId = env('S3_KEY_ID');
const secret = env('S3_ACCESS_KEY');

const mask = (v) => (v ? `${v.slice(0, 4)}…${v.slice(-4)} (len ${v.length})` : '(empty)');

console.log('─── env snapshot ─────────────────────────────────────────────');
console.log(`AWS_REGION       raw: ${JSON.stringify(rawRegion)} → trimmed: ${JSON.stringify(region)}`);
console.log(`S3_BUCKET_NAME   raw: ${JSON.stringify(rawBucket)} → trimmed: ${JSON.stringify(bucket)}`);
console.log(`S3_KEY_ID        ${mask(keyId)} (raw len ${rawKey.length})`);
console.log(`S3_ACCESS_KEY    ${mask(secret)} (raw len ${rawSecret.length})`);
console.log('');

if (!keyId || !secret) {
  console.error('❌ Missing S3 credentials — aborting.');
  process.exit(1);
}

// ── 1. Anonymous HEAD to discover the actual bucket region ───────────────
console.log('─── bucket region probe ───────────────────────────────────────');
try {
  const res = await fetch(`https://${bucket}.s3.amazonaws.com`, { method: 'HEAD' });
  const reported = res.headers.get('x-amz-bucket-region');
  console.log(`HTTP ${res.status} — x-amz-bucket-region: ${reported ?? '(missing)'}`);
  if (reported && reported !== region) {
    console.log(
      `⚠  Env region (${region}) does not match bucket region (${reported}). ` +
        `The SDK will be pointed at the reported region for the test.`
    );
  }
  console.log('');
} catch (err) {
  console.log(`⚠  Region probe failed: ${err.message}\n`);
}

// Re-read the region after the probe so we can retry with what S3 reports
async function discoverRegion() {
  try {
    const res = await fetch(`https://${bucket}.s3.amazonaws.com`, { method: 'HEAD' });
    return res.headers.get('x-amz-bucket-region') || region;
  } catch {
    return region;
  }
}

const effectiveRegion = await discoverRegion();

console.log('─── PutObject attempt ────────────────────────────────────────');
console.log(`using region=${effectiveRegion}, bucket=${bucket}`);

const s3 = new S3Client({
  region: effectiveRegion,
  credentials: { accessKeyId: keyId, secretAccessKey: secret },
});

const key = `test-uploads/probe-${Date.now()}.txt`;
const body = Buffer.from(`s3 probe at ${new Date().toISOString()}\n`, 'utf8');

try {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'text/plain',
    })
  );
  console.log(`✅ PutObject OK → https://${bucket}.s3.${effectiveRegion}.amazonaws.com/${key}`);
} catch (err) {
  console.error(`❌ PutObject failed: ${err.name}: ${err.message}`);
  if (err.$metadata) console.error(`   metadata: ${JSON.stringify(err.$metadata)}`);
  process.exit(2);
}

// ── 3. HeadBucket probe to sanity-check region+creds ─────────────────────
console.log('');
console.log('─── HeadBucket probe ─────────────────────────────────────────');
try {
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log('✅ HeadBucket OK');
} catch (err) {
  console.error(`❌ HeadBucket failed: ${err.name}: ${err.message}`);
}

// ── 4. Public read test: hit the uploaded file anonymously ──────────────
console.log('');
console.log('─── Public GET probe ─────────────────────────────────────────');
const publicUrl = `https://${bucket}.s3.${effectiveRegion}.amazonaws.com/${key}`;
try {
  const res = await fetch(publicUrl, { method: 'HEAD' });
  console.log(`HEAD ${publicUrl} → HTTP ${res.status}`);
  if (res.status === 200) {
    console.log('✅ Bucket serves objects publicly.');
  } else if (res.status === 403) {
    console.log('❌ 403 — the bucket does NOT allow anonymous GetObject.');
    console.log('   Product images will never load in the browser until this is fixed.');
  } else {
    console.log(`⚠  Unexpected status ${res.status}`);
  }
} catch (err) {
  console.error(`⚠  Public GET probe threw: ${err.message}`);
}

// ── 5. Inspect Block Public Access and bucket policy ────────────────────
console.log('');
console.log('─── Block Public Access config ──────────────────────────────');
try {
  const res = await s3.send(new GetPublicAccessBlockCommand({ Bucket: bucket }));
  const cfg = res.PublicAccessBlockConfiguration ?? {};
  console.log(
    `BlockPublicAcls: ${cfg.BlockPublicAcls} | IgnorePublicAcls: ${cfg.IgnorePublicAcls} | ` +
      `BlockPublicPolicy: ${cfg.BlockPublicPolicy} | RestrictPublicBuckets: ${cfg.RestrictPublicBuckets}`
  );
  if (cfg.BlockPublicPolicy) {
    console.log('❌ BlockPublicPolicy is TRUE → no public bucket policy can be set.');
  }
  if (cfg.RestrictPublicBuckets) {
    console.log('❌ RestrictPublicBuckets is TRUE → even a valid public policy is ignored.');
  }
} catch (err) {
  console.log(`ℹ  GetPublicAccessBlock: ${err.name}: ${err.message}`);
  if (err.name === 'NoSuchPublicAccessBlockConfiguration') {
    console.log('   → no block config set (default is "block all" on new buckets).');
  }
}

console.log('');
console.log('─── Current bucket policy ────────────────────────────────────');
try {
  const res = await s3.send(new GetBucketPolicyCommand({ Bucket: bucket }));
  console.log(res.Policy);
} catch (err) {
  console.log(`ℹ  GetBucketPolicy: ${err.name}: ${err.message}`);
  if (err.name === 'NoSuchBucketPolicy') {
    console.log('   → bucket has no policy at all.');
  }
}

// ── 6. Try to fix it automatically if --fix is passed ───────────────────
if (process.argv.includes('--fix')) {
  console.log('');
  console.log('─── --fix: unblock public policy + install read policy ──────');
  const publicReadPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowPublicReadOfProductImages',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${bucket}/*`,
      },
    ],
  };

  try {
    await s3.send(
      new PutPublicAccessBlockCommand({
        Bucket: bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: false,
          RestrictPublicBuckets: false,
        },
      })
    );
    console.log('✅ PublicAccessBlock relaxed (ACLs still blocked, policies now allowed).');
  } catch (err) {
    console.error(`❌ PutPublicAccessBlock failed: ${err.name}: ${err.message}`);
  }

  try {
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify(publicReadPolicy),
      })
    );
    console.log('✅ Public-read bucket policy installed.');
  } catch (err) {
    console.error(`❌ PutBucketPolicy failed: ${err.name}: ${err.message}`);
  }

  // Verify
  try {
    const res = await fetch(publicUrl, { method: 'HEAD' });
    console.log(`Re-test HEAD → HTTP ${res.status}`);
  } catch (err) {
    console.log(`Re-test threw: ${err.message}`);
  }
}
