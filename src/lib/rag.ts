/**
 * AeroAssist — RAG Service (Retrieval-Augmented Generation) v2
 * Dual-mode retrieval:
 *   1. PostgreSQL + pgvector: Cosine similarity search on embeddings
 *   2. SQLite / Fallback: Keyword-based matching with relevance scoring
 *
 * The service automatically detects the database backend and uses
 * the appropriate search strategy.
 */

import { db } from './db';
import { generateEmbedding, cosineSimilarity, isPgVectorAvailable } from './embedding';
import logger from './logger';

// ── Types ────────────────────────────────────────────────────────

export interface RAGChunk {
  id: string;
  title: string;
  content: string;
  category: string;
  source?: string | null;
  relevanceScore: number;
  distance?: number;       // Cosine distance (pgvector only)
  method: 'pgvector' | 'keyword';
}

export interface RAGResult {
  chunks: RAGChunk[];
  context: string;
  totalFound: number;
  searchTimeMs: number;
  method: 'pgvector' | 'keyword';
}

export interface RAGSearchParams {
  query: string;
  intent?: string;
  maxResults?: number;
  category?: string;
  minScore?: number;
  airportCode?: string;
}

// ── Category Mapping ────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  flights: ['vol', 'vols', 'flight', 'départ', 'arrivée', 'retard', 'annulé', 'gate', 'embarquement', 'atterrissage', 'aéroport', 'terminal', 'porte'],
  restaurants: ['restaurant', 'restaurants', 'manger', 'repas', 'café', 'dîner', 'déjeuner', 'gastronomie', 'boire', 'faim', 'soif'],
  services: ['service', 'services', 'wifi', 'vip', 'salon', 'consigne', 'bagage', 'toilette', 'détente', 'douane', 'sécurité', 'zone'],
  shops: ['boutique', 'boutiques', 'duty free', 'shopping', 'acheter', 'magasin', 'achat', 'soldes', 'cadeau', 'promotion'],
  transport: ['transport', 'taxi', 'bus', 'rer', 'navette', 'parking', 'voiture', 'train', 'métro', 'location', 'accès'],
  general: ['aide', 'help', 'information', 'contact', 'problème', 'plainte', 'réclamation'],
};

const INTENT_CATEGORY_MAP: Record<string, string> = {
  flight_status: 'flights',
  restaurant: 'restaurants',
  shops: 'shops',
  service_info: 'services',
  transport: 'transport',
  reservation: 'services',
  lost_baggage: 'services',
  complaint: 'general',
};

// ── Main: Search Knowledge Base ─────────────────────────────────

/**
 * Main RAG retrieval function.
 * Automatically uses pgvector (PostgreSQL) or keyword matching (SQLite).
 */
export async function searchKnowledgeBase(
  query: string,
  intent?: string,
  options?: { maxResults?: number; category?: string }
): Promise<RAGResult> {
  const start = Date.now();
  const params: RAGSearchParams = {
    query,
    intent,
    maxResults: options?.maxResults || 5,
    category: options?.category,
  };

  try {
    // Determine search method
    if (isPgVectorAvailable()) {
      return await searchWithPgVector(params);
    }
    return await searchWithKeywords(params);
  } catch (error) {
    logger.error('RAG search failed, falling back to keywords', {
      error: error instanceof Error ? error.message : String(error),
      query: query.slice(0, 100),
    });

    // Fallback to keyword search if pgvector fails
    try {
      return await searchWithKeywords(params);
    } catch (fallbackError) {
      logger.error('RAG keyword fallback also failed', {
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      return {
        chunks: [],
        context: '',
        totalFound: 0,
        searchTimeMs: Date.now() - start,
        method: 'keyword',
      };
    }
  }
}

// ── pgvector Search (PostgreSQL) ───────────────────────────────

async function searchWithPgVector(params: RAGSearchParams): Promise<RAGResult> {
  const start = Date.now();
  const maxResults = params.maxResults || 5;

  // Generate embedding for the query
  const embedResult = await generateEmbedding(params.query);
  const queryVector = embedResult.embedding;

  // Convert vector to PostgreSQL format: '[0.1, 0.2, ...]'
  const vectorStr = `[${queryVector.map((v) => v.toFixed(8)).join(',')}]`;

  // Build dynamic SQL with optional filters
  const conditions: string[] = ["status = 'published'"];
  const values: unknown[] = [vectorStr];

  if (params.category) {
    values.push(params.category);
    conditions.push(`category = $${values.length}::text`);
  }

  const whereClause = conditions.join(' AND ');

  // Use raw SQL for pgvector cosine distance operator (<=>)
  const sql = `
    SELECT id, title, content, category, source,
           embedding <=> $1::vector AS distance
    FROM knowledge_base_entries
    WHERE ${whereClause}
    ORDER BY distance ASC
    LIMIT $${values.length + 1};
  `;
  values.push(maxResults);

  try {
    const results = await db.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        content: string;
        category: string;
        source: string | null;
        distance: number;
      }>
    >(sql, ...values);

    const chunks: RAGChunk[] = results.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content.slice(0, 1000) + (r.content.length > 1000 ? '...' : ''),
      category: r.category,
      source: r.source,
      relevanceScore: 1 - r.distance, // Convert distance to similarity
      distance: r.distance,
      method: 'pgvector' as const,
    }));

    // Filter by minimum score
    const minScore = params.minScore || 0.1;
    const filtered = chunks.filter((c) => c.relevanceScore >= minScore);

    const context = buildContext(filtered);

    logger.info('pgvector RAG search completed', {
      queryLength: params.query.length,
      resultsCount: results.length,
      filteredCount: filtered.length,
      timeMs: Date.now() - start,
      topDistance: results[0]?.distance?.toFixed(4),
    });

    return {
      chunks: filtered,
      context,
      totalFound: results.length,
      searchTimeMs: Date.now() - start,
      method: 'pgvector',
    };
  } catch (error) {
    logger.warn('pgvector search failed, falling back', {
      error: error instanceof Error ? error.message : String(error),
    });
    return searchWithKeywords(params);
  }
}

// ── Keyword Search (SQLite / Fallback) ─────────────────────────

async function searchWithKeywords(params: RAGSearchParams): Promise<RAGResult> {
  const start = Date.now();
  const maxResults = params.maxResults || 5;
  const categoryHint = params.category || (params.intent ? INTENT_CATEGORY_MAP[params.intent] : null);

  // Extract keywords
  const keywords = extractKeywords(params.query);

  if (keywords.length === 0) {
    return {
      chunks: [],
      context: '',
      totalFound: 0,
      searchTimeMs: Date.now() - start,
      method: 'keyword',
    };
  }

  // Build search conditions
  const searchConditions = [
    ...keywords.slice(0, 5).map((kw) => ({ title: { contains: kw } })),
    ...keywords.slice(0, 5).map((kw) => ({ content: { contains: kw } })),
  ];

  const conditions: Record<string, unknown>[] = [];
  if (searchConditions.length > 0) {
    conditions.push({ OR: searchConditions });
  }

  if (categoryHint && categoryHint !== 'general') {
    conditions.push({ category: categoryHint });
  }

  const whereClause: Record<string, unknown> = {
    status: 'published',
    ...(conditions.length > 0 ? { AND: conditions } : {}),
  };

  const entries = await db.knowledgeBaseEntry.findMany({
    where: whereClause,
    take: maxResults * 2,
    orderBy: { updatedAt: 'desc' },
  });

  // Score and rank
  const scored: RAGChunk[] = entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    content: entry.content.slice(0, 1000) + (entry.content.length > 1000 ? '...' : ''),
    category: entry.category,
    source: entry.source,
    relevanceScore: calculateRelevance(params.query, entry, keywords, categoryHint),
    method: 'keyword' as const,
  }));

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topResults = scored.filter((r) => r.relevanceScore > 0).slice(0, maxResults);

  const context = buildContext(topResults);

  return {
    chunks: topResults,
    context,
    totalFound: entries.length,
    searchTimeMs: Date.now() - start,
    method: 'keyword',
  };
}

// ── Context Builder ─────────────────────────────────────────────

function buildContext(chunks: RAGChunk[]): string {
  if (chunks.length === 0) return '';

  const formatted = chunks
    .map((c, i) => `[${i + 1}] ${c.title}\n${c.content}`)
    .join('\n\n---\n\n');

  return `Voici les informations pertinentes de notre base de connaissances :\n\n${formatted}`;
}

// ── Category Detection ──────────────────────────────────────────

export function detectCategory(query: string): string | null {
  const lower = query.toLowerCase();
  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const [category, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = kws.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore >= 1 ? bestCategory : null;
}

// ── Keyword Extraction ─────────────────────────────────────────

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !isStopWord(w));
}

// ── Stop Words ──────────────────────────────────────────────────

function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'les', 'des', 'une', 'est', 'que', 'qui', 'dans', 'pour', 'pas',
    'sur', 'avec', 'comment', 'pourquoi', 'quel', 'quelle', 'quoi',
    'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'this', 'that',
    'what', 'how', 'why', 'when', 'where', 'which', 'who',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
    'notre', 'votre', 'leur', 'and', 'but', 'for', 'with', 'from',
    'est', 'sont', 'avez', 'suis', 'tres', 'bien', 'aussi', 'ici',
    'you', 'your', 'his', 'her', 'its', 'our', 'their', 'my',
    'all', 'any', 'each', 'every', 'some', 'many', 'much', 'more',
  ]);
  return stopWords.has(word);
}

// ── Relevance Scoring (keyword-based) ───────────────────────────

function calculateRelevance(
  query: string,
  entry: { title: string; content: string; category: string },
  keywords: string[],
  categoryHint?: string | null
): number {
  let score = 0;
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedTitle = entry.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedContent = entry.content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Title match (highest weight)
  for (const kw of keywords) {
    if (normalizedTitle.includes(kw)) score += 10;
  }

  // Category match (medium weight)
  if (categoryHint && entry.category === categoryHint) score += 5;

  // Content keyword match (lower weight)
  for (const kw of keywords) {
    const occurrences = (normalizedContent.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    score += Math.min(occurrences * 2, 10);
  }

  // Exact phrase match bonus
  if (normalizedContent.includes(normalizedQuery.slice(0, 50))) score += 8;

  return score;
}
