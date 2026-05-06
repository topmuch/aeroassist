/**
 * AeroAssist — RAG Service (Retrieval-Augmented Generation)
 * Searches the knowledge base for relevant context before AI generation.
 *
 * Uses SQLite full-text search via Prisma ORM.
 * In production with PostgreSQL, this would use pgvector embeddings.
 */

import { db } from './db';
import logger from './logger';

// ── Types ────────────────────────────────────────────────────────

export interface RAGResult {
  entries: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    relevanceScore: number;
  }>;
  context: string;       // Formatted context for AI prompt
  totalFound: number;
  searchTimeMs: number;
}

// ── Category Mapping ────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  flights: ['vol', 'vols', 'flight', 'départ', 'arrivée', 'retard', 'annulé', 'gate', 'embarquement', 'atterrissage', 'aéroport'],
  restaurants: ['restaurant', 'restaurants', 'manger', 'repas', 'café', 'dîner', 'déjeuner', 'gastronomie', 'boire', 'faim', 'soif'],
  services: ['service', 'services', 'wifi', 'vip', 'salon', 'consigne', 'bagage', 'toilette', 'détente', 'douane', 'sécurité', 'zone'],
  shops: ['boutique', 'boutiques', 'duty free', 'shopping', 'acheter', 'magasin', 'achat', 'soldes', 'cadeau', 'promotion'],
  transport: ['transport', 'taxi', 'bus', 'rer', 'navette', 'parking', 'voiture', 'train', 'métro', 'location', 'accès'],
  general: ['aide', 'help', 'information', 'contact', 'problème', 'plainte', 'réclamation'],
};

// ── Intent to Category Mapping ──────────────────────────────────

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

// ── Search Knowledge Base ──────────────────────────────────────

/**
 * Main RAG retrieval function.
 * Searches published knowledge base entries for relevant context.
 */
export async function searchKnowledgeBase(
  query: string,
  intent?: string,
  options?: { maxResults?: number; category?: string }
): Promise<RAGResult> {
  const start = Date.now();
  const maxResults = options?.maxResults || 5;
  const categoryHint = options?.category || (intent ? INTENT_CATEGORY_MAP[intent] : null);

  try {
    // Extract keywords from query
    const keywords = extractKeywords(query);

    if (keywords.length === 0) {
      return {
        entries: [],
        context: '',
        totalFound: 0,
        searchTimeMs: Date.now() - start,
      };
    }

    // Build search conditions
    const searchConditions = [
      // Search by title
      ...keywords.slice(0, 5).map((kw) => ({
        title: { contains: kw },
      })),
      // Search by content
      ...keywords.slice(0, 5).map((kw) => ({
        content: { contains: kw },
      })),
    ];

    // Build conditions array — keywords are ALWAYS required
    const conditions: Record<string, unknown>[] = [];

    if (searchConditions.length > 0) {
      conditions.push({ OR: searchConditions });
    }

    // Category is an additional AND filter (not OR — fixes bypass issue)
    if (categoryHint && categoryHint !== 'general') {
      conditions.push({ category: categoryHint });
    }

    // Build the final where clause
    const whereClause: Record<string, unknown> = {
      status: 'published',
      ...(conditions.length > 0 ? { AND: conditions } : {}),
    };

    const entries = await db.knowledgeBaseEntry.findMany({
      where: whereClause,
      take: maxResults * 2, // Fetch more for re-ranking
      orderBy: { updatedAt: 'desc' },
    });

    // Re-rank by relevance score
    const scored = entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      category: entry.category,
      relevanceScore: calculateRelevance(query, entry, keywords, categoryHint),
    }));

    // Sort by relevance and take top results
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topResults = scored.slice(0, maxResults).filter((r) => r.relevanceScore > 0);

    // Build formatted context for AI
    const context = topResults.length > 0
      ? topResults
          .map((r) => `## ${r.title}\n${r.content.slice(0, 500)}${r.content.length > 500 ? '...' : ''}`)
          .join('\n\n')
      : '';

    return {
      entries: topResults,
      context: context ? `Voici les informations pertinentes de notre base de connaissances :\n\n${context}` : '',
      totalFound: entries.length,
      searchTimeMs: Date.now() - start,
    };
  } catch (error) {
    logger.error('RAG search failed', {
      error: error instanceof Error ? error.message : String(error),
      query: query.slice(0, 100),
    });

    return {
      entries: [],
      context: '',
      totalFound: 0,
      searchTimeMs: Date.now() - start,
    };
  }
}

// ── Category Detection from Query ──────────────────────────────

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
    // Remove diacritics for better matching
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !isStopWord(w));
}

// ── Stop Words (French + English) ───────────────────────────────

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

// ── Relevance Scoring ──────────────────────────────────────────

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
