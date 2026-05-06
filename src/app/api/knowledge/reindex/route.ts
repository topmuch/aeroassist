/**
 * Knowledge Reindex Endpoint
 * POST /api/knowledge/reindex
 *
 * Triggers reindexing of knowledge base entries for RAG.
 * Supports:
 * - Full reindex (all published articles)
 * - Incremental reindex (only new articles without embeddings)
 * - Single article reindex
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { indexAllArticles, indexNewArticles, indexArticle, getIndexStats } from '@/lib/knowledge-indexer';
import { requireAuth } from '@/lib/security';
import logger from '@/lib/logger';

const reindexSchema = z.object({
  mode: z.enum(['full', 'incremental', 'single']).default('incremental'),
  articleId: z.string().optional(),
});

// ── POST: Trigger Knowledge Reindex ─────────────────────────────

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = reindexSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { mode, articleId } = parsed.data;
    const statsBefore = await getIndexStats();

    let result;

    switch (mode) {
      case 'full':
        result = await indexAllArticles();
        break;

      case 'single':
        if (!articleId) {
          return NextResponse.json(
            { error: 'articleId is required for single reindex mode' },
            { status: 400 }
          );
        }
        try {
          await indexArticle(articleId);
          result = {
            totalProcessed: 1,
            successCount: 1,
            errorCount: 0,
            errors: [],
            timeMs: 0,
          };
        } catch (error) {
          result = {
            totalProcessed: 1,
            successCount: 0,
            errorCount: 1,
            errors: [{ id: articleId, error: error instanceof Error ? error.message : String(error) }],
            timeMs: 0,
          };
        }
        break;

      case 'incremental':
      default:
        result = await indexNewArticles();
        break;
    }

    const statsAfter = await getIndexStats();

    logger.info('Knowledge reindex triggered', {
      mode,
      ...result,
    });

    return NextResponse.json({
      success: true,
      mode,
      result,
      indexStats: {
        before: statsBefore,
        after: statsAfter,
      },
    });
  } catch (error) {
    logger.error('Knowledge reindex failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Reindex failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ── GET: Index Status ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const stats = await getIndexStats();
  return NextResponse.json({ success: true, ...stats });
}
