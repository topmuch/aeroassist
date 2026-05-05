import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// ── Validation Schemas ──────────────────────────────────────────

const aiLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sessionId: z.string().optional(),
  intent: z.string().optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// ── GET: AI interaction logs from Message table ─────────────────

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID?.() || `trace_${Date.now()}`;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sessionId: searchParams.get('sessionId') || undefined,
      intent: searchParams.get('intent') || undefined,
      minConfidence: searchParams.get('minConfidence') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const parsed = aiLogsQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, sessionId, intent, minConfidence, dateFrom, dateTo } = parsed.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      direction: 'outbound',  // AI responses only
      intent: { not: null },
    };

    if (sessionId) {
      where.conversationId = sessionId;
    }
    if (intent) {
      where.intent = intent;
    }
    if (minConfidence !== undefined) {
      where.confidence = { gte: minConfidence };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
      }
    }

    // Fetch AI response messages with their paired user messages
    const [aiMessages, total] = await Promise.all([
      db.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          conversationId: true,
          content: true,
          intent: true,
          confidence: true,
          createdAt: true,
        },
      }),
      db.message.count({ where }),
    ]);

    // For each AI message, find the preceding user message
    const logs = await Promise.all(
      aiMessages.map(async (aiMsg) => {
        // Find the last inbound message before this AI response in the same conversation
        const userMsg = await db.message.findFirst({
          where: {
            conversationId: aiMsg.conversationId,
            direction: 'inbound',
            createdAt: { lte: aiMsg.createdAt },
          },
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true },
        });

        return {
          id: aiMsg.id,
          sessionId: aiMsg.conversationId,
          userMessage: userMsg?.content || '—',
          aiResponse: aiMsg.content,
          intent: aiMsg.intent,
          confidence: aiMsg.confidence,
          timestamp: aiMsg.createdAt,
        };
      })
    );

    // Compute stats from the where clause
    const [intentStats, avgConfidence, totalLogs] = await Promise.all([
      db.message.groupBy({
        by: ['intent'],
        where,
        _count: { id: true },
        _avg: { confidence: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      db.message.aggregate({
        where,
        _avg: { confidence: true },
        _count: { id: true },
      }),
      Promise.resolve(total),
    ]);

    console.log(JSON.stringify({
      level: 'info',
      traceId,
      event: 'ai_logs_fetched',
      totalLogs,
      page,
      limit,
    }));

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total: totalLogs,
          totalPages: Math.ceil(totalLogs / limit),
        },
        stats: {
          totalLogs,
          avgConfidence: totalLogs._avg?.confidence || 0,
          intentBreakdown: intentStats.map((s) => ({
            intent: s.intent,
            count: s._count.id,
            avgConfidence: s._avg.confidence || 0,
          })),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(JSON.stringify({
      level: 'error',
      traceId,
      event: 'ai_logs_error',
      error: message,
    }));

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch AI logs' },
      { status: 500 }
    );
  }
}
