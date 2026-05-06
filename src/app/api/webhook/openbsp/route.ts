/**
 * OpenBSP Webhook Endpoint
 * Receives messages from the OpenBSP bridge (port 3001)
 *
 * Flow:
 * 1. Validate OpenBSP webhook secret (X-OpenBSP-Secret header)
 * 2. Rate limit per phone number (20 msg/min)
 * 3. Parse OpenBSP payload format
 * 4. Update/create contact (RGPD tracking)
 * 5. Check blacklist
 * 6. Process with AI assistant (RAG + Groq)
 * 7. Send reply via WhatsApp service
 * 8. Store conversation in DB
 * 9. Log analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  sendTextMessage,
  checkPhoneRateLimit,
  incrementPhoneRateLimit,
  validatePhoneNumber,
} from '@/lib/whatsapp-service';
import { processAssistantMessage } from '@/lib/ai-assistant';
import {
  applyRateLimit,
  WEBHOOK_RATE_LIMIT,
  getSecurityHeaders,
  withSecurityHeaders,
  getClientIp,
  startTimer,
} from '@/lib/security';
import logger, { logWebhookEvent, logSecurityEvent } from '@/lib/logger';

// ── OpenBSP Payload Types ───────────────────────────────────────

interface OpenBSPWebhookPayload {
  event: string;
  instance: string;
  data: {
    key?: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      imageMessage?: { url: string; mimetype: string; caption?: string; fileName?: string };
      documentMessage?: { url: string; mimetype: string; caption?: string; fileName?: string };
      audioMessage?: { url: string; mimetype: string };
      videoMessage?: { url: string; mimetype: string; caption?: string };
      locationMessage?: { degreesLatitude: number; degreesLongitude: number; name?: string; address?: string };
      buttonsResponseMessage?: { selectedDisplayText: string; selectedId: string };
      listResponseMessage?: { title: string; description: string; singleSelectReply: { selectedRowId: string; title: string } };
      contactsArrayMessage?: { contacts: unknown[] };
      stickerMessage?: { url: string; mimetype: string };
    };
    messageTimestamp?: number;
    pushName?: string;
    status?: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────

function jidToPhone(jid: string): string {
  return jid.split('@')[0] || jid;
}

function extractMessageText(payload: OpenBSPWebhookPayload): { text: string; type: string } {
  const msg = payload.data.message;
  if (!msg) return { text: '', type: 'unknown' };

  if (msg.conversation) return { text: msg.conversation.trim(), type: 'text' };
  if (msg.extendedTextMessage?.text) return { text: msg.extendedTextMessage.text.trim(), type: 'text' };
  if (msg.buttonsResponseMessage?.selectedDisplayText) {
    return { text: msg.buttonsResponseMessage.selectedDisplayText.trim(), type: 'interactive' };
  }
  if (msg.listResponseMessage?.singleSelectReply?.title) {
    return { text: msg.listResponseMessage.singleSelectReply.title.trim(), type: 'interactive' };
  }
  if (msg.imageMessage) return { text: msg.imageMessage.caption || '[Image]', type: 'image' };
  if (msg.documentMessage) return { text: msg.documentMessage.caption || '[Document]', type: 'document' };
  if (msg.audioMessage) return { text: '[Audio]', type: 'audio' };
  if (msg.videoMessage) return { text: msg.videoMessage.caption || '[Video]', type: 'video' };
  if (msg.stickerMessage) return { text: '[Sticker]', type: 'sticker' };
  if (msg.locationMessage) return { text: '[Location]', type: 'location' };
  if (msg.contactsArrayMessage) return { text: '[Contacts]', type: 'contacts' };

  return { text: '', type: 'unknown' };
}

function verifyOpenBSPSecret(request: NextRequest): boolean {
  const secret = process.env.OPENBSP_WEBHOOK_SECRET;
  if (!secret) {
    logSecurityEvent('openbsp_secret_missing', {
      warning: 'OPENBSP_WEBHOOK_SECRET not set — verification DISABLED',
    });
    return true;
  }

  const provided = request.headers.get('x-openbsp-secret');
  if (!provided) return false;

  try {
    const expected = Buffer.from(secret, 'utf8');
    const actual = Buffer.from(provided, 'utf8');
    if (expected.length !== actual.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) result |= expected[i] ^ actual[i];
    return result === 0;
  } catch {
    return false;
  }
}

async function upsertContact(phone: string, pushName?: string): Promise<boolean> {
  try {
    const existing = await db.whatsAppContact.findUnique({ where: { phoneNumber: phone } });

    if (existing) {
      if (existing.isBlacklisted) return false;
      await db.whatsAppContact.update({
        where: { id: existing.id },
        data: { pushName: pushName || existing.pushName, lastSeenAt: new Date(), messageCount: { increment: 1 } },
      });
      return existing.isOptIn;
    }

    await db.whatsAppContact.create({
      data: { phoneNumber: phone, pushName, language: 'fr', isOptIn: true, messageCount: 1, lastSeenAt: new Date() },
    });
    return true;
  } catch {
    return true;
  }
}

function redactPhone(phone: string): string {
  if (phone.length <= 4) return '[REDACTED]';
  return phone.slice(0, 3) + '***' + phone.slice(-2);
}

// ── GET: Health ─────────────────────────────────────────────────

export async function GET() {
  return withSecurityHeaders(
    NextResponse.json({ status: 'ok', provider: 'openbsp', endpoint: '/api/webhook/openbsp' })
  );
}

// ── POST: Receive Messages ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const timer = startTimer();
  const clientIp = getClientIp(request);

  const rateLimitResponse = applyRateLimit(request, WEBHOOK_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!verifyOpenBSPSecret(request)) {
      logSecurityEvent('openbsp_webhook_unauthorized', { ip: clientIp });
      return withSecurityHeaders(NextResponse.json({ error: 'Invalid OpenBSP secret' }, { status: 401 }));
    }

    const body: OpenBSPWebhookPayload = await request.json();

    // Only process messages.upsert
    if (body.event !== 'messages.upsert') {
      if (body.event === 'connection.update') {
        logWebhookEvent('connection_update', { status: body.data.status, instance: body.instance });
      }
      return withSecurityHeaders(NextResponse.json({ status: 'acknowledged', event: body.event }));
    }

    const messageKey = body.data.key;
    if (!messageKey || messageKey.fromMe) {
      return withSecurityHeaders(NextResponse.json({ status: 'ignored', reason: 'from_self' }));
    }

    const phone = jidToPhone(messageKey.remoteJid);
    const messageId = messageKey.id;
    const pushName = body.data.pushName;

    logWebhookEvent('inbound_openbsp', { messageId, from: redactPhone(phone), instance: body.instance });

    // Validate phone
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ status: 'rejected', reason: 'invalid_phone' }));
    }

    // Per-phone rate limit
    if (!checkPhoneRateLimit(phone).allowed) {
      return withSecurityHeaders(NextResponse.json({ status: 'rate_limited' }));
    }

    // Contact check
    if (!(await upsertContact(phone, pushName))) {
      return withSecurityHeaders(NextResponse.json({ status: 'blocked', reason: 'blacklisted' }));
    }

    // Extract text
    const { text, type } = extractMessageText(body);

    if (type !== 'text' && type !== 'interactive') {
      const responses: Record<string, string> = {
        image: "📷 Merci pour la photo ! Je ne traite pas les images.\n\nDécrivez votre demande en texte.",
        document: "📄 Je ne lis pas les documents.\n\nEnvoyez votre question en texte !",
        audio: "🎤 Je n'écoute pas les vocaux.\n\nTapez votre question ! 😊",
        video: "🎬 Je ne traite pas les vidéos.\n\nTexte uniquement !",
        sticker: "😊 Sympa ! Mais je réponds au texte.\n\nQue puis-je faire pour vous ?",
        location: "📍 Merci ! Que cherchez-vous à proximité ?",
        contacts: "📇 Je ne traite pas les contacts.",
      };
      await sendTextMessage(phone, responses[type] || "🤔 Type non supporté.");
      incrementPhoneRateLimit(phone);
      return withSecurityHeaders(NextResponse.json({ status: 'processed', type }));
    }

    if (!text) {
      await sendTextMessage(phone, "👋 Reformulez votre question s'il vous plaît.\n\nExemples :\n• \"Mon vol AF1234 est à quelle heure ?\"\n• \"Où manger au terminal 2E ?\"");
      incrementPhoneRateLimit(phone);
      return withSecurityHeaders(NextResponse.json({ status: 'processed', type: 'empty' }));
    }

    if (text.length > 4000) {
      await sendTextMessage(phone, "📝 Message trop long (max 4000 car.). Raccourcissez.");
      incrementPhoneRateLimit(phone);
      return withSecurityHeaders(NextResponse.json({ status: 'processed', type: 'too_long' }));
    }

    // Find or create conversation
    let conversation = await db.conversation.findUnique({ where: { whatsappId: phone } });
    if (!conversation) {
      conversation = await db.conversation.create({ data: { whatsappId: phone, status: 'active' } });
    } else {
      await db.conversation.update({ where: { id: conversation.id }, data: { lastMessage: new Date(), status: 'active' } });
    }

    // Store inbound
    await db.message.create({
      data: { conversationId: conversation.id, direction: 'inbound', content: text, messageType: type },
    });

    // AI processing
    const aiResponse = await processAssistantMessage(text, conversation.id);

    // Send reply
    const sendResult = await sendTextMessage(phone, aiResponse.reply);

    if (!sendResult.success) {
      logger.error('Failed to send reply', { error: sendResult.error, provider: sendResult.provider });
    }

    // Store outbound
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

    // Analytics
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
          provider: sendResult.provider,
        }),
      },
    });

    incrementPhoneRateLimit(phone);

    return withSecurityHeaders(
      NextResponse.json({
        status: 'processed',
        intent: aiResponse.intent,
        language: aiResponse.language,
        model: aiResponse.model,
        ragUsed: aiResponse.ragUsed,
        responseTimeMs: aiResponse.responseTimeMs,
        messageId: sendResult.messageId,
        durationMs: timer(),
      })
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('OpenBSP webhook error', { error: errorMsg, ip: clientIp, durationMs: timer() });
    return withSecurityHeaders(NextResponse.json({ status: 'error', error: 'Internal processing error' }));
  }
}
