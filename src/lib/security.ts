/**
 * Security Middleware for AeroAssist API routes
 * Provides: Rate Limiting, CORS, Zod Validation, Security Headers
 * Adapted for Next.js API Routes (not Express middleware)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import logger, { logSecurityEvent } from './logger';

// ── In-Memory Rate Limiter ───────────────────────────────────────
// In production, replace with Redis-backed rate limiting

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blocked: boolean;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt + 60000) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;    // Max requests per window
  blockDurationMs: number; // How long to block after exceeding
  keyGenerator?: (req: NextRequest) => string;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 100,
  blockDurationMs: 15 * 60 * 1000, // Block for 15 min
};

const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,       // 1 minute
  maxRequests: 20,
  blockDurationMs: 5 * 60 * 1000, // Block for 5 min
};

const WEBHOOK_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,       // 1 minute
  maxRequests: 200,           // WhatsApp can send many webhooks
  blockDurationMs: 60 * 1000, // Block for 1 min
};

/**
 * Check rate limit for a request.
 * Returns { allowed: boolean, remaining: number, retryAfterMs?: number }
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const keyGenerator = config.keyGenerator || ((req: NextRequest) => {
    // Use IP + endpoint as key
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return `${ip}:${req.nextUrl.pathname}`;
  });

  const key = keyGenerator(request);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs, blocked: false };
    rateLimitStore.set(key, entry);
  }

  if (entry.blocked && now < entry.resetAt + config.blockDurationMs) {
    const retryAfterMs = entry.resetAt + config.blockDurationMs - now;
    logSecurityEvent('rate_limit_blocked', { key: key.slice(0, 30), retryAfterMs });
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    entry.blocked = true;
    const retryAfterMs = config.blockDurationMs;
    logSecurityEvent('rate_limit_exceeded', { key: key.slice(0, 30), count: entry.count });
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count };
}

/**
 * Apply rate limit to a request. Returns 429 response if exceeded.
 */
export function applyRateLimit(
  request: NextRequest,
  config?: RateLimitConfig
): NextResponse | null {
  const result = checkRateLimit(request, config);
  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: Math.ceil((result.retryAfterMs || 60000) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.retryAfterMs || 60000) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // Return null to indicate the request is allowed
  return null;
}

// ── Security Headers ─────────────────────────────────────────────

/**
 * Returns security headers for responses (equivalent to Helmet for Express)
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://graph.facebook.com https://api.groq.com https://*.s3.amazonaws.com;",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
  };
}

/**
 * Apply security headers to a NextResponse
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  const headers = getSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

// ── CORS Handler ─────────────────────────────────────────────────

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);

export function handleCors(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const origin = request.headers.get('origin') || '';

  if (ALLOWED_ORIGINS.length > 0) {
    if (ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
  } else {
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Hub-Signature-256');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

// ── Zod Validation Helper ────────────────────────────────────────

/**
 * Validate already-parsed body with Zod schema.
 */
export function validateBodyWithParsed<T>(
  body: unknown,
  schema: ZodSchema<T>
): {
  success: true;
  data: T;
} | {
  success: false;
  response: NextResponse;
} {
  const result = schema.safeParse(body);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    logSecurityEvent('validation_failed', {
      fields: issues.map((i) => i.field),
    });

    return {
      success: false,
      response: NextResponse.json(
        { error: 'Validation failed', details: issues },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

// ── IP Extraction ────────────────────────────────────────────────

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

// ── Request Timing Helper ────────────────────────────────────────

export function startTimer(): () => number {
  const start = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - start) / 1_000_000; // returns ms
}

// ── Exported rate limit configs for reuse ────────────────────────

export { DEFAULT_RATE_LIMIT, STRICT_RATE_LIMIT, WEBHOOK_RATE_LIMIT };
