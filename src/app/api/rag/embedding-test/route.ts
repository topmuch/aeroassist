/**
 * AeroAssist — Embedding Test Endpoint
 * Quick diagnostic for the embedding service: generates an embedding
 * for a given text and returns detailed metrics.
 *
 * GET /api/rag/embedding-test?text=...
 *
 * No auth required (test / diagnostics endpoint).
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embedding';
import { getSecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const text = request.nextUrl.searchParams.get('text');

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query parameter "text" is required',
          example: '/api/rag/embedding-test?text=Hello%20world',
          timestamp: new Date().toISOString(),
        },
        {
          status: 400,
          headers: { ...getSecurityHeaders(), 'Cache-Control': 'no-store' },
        }
      );
    }

    if (text.length > 8000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Text too long (max 8000 characters)',
          timestamp: new Date().toISOString(),
        },
        {
          status: 400,
          headers: { ...getSecurityHeaders(), 'Cache-Control': 'no-store' },
        }
      );
    }

    const result = await generateEmbedding(text, true);

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      input: {
        text: text.slice(0, 200) + (text.length > 200 ? '...' : ''),
        length: text.length,
      },
      embedding: {
        dimension: result.dimension,
        model:
          process.env.NODE_ENV === 'production'
            ? process.env.GROQ_EMBEDDING_MODEL || 'all-MiniLM-L6-v2'
            : 'hash_fallback',
        normalized: result.normalized,
        method: result.method,
        vector_preview: result.embedding.slice(0, 5).map((v) => +v.toFixed(6)),
        latency_ms: result.timeMs,
        cache_hit: result.timeMs === 0,
      },
      totalResponseTimeMs: Date.now() - startTime,
    };

    logger.info('embedding.test.completed', {
      dimension: result.dimension,
      method: result.method,
      latency_ms: result.timeMs,
      totalResponseTimeMs: response.totalResponseTimeMs,
    });

    return NextResponse.json(response, {
      headers: { ...getSecurityHeaders(), 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error('embedding.test.failed', { error: message });

    return NextResponse.json(
      {
        success: false,
        error: 'Embedding generation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: { ...getSecurityHeaders(), 'Cache-Control': 'no-store' },
      }
    );
  }
}
