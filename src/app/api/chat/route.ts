/**
 * AeroAssist — Web Chat API
 * Uses the unified AI Assistant pipeline (RAG + Groq + intent detection)
 *
 * Flow:
 * 1. Validate input
 * 2. Find or create conversation
 * 3. Store inbound message
 * 4. Process via AI Assistant (RAG + Groq + fallback)
 * 5. Store outbound message
 * 6. Log analytics
 * 7. Return response with metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { processAssistantMessage } from '@/lib/ai-assistant';
import logger from '@/lib/logger';

// ── IP-based Rate Limiter ───────────────────────────────────────

const chatRateLimiter = new Map<string, { count: number; resetTime: number }>();
const CHAT_RATE_LIMIT = 20; // 20 requests per minute per IP
const CHAT_RATE_WINDOW = 60_000; // 1 minute

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of chatRateLimiter.entries()) {
    if (now > entry.resetTime) {
      chatRateLimiter.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ── Validation Schema ──────────────────────────────────────────

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(4000, 'Message too long'),
  conversationId: z.string().optional(),
  language: z.string().optional().default('fr'),
});

// ── POST: Process chat message ─────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting check (before any processing) ──
    const ip = getClientIp(request);
    const now = Date.now();
    let rateEntry = chatRateLimiter.get(ip);

    if (!rateEntry || now > rateEntry.resetTime) {
      rateEntry = { count: 0, resetTime: now + CHAT_RATE_WINDOW };
      chatRateLimiter.set(ip, rateEntry);
    }

    rateEntry.count++;

    if (rateEntry.count > CHAT_RATE_LIMIT) {
      const retryAfter = Math.ceil((rateEntry.resetTime - now) / 1000);
      logger.warn('Chat rate limit exceeded', { ip, count: rateEntry.count });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const body = await request.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { message, conversationId, language } = parsed.data;

    // Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = await db.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
    } else {
      conversation = await db.conversation.create({
        data: {
          whatsappId: `web_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          language: language,
        },
      });
    }

    // Store user message
    await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: message,
        messageType: 'text',
      },
    });

    // ── Use the unified AI Assistant pipeline (RAG + Groq + fallback) ──
    const aiResponse = await processAssistantMessage(
      message,
      conversation.id,
      { skipAI: false }
    );

    // Store AI response
    await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiResponse.reply,
        messageType: 'text',
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
      },
    });

    // Update conversation lastMessage timestamp
    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessage: new Date(), status: 'active' },
    });

    // Log analytics event
    await db.analyticsEvent.create({
      data: {
        eventType: 'message_sent',
        metadata: JSON.stringify({
          intent: aiResponse.intent,
          language: aiResponse.language,
          model: aiResponse.model,
          ragUsed: aiResponse.ragUsed,
          ragEntries: aiResponse.ragEntries,
          responseTimeMs: aiResponse.responseTimeMs,
          source: 'web_chat',
        }),
      },
    });

    logger.info('Web chat processed', {
      conversationId: conversation.id,
      intent: aiResponse.intent,
      language: aiResponse.language,
      model: aiResponse.model,
      ragUsed: aiResponse.ragUsed,
      ragEntries: aiResponse.ragEntries,
      responseTimeMs: aiResponse.responseTimeMs,
    });

    return NextResponse.json({
      reply: aiResponse.reply,
      conversationId: conversation.id,
      intent: aiResponse.intent,
      language: aiResponse.language,
      model: aiResponse.model,
      ragUsed: aiResponse.ragUsed,
      ragEntries: aiResponse.ragEntries,
      responseTimeMs: aiResponse.responseTimeMs,
    });
  } catch (error) {
    logger.error('Web chat error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
