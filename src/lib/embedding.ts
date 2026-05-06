/**
 * AeroAssist — Embedding Service
 * Generates 384-dimensional vector embeddings for RAG retrieval.
 *
 * Strategy:
 * - Development (NODE_ENV != production): Uses hash_fallback by default (fast, no API needed)
 * - Production (NODE_ENV == production): Uses real Groq embeddings via z-ai-web-dev-sdk.
 *   If the API fails, an error is thrown — no silent fallback in production.
 *
 * Cache: In-memory Map with 7-day TTL eviction.
 * All vectors are L2-normalized for cosine similarity search.
 */

import logger from './logger';

// ── Types ────────────────────────────────────────────────────────

export interface EmbeddingResult {
  embedding: number[];
  dimension: number;
  normalized: boolean;
  method: 'pgvector' | 'hash_fallback';
  timeMs: number;
}

interface CacheEntry {
  vector: number[];
  timestamp: number;
  model: string;
}

// ── Constants ────────────────────────────────────────────────────

const EMBEDDING_DIMENSION = 384;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 5000;
const isProduction = process.env.NODE_ENV === 'production';
const isPostgres = process.env.DATABASE_URL?.startsWith('postgres') || false;

const GROQ_EMBEDDING_MODEL =
  process.env.GROQ_EMBEDDING_MODEL || 'all-MiniLM-L6-v2';
const GROQ_EMBEDDING_TIMEOUT_MS = parseInt(
  process.env.GROQ_EMBEDDING_TIMEOUT_MS || '3000',
  10
);
const GROQ_EMBEDDING_RETRIES = parseInt(
  process.env.GROQ_EMBEDDING_RETRIES || '2',
  10
);

// ── TTL-based In-Memory Cache ───────────────────────────────────

const embeddingCache = new Map<string, CacheEntry>();

function evictExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of embeddingCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      embeddingCache.delete(key);
    }
  }
}

function getFromCache(key: string): number[] | null {
  evictExpiredEntries();
  const entry = embeddingCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    embeddingCache.delete(key);
    return null;
  }
  return entry.vector;
}

function setCacheEntry(key: string, vector: number[], model: string): void {
  // Enforce max cache size with FIFO eviction
  if (embeddingCache.size >= MAX_CACHE_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) embeddingCache.delete(firstKey);
  }
  embeddingCache.set(key, { vector, timestamp: Date.now(), model });
}

// ── Simple Hash Function (no crypto dependency) ────────────────

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

// ── MurmurHash3 (32-bit) for deterministic hashing ──────────────

function murmurhash3(key: string, seed = 0): number {
  let h1 = seed >>> 0;
  const bytes = Buffer.from(key, 'utf8');

  for (let i = 0; i < bytes.length; i++) {
    h1 = Math.imul(h1 ^ bytes[i], 0xcc9e2d51);
    h1 = (h1 << 15) | (h1 >>> 17);
    h1 = Math.imul(h1, 0x1b873593);
  }

  h1 ^= bytes.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

// ── L2 Normalization ────────────────────────────────────────────

/**
 * L2-normalizes a vector so its magnitude equals 1.
 * Required for cosine similarity via dot product on HNSW index (m=16, ef_construction=64).
 */
export function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec;
  return vec.map((v) => v / magnitude);
}

// ── Hash-based Pseudo-Embedding (Dev Fallback) ─────────────────

/**
 * Generates a deterministic pseudo-embedding using hash distribution.
 * This is NOT a real semantic embedding — used only in development
 * for fast iteration without requiring an API key.
 */
function generateHashEmbedding(text: string): number[] {
  const vec = new Array(EMBEDDING_DIMENSION).fill(0);
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Tokenize into words and bigrams
  const words = normalized.split(/\s+/).filter((w) => w.length > 1);
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]}_${words[i + 1]}`);
  }
  const trigrams: string[] = [];
  for (let i = 0; i < words.length - 2; i++) {
    trigrams.push(`${words[i]}_${words[i + 1]}_${words[i + 2]}`);
  }

  const allTokens = [...words, ...bigrams, ...trigrams];

  // Distribute each token across multiple dimensions using hashing
  for (const token of allTokens) {
    const hash1 = murmurhash3(token, 0);
    const hash2 = murmurhash3(token, hash1);
    const hash3 = murmurhash3(token, hash2);

    // Each token contributes to 8 random dimensions
    for (let i = 0; i < 8; i++) {
      const h1 = (hash1 + i * 7919) % EMBEDDING_DIMENSION;
      const h2 = (hash2 + i * 104729) % EMBEDDING_DIMENSION;
      const h3 = (hash3 + i * 15485863) % EMBEDDING_DIMENSION;

      // Hash-based value between -1 and 1
      const val1 = ((hash1 >> (i * 4)) & 0xFF) / 127.5 - 1;
      const val2 = ((hash2 >> (i * 4)) & 0xFF) / 127.5 - 1;
      const val3 = ((hash3 >> (i * 4)) & 0xFF) / 127.5 - 1;

      vec[h1] += val1 / Math.sqrt(allTokens.length);
      vec[h2] += val2 / Math.sqrt(allTokens.length);
      vec[h3] += val3 / Math.sqrt(allTokens.length);
    }
  }

  // Add position-aware features
  const charNgrams = getCharNgrams(normalized, 3);
  for (const ngram of charNgrams) {
    const h = murmurhash3(`char_${ngram}`, 42) % EMBEDDING_DIMENSION;
    vec[h] += 0.3 / Math.sqrt(charNgrams.length);
  }

  return normalizeVector(vec);
}

function getCharNgrams(text: string, n: number): string[] {
  const result: string[] = [];
  for (let i = 0; i <= text.length - n; i++) {
    result.push(text.slice(i, i + n));
  }
  return result;
}

// ── Groq Embedding via z-ai-web-dev-sdk ─────────────────────────

/**
 * Calls the Groq embeddings API via z-ai-web-dev-sdk with retry logic.
 * Returns a real 384-dim semantic embedding for the given text.
 *
 * @throws Error if the API fails after all retries (no fallback).
 */
async function generateGroqEmbedding(text: string): Promise<number[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= GROQ_EMBEDDING_RETRIES; attempt++) {
    if (attempt > 0) {
      // 500ms backoff between retries
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    try {
      // Dynamic import to avoid Turbopack issues
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = ZAI.create();

      const result = await Promise.race([
        zai.embeddings.create({
          input: text,
          model: GROQ_EMBEDDING_MODEL,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Groq embedding timed out after ${GROQ_EMBEDDING_TIMEOUT_MS}ms`)),
            GROQ_EMBEDDING_TIMEOUT_MS
          )
        ),
      ]);

      const embedding = (result as { data: Array<{ embedding: number[] }> }).data?.[0]?.embedding;

      if (!embedding || embedding.length === 0) {
        throw new Error('Empty embedding response from Groq API');
      }

      if (embedding.length !== EMBEDDING_DIMENSION) {
        logger.warn('Groq embedding dimension mismatch', {
          expected: EMBEDDING_DIMENSION,
          received: embedding.length,
          model: GROQ_EMBEDDING_MODEL,
        });
      }

      // Truncate or pad to exact dimension
      const vec = embedding.slice(0, EMBEDDING_DIMENSION);
      while (vec.length < EMBEDDING_DIMENSION) vec.push(0);

      return normalizeVector(vec);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`Groq embedding attempt ${attempt + 1} failed`, {
        attempt: attempt + 1,
        maxRetries: GROQ_EMBEDDING_RETRIES + 1,
        error: lastError.message,
        model: GROQ_EMBEDDING_MODEL,
      });
    }
  }

  // All retries exhausted — throw in production, fallback in dev
  throw new Error(
    `Groq embeddings API failed after ${GROQ_EMBEDDING_RETRIES + 1} attempts: ${lastError?.message}`
  );
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Generate an embedding for the given text.
 *
 * - Development: Uses hash_fallback by default (fast, no API needed).
 * - Production: Uses real Groq embeddings via z-ai-web-dev-sdk.
 *   If the API fails, an error is thrown.
 *
 * Cache: In-memory with 7-day TTL. Skipped when forceRefresh=true.
 *
 * @param text - The text to embed (max ~8000 tokens)
 * @param forceRefresh - Skip cache and regenerate
 * @returns EmbeddingResult with the 384-dim vector
 */
export async function generateEmbedding(
  text: string,
  forceRefresh = false
): Promise<EmbeddingResult> {
  const start = Date.now();
  const cacheKey = simpleHash(text).slice(0, 16);

  // Check cache
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      const latency = Date.now() - start;
      logger.info('embedding.generated', {
        model: 'cached',
        dim: EMBEDDING_DIMENSION,
        cache_hit: true,
        latency_ms: latency,
      });
      return {
        embedding: cached,
        dimension: EMBEDDING_DIMENSION,
        normalized: true,
        method: isPostgres ? 'pgvector' : 'hash_fallback',
        timeMs: latency,
      };
    }
  }

  // Generate embedding based on environment
  let vector: number[];
  let method: EmbeddingResult['method'];

  if (isProduction) {
    // ── Production: Real Groq embeddings ONLY ──────────────────
    vector = await generateGroqEmbedding(text);
    method = 'pgvector';
  } else {
    // ── Development: Hash fallback (fast, no API needed) ──────
    vector = generateHashEmbedding(text);
    method = 'hash_fallback';
  }

  const latency = Date.now() - start;

  // Always L2-normalize before returning
  vector = normalizeVector(vector);

  // Update cache
  const model = isProduction ? GROQ_EMBEDDING_MODEL : 'hash_fallback';
  setCacheEntry(cacheKey, vector, model);

  logger.info('embedding.generated', {
    model,
    dim: EMBEDDING_DIMENSION,
    cache_hit: false,
    latency_ms: latency,
  });

  return {
    embedding: vector,
    dimension: EMBEDDING_DIMENSION,
    normalized: true,
    method,
    timeMs: latency,
  };
}

/**
 * Generate embeddings for multiple texts in batch.
 */
export async function generateEmbeddingBatch(
  texts: string[]
): Promise<EmbeddingResult[]> {
  return Promise.all(texts.map((t) => generateEmbedding(t)));
}

/**
 * Compute cosine similarity between two L2-normalized vectors.
 * Returns a value between -1 and 1 (1 = identical).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectors must have same dimension');
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot; // Already normalized, so dot product = cosine similarity
}

/**
 * Check if pgvector is available (PostgreSQL backend).
 */
export function isPgVectorAvailable(): boolean {
  return isPostgres;
}

/**
 * Clear the embedding cache.
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}
