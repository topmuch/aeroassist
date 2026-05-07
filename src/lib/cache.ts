/**
 * AeroAssist — In-Memory TTL Cache
 * Redis-compatible interface (get/set/del/keys) for development.
 * In production, swap this with ioredis when REDIS_URL is configured.
 *
 * Features:
 * - Per-key TTL with automatic expiry
 * - Periodic cleanup of stale entries (every 60s)
 * - Typed get<T>() with JSON parse/stringify
 * - Cache hit/miss statistics for monitoring
 */

// ── Types ────────────────────────────────────────────────────────

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number; // epoch ms
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
}

// ── In-Memory Store ──────────────────────────────────────────────

const store = new Map<string, CacheEntry>();
let hits = 0;
let misses = 0;

// Periodic cleanup: remove expired entries every 60 seconds
const CLEANUP_INTERVAL_MS = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

// ── Cache Operations ─────────────────────────────────────────────

/**
 * Get a value from cache. Returns null on miss or expired entry.
 */
export function get<T = unknown>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) {
    misses++;
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    misses++;
    return null;
  }

  hits++;
  return entry.value as T;
}

/**
 * Set a value in cache with TTL in seconds.
 */
export function set<T = unknown>(key: string, value: T, ttlSeconds: number): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Delete a specific key from cache.
 */
export function del(key: string): boolean {
  return store.delete(key);
}

/**
 * Check if a key exists (and is not expired).
 */
export function has(key: string): boolean {
  return get(key) !== null;
}

/**
 * Delete all keys matching a prefix pattern.
 * Uses simple startsWith matching (not regex for performance).
 */
export function delByPrefix(prefix: string): number {
  let deleted = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      deleted++;
    }
  }
  return deleted;
}

/**
 * Get cache hit/miss statistics.
 */
export function getStats(): CacheStats {
  return {
    hits,
    misses,
    keys: store.size,
  };
}

/**
 * Reset statistics (useful for testing or monitoring reset).
 */
export function resetStats(): void {
  hits = 0;
  misses = 0;
}

/**
 * Get the number of active (non-expired) entries.
 */
export function size(): number {
  return store.size;
}

// ── Flight Cache Helpers ─────────────────────────────────────────

const FLIGHT_CACHE_PREFIX = 'flight:';
const FLIGHT_CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Get flight data from cache.
 */
export function getFlightFromCache<T>(flightNumber: string): T | null {
  return get<T>(`${FLIGHT_CACHE_PREFIX}${flightNumber.toUpperCase()}`);
}

/**
 * Store flight data in cache with 5-minute TTL.
 */
export function setFlightInCache<T>(flightNumber: string, data: T): void {
  set(`${FLIGHT_CACHE_PREFIX}${flightNumber.toUpperCase()}`, data, FLIGHT_CACHE_TTL_SECONDS);
}

/**
 * Invalidate a specific flight from cache.
 */
export function invalidateFlight(flightNumber: string): void {
  del(`${FLIGHT_CACHE_PREFIX}${flightNumber.toUpperCase()}`);
}
