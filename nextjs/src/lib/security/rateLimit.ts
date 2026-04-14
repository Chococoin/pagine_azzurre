import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';

// Mongo-backed fixed-window rate limiter.
//
// Storage: a `rate_limits` collection, one doc per (key, window) tuple:
//   { key: "<bucket>:<windowStartMs>", count, windowStart, expiresAt }
// A TTL index on `expiresAt` garbage-collects expired windows automatically.
// We create the TTL index lazily the first time any limiter runs.

interface RateLimitDoc {
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

let ttlIndexPromise: Promise<unknown> | null = null;

function getCollection() {
  const conn = mongoose.connection;
  if (!conn || conn.readyState !== 1 || !conn.db) {
    throw new Error('rateLimit: mongoose connection not ready');
  }
  return conn.db.collection<RateLimitDoc>('rate_limits');
}

async function ensureIndex() {
  if (!ttlIndexPromise) {
    ttlIndexPromise = getCollection()
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .catch((err) => {
        // Reset so a transient failure doesn't permanently poison the limiter.
        ttlIndexPromise = null;
        throw err;
      });
  }
  return ttlIndexPromise;
}

export interface RateLimitConfig {
  /** Logical bucket name, e.g. "signin" or "password-recovery". */
  bucket: string;
  /** Max requests per window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Count after this request was counted. */
  count: number;
  /** When the current window ends (ms since epoch). */
  resetAt: number;
  /** Remaining slots (>= 0). */
  remaining: number;
}

/**
 * Atomically increment the counter for (bucket, identifier) in the current
 * window. Returns whether the request is under the limit.
 */
export async function consumeRateLimit(
  config: RateLimitConfig,
  identifier: string
): Promise<RateLimitResult> {
  await connectDB();
  await ensureIndex();

  const now = Date.now();
  const windowStartMs = now - (now % config.windowMs);
  const windowEndMs = windowStartMs + config.windowMs;
  const compositeKey = `${config.bucket}:${identifier}:${windowStartMs}`;

  const col = getCollection();
  const updated = await col.findOneAndUpdate(
    { key: compositeKey },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        windowStart: new Date(windowStartMs),
        expiresAt: new Date(windowEndMs + config.windowMs), // keep past the window
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  // findOneAndUpdate with upsert+returnDocument:'after' always yields a doc.
  const count = updated?.count ?? 1;

  return {
    ok: count <= config.limit,
    count,
    resetAt: windowEndMs,
    remaining: Math.max(0, config.limit - count),
  };
}

/** Extracts the client IP from a NextRequest, falling back to "unknown". */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

/** Builds a standard 429 response with Retry-After. */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { message: 'Troppe richieste. Riprova più tardi.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}

/**
 * Convenience wrapper: run all the given limiters. If any of them is over,
 * respond 429 immediately. Otherwise return null so the caller continues.
 */
export async function enforceRateLimits(
  checks: Array<{ config: RateLimitConfig; identifier: string }>
): Promise<NextResponse | null> {
  for (const { config, identifier } of checks) {
    const result = await consumeRateLimit(config, identifier);
    if (!result.ok) return rateLimitResponse(result);
  }
  return null;
}
