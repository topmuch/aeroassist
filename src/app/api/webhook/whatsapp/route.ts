/**
 * WhatsApp Webhook - Meta Cloud API Integration
 *
 * GET  : Webhook verification challenge (called by Meta during setup)
 * POST : Receives incoming messages, processes with AI, sends replies
 *
 * Flow (POST):
 * 1. Verify HMAC signature (security)
 * 2. Rate limit check
 * 3. Parse incoming message(s)
 * 4. Handle edge cases (empty, image, etc.)
 * 5. Detect language
 * 6. RAG search in knowledge base
 * 7. Call Groq AI with dynamic system prompt
 * 8. Send reply via WhatsApp API
 * 9. Store conversation in database
 * 10. Log analytics event
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import {
  verifyWebhookSignature,
  verifyWebhookChallenge,
  parseWebhookPayload,
  sendTextMessage,
  STATIC_FALLBACK_RESPONSES,
  type InboundMessage,
} from '@/lib/whatsapp';
import {
  applyRateLimit,
  WEBHOOK_RATE_LIMIT,
  getSecurityHeaders,
  withSecurityHeaders,
  getClientIp,
  startTimer,
} from '@/lib/security';
import logger, { logWebhookEvent, logSecurityEvent, logAIEvent } from '@/lib/logger';

// ── Language Detection ───────────────────────────────────────────

const LANGUAGE_PATTERNS: Record<string, RegExp> = {
  fr: /\b(bonjour|bonsoir|merci|au revoir|vol|aéroport|retard|départ|arrivée|restaurant|manger|bagage|toilette|taxi|bus|rer|salut|coucou|pourquoi|comment|où|quel|quand|aide|problème|réserver|réservation|hôtel|chambre|vip|wifi|douane|sécurité|terminal|porte|embarquement|atterrissage|décollage|navette|parking|train|métro|boutique|acheter|duty free|shopping|plainte|mécontent|perdu|valise|objet|caf|dîner|déjeuner|boire|faim|soif|information|service|zone|détente|consigne)\b/i,
  en: /\b(hello|hi|good morning|good evening|thank you|bye|flight|airport|delay|departure|arrival|restaurant|eat|baggage|luggage|restroom|toilet|taxi|bus|train|parking|shop|buy|duty free|complaint|lost|suitcase|food|drink|hungry|thirsty|help|problem|book|reservation|hotel|room|vip|wifi|customs|security|terminal|gate|boarding|landing|takeoff|shuttle|metro|store|purchase|please|sorry|welcome)\b/i,
  es: /\b(hola|buenos días|buenas noches|gracias|adiós|vuelo|aeropuerto|retraso|salida|llegada|restaurante|comer|equipaje|taxi|autobús|tren|ayuda|problema|reservar|hotel|wifi|aduana|seguridad|terminal|puerta|embarque)\b/i,
  de: /\b(hallo|guten morgen|danke|auf wiedersehen|flug|flughafen|verspätung|abflug|ankunft|restaurant|essen|gepäck|toilette|taxi|bus|zug|hilfe|problem|buchen|hotel|wifi|zoll|sicherheit|terminal|tor|einstieg)\b/i,
  ar: /\b(مرحبا|شكرا|صباح|مساء|رحلة|مطار|تأخير|مطعم|أكل|حقائب|تاكسي|حافلة|قطار|مساعدة|فندق|واي فاي)\b/i,
  zh: /\b(你好|谢谢|机场|航班|延误|餐厅|行李|出租车|巴士|火车|帮助|酒店|wifi)\b/i,
  pt: /\b(olá|bom dia|obrigado|voo|aeroporto|atraso|restaurante|comer|bagagem|táxi|autocarro|trem|ajuda|problema|reservar|hotel)\b/i,
};

function detectLanguage(text: string): string {
  // Score each language by number of keyword matches
  const scores: Record<string, number> = {};
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    const matches = text.match(pattern);
    scores[lang] = matches ? matches.length : 0;
  }

  // Find the language with the highest score
  const bestLang = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  return bestLang && bestLang[1] > 0 ? bestLang[0] : 'fr'; // Default French
}

// ── Knowledge Base Search (RAG-like) ─────────────────────────────

async function searchKnowledgeBase(query: string): Promise<string> {
  try {
    // Extract keywords from the query for searching
    const keywords = query
      .toLowerCase()
      .replace(/[^\w\sàâéèêëïîôùûüç]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    // Search in knowledge base for relevant entries
    const entries = await db.knowledgeBaseEntry.findMany({
      where: {
        status: 'published',
        OR: [
          ...keywords.slice(0, 5).map((kw) => ({
            title: { contains: kw },
          })),
          ...keywords.slice(0, 5).map((kw) => ({
            content: { contains: kw },
          })),
        ],
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });

    if (entries.length === 0) return '';

    // Build context from matching entries
    const context = entries
      .map((entry) => `## ${entry.title}\n${entry.content.slice(0, 500)}`)
      .join('\n\n');

    return `Voici les informations pertinentes de notre base de connaissances :\n\n${context}`;
  } catch (error) {
    logger.error('Knowledge base search failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return '';
  }
}

// ── Build Dynamic System Prompt ──────────────────────────────────

async function buildSystemPrompt(language: string, ragContext: string, intent: string): Promise<string> {
  // Get active modules from DB
  let activeModules: string[] = [];
  try {
    const modules = await db.module.findMany({
      where: { isActive: true },
      select: { name: true, slug: true, description: true },
    });
    activeModules = modules.map((m) => `${m.name}: ${m.description || m.slug}`);
  } catch {
    activeModules = ['Vols', 'Restaurants', 'Services Aéroport', 'Transports', 'Réservations'];
  }

  const langInstructions: Record<string, string> = {
    fr: "Tu es AeroAssist, l'assistant virtuel intelligent de l'aéroport. Tu réponds en français.",
    en: "You are AeroAssist, the virtual airport assistant. You respond in English.",
    es: "Eres AeroAssist, el asistente virtual del aeropuerto. Respondes en español.",
    de: "Du bist AeroAssist, der virtuelle Flughafenassistent. Du antwortest auf Deutsch.",
    ar: "أنت AeroAssist، المساعد الافتراضي للمطار. تجيب بالعربية.",
    zh: "你是 AeroAssist，机场虚拟助手。你用中文回答。",
    pt: "Você é AeroAssist, o assistente virtual do aeroporto. Responde em português.",
  };

  const prompt = `${langInstructions[language] || langInstructions.fr}

## Contexte RAG (Base de connaissances) :
${ragContext || 'Aucune information spécifique trouvée dans la base de connaissances pour cette question.'}

## Modules Actifs :
${activeModules.join('\n') || 'Aucun module actif'}

## Aéroports couverts :
- Charles de Gaulle (CDG) - Terminal 1, 2A-2F, 2G, 3
- Orly (ORY) - Ouest, Sud

## Règles STRICTES :
- Réponds de manière concise et utile
- Utilise des emojis pertinents ✈️🍽️🛍️🏨🚗
- Structure les réponses avec des listes quand c'est pertinent
- Si tu ne connais pas la réponse, dis-le honnêtement et propose d'escalader à un agent humain
- Pour les urgences médicales ou de sécurité, dirige immédiatement vers les services d'urgence
- N'invente JAMAIS d'informations (pas d'hallucination)
- Format de date : JJ/MM/AAAA
- Utilise l'heure de Paris (CET/CEST)

## Intention détectée : ${intent}`;

  return prompt;
}

// ── Intent Detection ─────────────────────────────────────────────

const INTENT_KEYWORDS: Record<string, string[]> = {
  flight_status: ['vol', 'départ', 'arrivée', 'retard', 'annulé', 'gate', 'porte', 'terminal', 'embarquement', 'atterrissage', 'flight', 'décoller', 'board'],
  restaurant: ['restaurant', 'manger', 'repas', 'café', 'dîner', 'déjeuner', 'boire', 'faim', 'soif', 'gastronomie', 'eat', 'food', 'hungry'],
  shops: ['boutique', 'acheter', 'magasin', 'duty free', 'shopping', 'cadeau', 'promotion', 'soldes', 'achat', 'shop', 'buy', 'store'],
  service_info: ['wifi', 'salon', 'vip', 'consigne', 'bagage', 'toilette', 'détente', 'zone', 'service', 'douane', 'sécurité', 'loung', 'wifi', 'restroom'],
  transport: ['taxi', 'bus', 'rer', 'navette', 'parking', 'voiture', 'train', 'métro', 'transport', 'accès', 'cab', 'uber'],
  reservation: ['réserver', 'réservation', 'louer', 'hôtel', 'chambre', 'salon vip', 'location', 'book', 'reserve', 'hotel'],
  lost_baggage: ['bagage perdu', 'valise', 'retrouver', 'objet perdu', 'perdu', 'lost', 'luggage', 'suitcase'],
  complaint: ['plainte', 'problème', 'mécontent', 'insatisfait', 'réclamation', 'mauvais', 'complaint', 'problem'],
  greeting: ['bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'coucou', 'good morning', 'good evening', 'hola'],
  goodbye: ['merci', 'au revoir', 'adieu', 'bye', 'à bientôt', 'bonne journée', 'thank', 'goodbye'],
};

function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  let bestIntent = 'general_inquiry';
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  return bestIntent;
}

// ── Call AI (Groq via z-ai-web-dev-sdk) ──────────────────────────

async function callAI(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  maxRetries = 2
): Promise<{ reply: string; confidence: number; model: string }> {
  let lastError = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const zai = await ZAI.create();

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-10), // Keep last 10 messages for context
        ],
      });

      const reply = completion?.choices?.[0]?.message?.content;
      if (!reply) {
        lastError = 'Empty AI response';
        continue;
      }

      logAIEvent('response_generated', {
        model: 'groq',
        replyLength: reply.length,
        attempt: attempt + 1,
      });

      return { reply, confidence: 0.9, model: 'groq' };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      logger.error(`AI call failed (attempt ${attempt + 1}/${maxRetries + 1})`, {
        error: lastError,
      });

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  // Fallback to static responses
  logger.warn('AI fallback to static responses', { lastError });
  return { reply: '', confidence: 0.3, model: 'fallback' };
}

// ── Static FAQ Fallback ──────────────────────────────────────────

function getStaticFallback(intent: string): string {
  return STATIC_FALLBACK_RESPONSES[intent] || STATIC_FALLBACK_RESPONSES.default;
}

// ── GET: Webhook Verification (Meta Challenge) ───────────────────

export async function GET(request: NextRequest) {
  const timer = startTimer();

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode') || '';
    const token = searchParams.get('hub.verify_token') || '';
    const challenge = searchParams.get('hub.challenge') || '';

    logger.info('WhatsApp webhook verification attempt', { mode, hasToken: !!token, hasChallenge: !!challenge });

    const result = verifyWebhookChallenge(mode, token, challenge);

    if (result.success && result.body) {
      logger.info('WhatsApp webhook verified successfully', { durationMs: timer() });
      return new NextResponse(result.body, {
        status: 200,
        headers: { 'Content-Type': 'text/plain', ...getSecurityHeaders() },
      });
    }

    logSecurityEvent('webhook_verify_failed', { mode, tokenMatch: false });
    return withSecurityHeaders(
      NextResponse.json({ error: 'Verification failed' }, { status: result.statusCode })
    );
  } catch (error) {
    logger.error('Webhook GET error', { error: error instanceof Error ? error.message : String(error) });
    return withSecurityHeaders(
      NextResponse.json({ error: 'Internal error' }, { status: 500 })
    );
  }
}

// ── POST: Receive & Process Messages ─────────────────────────────

export async function POST(request: NextRequest) {
  const timer = startTimer();
  const clientIp = getClientIp(request);

  // 1. Rate Limit Check
  const rateLimitResponse = applyRateLimit(request, WEBHOOK_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // 2. Read raw body for signature verification
    const rawBody = await request.text();

    // 3. Verify webhook signature (critical security check)
    const signatureHeader = request.headers.get('x-hub-signature-256');
    const signatureResult = verifyWebhookSignature(rawBody, signatureHeader);

    if (!signatureResult.valid) {
      logSecurityEvent('webhook_signature_invalid', {
        ip: clientIp,
        error: signatureResult.error,
      });
      return withSecurityHeaders(
        NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      );
    }

    // 4. Parse the webhook payload
    const body = JSON.parse(rawBody);
    const { messages, statuses } = parseWebhookPayload(body);

    // Log status updates (message delivered, read, etc.)
    for (const status of statuses) {
      logWebhookEvent('status_update', { status });
    }

    // If no messages, acknowledge receipt
    if (messages.length === 0) {
      return withSecurityHeaders(
        NextResponse.json({ status: 'received', processed: 0 })
      );
    }

    // 5. Process each message
    let processedCount = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      try {
        await processInboundMessage(msg);
        processedCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(errorMsg);
        logger.error('Failed to process message', {
          messageId: msg.id,
          error: errorMsg,
        });
      }
    }

    logWebhookEvent('batch_processed', {
      total: messages.length,
      processed: processedCount,
      errors: errors.length,
      durationMs: timer(),
    });

    const response = NextResponse.json({
      status: processedCount > 0 ? 'processed' : 'received',
      processed: processedCount,
      total: messages.length,
      ...(errors.length > 0 && { errors }),
    });

    return withSecurityHeaders(response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Webhook POST critical error', {
      error: errorMsg,
      ip: clientIp,
      durationMs: timer(),
    });

    // Always return 200 to Meta (even on errors) to prevent webhook redelivery
    return withSecurityHeaders(
      NextResponse.json({ status: 'error', error: 'Internal processing error' })
    );
  }
}

// ── Process Single Inbound Message ───────────────────────────────

async function processInboundMessage(
  msg: InboundMessage & { contactName?: string; contactWaId?: string }
): Promise<void> {
  const phone = msg.from;
  const messageId = msg.id;

  logWebhookEvent('inbound', {
    messageId,
    from: redactPhone(phone),
    type: msg.type,
    hasContact: !!msg.contactName,
  });

  // ── Edge Case: Empty message ──
  if (!msg.type || msg.type === 'unknown' || (msg.type === 'text' && !msg.text?.body?.trim())) {
    logWebhookEvent('empty_message', { messageId, from: redactPhone(phone) });
    await sendTextMessage(phone, '👋 Je n\'ai pas bien compris votre message. Pourriez-vous reformuler votre question ?\n\nExemples :\n• "Mon vol AF1234 est à quelle heure ?"\n• "Où manger au terminal 2E ?"\n• "Comment aller à Paris depuis CDG ?"');
    return;
  }

  // ── Edge Case: Image/Video/Audio/Sticker/Document ──
  if (!['text', 'interactive'].includes(msg.type)) {
    const typeResponses: Record<string, string> = {
      image: "📷 Merci pour votre photo ! Malheureusement, je ne peux pas traiter les images pour le moment.\n\nVous pouvez me décrire ce que vous cherchez en texte :\n• Numéro de vol\n• Restaurant\n• Service\n• Transport",
      video: "🎬 Je ne traite pas les vidéos pour le moment. Envoyez-moi votre question en texte !",
      audio: "🎤 Je ne peux pas écouter les messages vocaux. Tapez votre question et je vous aiderai ! 😊",
      sticker: "😊 Sympa ! Mais je réponds mieux au texte. Que puis-je faire pour vous ?",
      document: "📄 Je ne peux pas encore lire les documents envoyés directement. Pour importer des documents dans notre base de connaissances, utilisez le portail admin.",
      location: "📍 Merci pour votre position ! Pourriez-vous me décrire ce que vous cherchez à proximité ? (restaurant, taxi, information...)",
      contacts: "📇 Je ne peux pas traiter les contacts. Comment puis-je vous aider ?",
    };

    await sendTextMessage(phone, typeResponses[msg.type] || typeResponses.image);
    return;
  }

  // ── Extract message text ──
  let userText = '';
  if (msg.type === 'text' && msg.text?.body) {
    userText = msg.text.body.trim();
  } else if (msg.type === 'interactive') {
    userText = msg.interactive?.list_reply?.title || msg.interactive?.button_reply?.title || '';
  }

  if (!userText) {
    await sendTextMessage(phone, "🤔 Je n'ai pas pu lire votre message. Pourriez-vous réessayer en tapant votre question ?");
    return;
  }

  // ── Edge Case: Very long message ──
  if (userText.length > 4000) {
    await sendTextMessage(phone, "📝 Votre message est trop long. Pourriez-vous le raccourcir ? Je traite les questions de moins de 4000 caractères.");
    return;
  }

  // ── 6. Detect Language ──
  const language = detectLanguage(userText);

  // ── 7. Detect Intent ──
  const intent = detectIntent(userText);

  // ── Find or create conversation ──
  let conversation = await db.conversation.findUnique({
    where: { whatsappId: phone },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        whatsappId: phone,
        language,
        status: 'active',
      },
    });
  } else {
    // Update existing conversation
    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessage: new Date(), status: 'active', language },
    });
  }

  // Store user message
  await db.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'inbound',
      content: userText,
      messageType: msg.type,
      intent,
      confidence: 0.85,
    },
  });

  // ── 8. RAG Search ──
  const ragContext = await searchKnowledgeBase(userText);

  // ── Edge Case: Knowledge base empty + simple greeting ──
  if (!ragContext && (intent === 'greeting' || intent === 'goodbye')) {
    const staticReply = intent === 'greeting'
      ? STATIC_FALLBACK_RESPONSES.greeting
      : "Au revoir ! ✈️ Bon voyage avec AeroAssist. N'hésitez pas à me recontacter si besoin !";

    await sendTextMessage(phone, staticReply);
    await storeOutboundMessage(conversation.id, staticReply, intent, 1.0);
    return;
  }

  // ── 9. Build System Prompt ──
  const systemPrompt = await buildSystemPrompt(language, ragContext, intent);

  // ── 10. Get Conversation History ──
  const history = await db.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: { direction: true, content: true },
  });

  const chatHistory = history.map((m) => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.content,
  }));

  // ── 11. Call AI ──
  const aiResult = await callAI(systemPrompt, chatHistory);

  let replyText: string;

  if (!aiResult.reply) {
    // AI failed - use static fallback
    replyText = getStaticFallback(intent);
    logAIEvent('fallback_used', { intent, lastError: 'Empty response' });
  } else {
    replyText = aiResult.reply;

    // Edge Case: Empty knowledge base - add disclaimer
    if (!ragContext && aiResult.model === 'fallback') {
      replyText += '\n\n_⚠️ Service en mode dégradé - certaines informations peuvent ne pas être à jour._';
    }
  }

  // ── 12. Send Reply ──
  const sendResult = await sendTextMessage(phone, replyText);

  if (!sendResult.success) {
    logger.error('Failed to send WhatsApp reply', {
      messageId,
      error: sendResult.error,
    });
    // We still stored the message, just failed to deliver
  }

  // ── 13. Store outbound message ──
  await storeOutboundMessage(
    conversation.id,
    replyText,
    intent,
    aiResult.confidence
  );

  // ── 14. Analytics ──
  await db.analyticsEvent.create({
    data: {
      eventType: 'message_sent',
      metadata: JSON.stringify({
        intent,
        language,
        model: aiResult.model,
        hasRAG: !!ragContext,
        whatsappMessageId: sendResult.messageId,
      }),
    },
  });
}

// ── Helper: Store outbound message ───────────────────────────────

async function storeOutboundMessage(
  conversationId: string,
  content: string,
  intent: string,
  confidence: number
): Promise<void> {
  try {
    await db.message.create({
      data: {
        conversationId,
        direction: 'outbound',
        content,
        messageType: 'text',
        intent,
        confidence,
      },
    });
  } catch (error) {
    logger.error('Failed to store outbound message', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ── Helper: Redact phone for logs ────────────────────────────────

function redactPhone(phone: string): string {
  if (phone.length <= 4) return '[REDACTED]';
  return phone.slice(0, 3) + '***' + phone.slice(-2);
}
