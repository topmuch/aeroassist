/**
 * AeroAssist — Knowledge Indexer Service
 * Generates and stores embeddings for knowledge base entries.
 *
 * Functions:
 * - indexArticle(articleId): Generate embedding for a single entry
 * - indexAllArticles(): Reindex all published entries (admin action)
 * - indexNewArticles(): Index entries that don't have embeddings yet
 *
 * For SQLite: embeddings are stored in a companion JSON file (no vector column).
 * For PostgreSQL: embeddings are stored in the `embedding vector(384)` column via raw SQL.
 */

import { db } from './db';
import { generateEmbedding, clearEmbeddingCache, isPgVectorAvailable } from './embedding';
import logger from './logger';
import fs from 'fs';
import path from 'path';

// ── Types ────────────────────────────────────────────────────────

export interface IndexResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ id: string; error: string }>;
  timeMs: number;
}

// ── Index a Single Article ──────────────────────────────────────

/**
 * Generate and store embedding for a single knowledge base entry.
 * Works for both SQLite (file-based) and PostgreSQL (pgvector column).
 */
export async function indexArticle(articleId: string): Promise<void> {
  const entry = await db.knowledgeBaseEntry.findUnique({
    where: { id: articleId },
  });

  if (!entry) {
    throw new Error(`Knowledge base entry not found: ${articleId}`);
  }

  // Build text to embed (title + content for best context)
  const textToEmbed = `${entry.title}. ${entry.content}`;
  const truncated = textToEmbed.slice(0, 8000); // Max ~8000 tokens

  // Generate embedding
  const embedResult = await generateEmbedding(truncated, true); // forceRefresh
  const vector = embedResult.embedding;

  if (isPgVectorAvailable()) {
    // PostgreSQL: store in embedding column via raw SQL
    const vectorStr = `[${vector.map((v) => v.toFixed(8)).join(',')}]`;
    await db.$executeRawUnsafe(
      `UPDATE knowledge_base_entries SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      articleId
    );
  } else {
    // SQLite: store in companion file
    await storeEmbeddingFile(articleId, vector);
  }

  logger.info('Article indexed', {
    articleId,
    title: entry.title.slice(0, 50),
    method: embedResult.method,
    timeMs: embedResult.timeMs,
  });
}

// ── Index All Published Articles ────────────────────────────────

/**
 * Reindex all published knowledge base entries.
 * This is an admin action, typically triggered after bulk import.
 */
export async function indexAllArticles(): Promise<IndexResult> {
  const start = Date.now();
  const result: IndexResult = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    timeMs: 0,
  };

  // Get all published entries
  const entries = await db.knowledgeBaseEntry.findMany({
    where: { status: 'published' },
    select: { id: true, title: true },
    orderBy: { updatedAt: 'desc' },
  });

  result.totalProcessed = entries.length;
  clearEmbeddingCache();

  logger.info('Starting full knowledge reindex', {
    totalArticles: entries.length,
    method: isPgVectorAvailable() ? 'pgvector' : 'file',
  });

  // Process in batches to avoid memory issues
  const BATCH_SIZE = 10;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (entry) => {
        try {
          await indexArticle(entry.id);
          result.successCount++;
        } catch (error) {
          result.errorCount++;
          result.errors.push({
            id: entry.id,
            error: error instanceof Error ? error.message : String(error),
          });
          logger.error('Failed to index article', {
            articleId: entry.id,
            title: entry.title.slice(0, 50),
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );

    // Small delay between batches
    if (i + BATCH_SIZE < entries.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  result.timeMs = Date.now() - start;

  logger.info('Full knowledge reindex completed', {
    totalProcessed: result.totalProcessed,
    successCount: result.successCount,
    errorCount: result.errorCount,
    timeMs: result.timeMs,
  });

  return result;
}

// ── Index New Articles (No Embeddings) ─────────────────────────

/**
 * Find and index articles that don't have embeddings yet.
 * Useful for incremental updates.
 */
export async function indexNewArticles(): Promise<IndexResult> {
  const start = Date.now();
  const result: IndexResult = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    timeMs: 0,
  };

  if (isPgVectorAvailable()) {
    // PostgreSQL: find entries where embedding is NULL
    const entries = await db.$queryRawUnsafe<Array<{ id: string; title: string }>>(
      `SELECT id, title FROM knowledge_base_entries WHERE status = 'published' AND embedding IS NULL ORDER BY updated_at DESC`
    );

    result.totalProcessed = entries.length;

    for (const entry of entries) {
      try {
        await indexArticle(entry.id);
        result.successCount++;
      } catch (error) {
        result.errorCount++;
        result.errors.push({
          id: entry.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } else {
    // SQLite: check companion file
    const embeddings = loadEmbeddingFile();
    const allEntries = await db.knowledgeBaseEntry.findMany({
      where: { status: 'published' },
      select: { id: true },
    });

    const unindexed = allEntries.filter((e) => !embeddings[e.id]);
    result.totalProcessed = unindexed.length;

    for (const entry of unindexed) {
      try {
        await indexArticle(entry.id);
        result.successCount++;
      } catch (error) {
        result.errorCount++;
        result.errors.push({
          id: entry.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  result.timeMs = Date.now() - start;
  return result;
}

// ── SQLite Companion File Storage ───────────────────────────────

const EMBEDDINGS_FILE = path.join(process.cwd(), 'data', 'embeddings.json');

interface EmbeddingStore {
  [articleId: string]: number[];
}

function loadEmbeddingFile(): EmbeddingStore {
  try {
    if (fs.existsSync(EMBEDDINGS_FILE)) {
      return JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf8'));
    }
  } catch {
    // Corrupted file, start fresh
  }
  return {};
}

function storeEmbeddingFile(articleId: string, vector: number[]): void {
  const embeddings = loadEmbeddingFile();
  embeddings[articleId] = vector;

  // Ensure directory exists
  const dir = path.dirname(EMBEDDINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify(embeddings));
}

/**
 * Retrieve an embedding from the SQLite companion file.
 */
export function getEmbeddingFromFile(articleId: string): number[] | null {
  const embeddings = loadEmbeddingFile();
  return embeddings[articleId] || null;
}

/**
 * Get stats about the embedding index.
 */
export async function getIndexStats(): Promise<{
  totalArticles: number;
  indexedArticles: number;
  unindexedArticles: number;
  method: string;
  indexSizeKb?: number;
}> {
  const totalArticles = await db.knowledgeBaseEntry.count({
    where: { status: 'published' },
  });

  let indexedArticles: number;

  if (isPgVectorAvailable()) {
    const result = await db.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM knowledge_base_entries WHERE status = 'published' AND embedding IS NOT NULL`
    );
    indexedArticles = Number(result[0]?.count || 0);
  } else {
    const embeddings = loadEmbeddingFile();
    indexedArticles = Object.keys(embeddings).length;
  }

  let indexSizeKb: number | undefined;
  if (!isPgVectorAvailable()) {
    try {
      const stats = fs.statSync(EMBEDDINGS_FILE);
      indexSizeKb = Math.round(stats.size / 1024);
    } catch {
      // File doesn't exist
    }
  }

  return {
    totalArticles,
    indexedArticles,
    unindexedArticles: totalArticles - indexedArticles,
    method: isPgVectorAvailable() ? 'pgvector' : 'file',
    indexSizeKb,
  };
}
