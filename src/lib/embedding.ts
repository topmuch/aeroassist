/**
 * AeroAssist — Embedding Service
 * Generates 384-dimensional vector embeddings for RAG retrieval.
 *
 * Strategy:
 * - Production (PostgreSQL + pgvector): Uses real semantic embeddings
 * - Development (SQLite): Generates pseudo-embeddings via hash distribution
 *
 * The embedding dimension is 384 to match all-MiniLM-L6-v2 / pgvector config.
 * All vectors are L2-normalized for cosine similarity search.
 */

import crypto from 'crypto';
import logger from './logger';

// ── Types ────────────────────────────────────────────────────────

export interface EmbeddingResult {
  embedding: number[];
  dimension: number;
  normalized: boolean;
  method: 'pgvector' | 'hash_fallback';
  timeMs: number;
}

// ── Constants ────────────────────────────────────────────────────

const EMBEDDING_DIMENSION = 384;
const isPostgres = process.env.DATABASE_URL?.startsWith('postgres') || false;

// Simple in-memory cache to avoid regenerating the same embeddings
const embeddingCache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 5000;

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

export function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec;
  return vec.map((v) => v / magnitude);
}

// ── Hash-based Pseudo-Embedding (Fallback) ─────────────────────

/**
 * Generates a deterministic pseudo-embedding using hash distribution.
 * This is NOT a real semantic embedding, but it provides:
 * - Deterministic output (same text → same vector)
 * - Reasonable distribution across dimensions
 * - L2-normalized for cosine similarity
 * - 384 dimensions matching pgvector config
 *
 * For production, replace with real embeddings (OpenAI, Cohere, etc.)
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

// ── Try Real Embeddings (PostgreSQL + API) ─────────────────────

/**
 * Attempts to generate a real embedding via an external API.
 * Falls back to hash-based if the API is unavailable.
 */
async function tryRealEmbedding(text: string): Promise<EmbeddingResult> {
  const start = Date.now();

  // Check if an embeddings API is configured
  const embeddingApiUrl = process.env.EMBEDDING_API_URL;
  const embeddingApiKey = process.env.EMBEDDING_API_KEY;

  if (!embeddingApiUrl || !embeddingApiKey) {
    return {
      embedding: generateHashEmbedding(text),
      dimension: EMBEDDING_DIMENSION,
      normalized: true,
      method: 'hash_fallback',
      timeMs: Date.now() - start,
    };
  }

  try {
    const response = await fetch(embeddingApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${embeddingApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn('Embedding API returned non-OK', {
        status: response.status,
        url: embeddingApiUrl,
      });
      return {
        embedding: generateHashEmbedding(text),
        dimension: EMBEDDING_DIMENSION,
        normalized: true,
        method: 'hash_fallback',
        timeMs: Date.now() - start,
      };
    }

    const data = await response.json() as {
      data?: Array<{ embedding: number[] }>;
    };

    const embedding = data?.data?.[0]?.embedding;
    if (!embedding || embedding.length === 0) {
      throw new Error('Empty embedding response');
    }

    const normalized = normalizeVector(embedding.slice(0, EMBEDDING_DIMENSION));

    // Pad or truncate to exact dimension
    while (normalized.length < EMBEDDING_DIMENSION) normalized.push(0);

    logger.info('Real embedding generated', {
      dimension: normalized.length,
      timeMs: Date.now() - start,
    });

    return {
      embedding: normalized.slice(0, EMBEDDING_DIMENSION),
      dimension: EMBEDDING_DIMENSION,
      normalized: true,
      method: 'pgvector',
      timeMs: Date.now() - start,
    };
  } catch (error) {
    logger.warn('Embedding API failed, using hash fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      embedding: generateHashEmbedding(text),
      dimension: EMBEDDING_DIMENSION,
      normalized: true,
      method: 'hash_fallback',
      timeMs: Date.now() - start,
    };
  }
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Generate an embedding for the given text.
 * Uses cache to avoid regenerating the same embeddings.
 *
 * @param text - The text to embed (max ~8000 tokens)
 * @param forceRefresh - Skip cache and regenerate
 * @returns EmbeddingResult with the 384-dim vector
 */
export async function generateEmbedding(
  text: string,
  forceRefresh = false
): Promise<EmbeddingResult> {
  // Create a cache key from the text
  const cacheKey = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);

  // Check cache
  if (!forceRefresh && embeddingCache.has(cacheKey)) {
    return {
      embedding: embeddingCache.get(cacheKey)!,
      dimension: EMBEDDING_DIMENSION,
      normalized: true,
      method: isPostgres ? 'pgvector' : 'hash_fallback',
      timeMs: 0,
    };
  }

  // Generate embedding
  const result = await tryRealEmbedding(text);

  // Update cache
  if (embeddingCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entries (simple FIFO)
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) embeddingCache.delete(firstKey);
  }
  embeddingCache.set(cacheKey, result.embedding);

  return result;
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
 * Compute cosine similarity between two normalized vectors.
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
