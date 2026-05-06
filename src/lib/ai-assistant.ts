/**
 * AeroAssist — AI Assistant
 * Orchestrates RAG retrieval + Groq generation with context management.
 *
 * Flow:
 * 1. Detect language from user message
 * 2. Detect intent
 * 3. Search knowledge base (RAG)
 * 4. Build dynamic system prompt with RAG context + active modules
 * 5. Retrieve conversation history (last 10 messages)
 * 6. Call Groq AI with full context
 * 7. Fallback to static FAQ if Groq fails
 * 8. Return structured response with metadata
 */

import { db } from './db';
import { searchKnowledgeBase, detectCategory } from './rag';
import logger, { logAIEvent } from './logger';

// ── Types ────────────────────────────────────────────────────────

export interface AIResponse {
  reply: string;
  confidence: number;
  model: string;
  intent: string;
  language: string;
  ragUsed: boolean;
  ragEntries?: number;
  responseTimeMs: number;
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ── Language Detection ──────────────────────────────────────────

const LANGUAGE_PATTERNS: Record<string, RegExp> = {
  fr: /\b(bonjour|bonsoir|merci|au revoir|vol|aéroport|retard|départ|arrivée|restaurant|manger|bagage|toilette|taxi|bus|rer|salut|coucou|comment|où|quel|quand|aide|problème|réserver|réservation|hôtel|vip|wifi|douane|sécurité|terminal|porte|embarquement|atterrissage|décollage|navette|parking|boutique|acheter|duty free|shopping|plainte|perdu|valise|caf|dîner|déjeuner|information|service|consigne)\b/i,
  en: /\b(hello|hi|good morning|good evening|thank you|bye|flight|airport|delay|departure|arrival|restaurant|eat|baggage|luggage|restroom|toilet|taxi|bus|train|parking|shop|buy|duty free|complaint|lost|suitcase|food|drink|hungry|thirsty|help|problem|book|reservation|hotel|room|vip|wifi|customs|security|terminal|gate|boarding|landing|takeoff|shuttle|metro|store|purchase|please|sorry|welcome)\b/i,
  es: /\b(hola|buenos días|buenas noches|gracias|adiós|vuelo|aeropuerto|retraso|salida|llegada|restaurante|comer|equipaje|taxi|autobús|tren|ayuda|problema|reservar|hotel|wifi|aduana|seguridad|terminal|puerta|embarque)\b/i,
  de: /\b(hallo|guten morgen|danke|auf wiedersehen|flug|flughafen|verspätung|abflug|ankunft|restaurant|essen|gepäck|toilette|taxi|bus|zug|hilfe|problem|buchen|hotel|wifi|zoll|sicherheit|terminal|tor|einstieg)\b/i,
  pt: /\b(olá|bom dia|obrigado|voo|aeroporto|atraso|restaurante|comer|bagagem|táxi|autocarro|trem|ajuda|problema|reservar|hotel)\b/i,
};

function detectLanguage(text: string): string {
  const scores: Record<string, number> = {};
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    const matches = text.match(pattern);
    scores[lang] = matches ? matches.length : 0;
  }
  const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  return best && best[1] > 0 ? best[0] : 'fr';
}

// ── Intent Detection ────────────────────────────────────────────

const INTENT_KEYWORDS: Record<string, string[]> = {
  flight_status: ['vol', 'départ', 'arrivée', 'retard', 'annulé', 'gate', 'porte', 'terminal', 'embarquement', 'atterrissage', 'flight', 'décoller', 'board', 'landing', 'departure', 'arrival'],
  restaurant: ['restaurant', 'manger', 'repas', 'café', 'dîner', 'déjeuner', 'boire', 'faim', 'soif', 'gastronomie', 'eat', 'food', 'hungry'],
  shops: ['boutique', 'acheter', 'magasin', 'duty free', 'shopping', 'cadeau', 'promotion', 'soldes', 'achat', 'shop', 'buy', 'store'],
  service_info: ['wifi', 'salon', 'vip', 'consigne', 'bagage', 'toilette', 'détente', 'zone', 'service', 'douane', 'sécurité', 'loung', 'restroom'],
  transport: ['taxi', 'bus', 'rer', 'navette', 'parking', 'voiture', 'train', 'métro', 'transport', 'accès', 'cab', 'uber'],
  reservation: ['réserver', 'réservation', 'louer', 'hôtel', 'chambre', 'salon vip', 'location', 'book', 'reserve', 'hotel'],
  lost_baggage: ['bagage perdu', 'valise', 'retrouver', 'objet perdu', 'perdu', 'lost', 'luggage', 'suitcase'],
  complaint: ['plainte', 'problème', 'mécontent', 'insatisfait', 'réclamation', 'mauvais', 'complaint', 'problem'],
  greeting: ['bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'coucou', 'good morning', 'hola', 'hallo'],
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

// ── Build System Prompt ─────────────────────────────────────────

async function buildSystemPrompt(
  language: string,
  ragContext: string,
  intent: string,
  categoryHint?: string | null
): Promise<string> {
  // Get active modules
  let activeModules: string[] = [];
  try {
    const modules = await db.module.findMany({
      where: { isActive: true },
      select: { name: true, description: true },
    });
    activeModules = modules.map((m) => `• ${m.name}: ${m.description || ''}`);
  } catch {
    activeModules = ['• Vols', '• Restaurants', '• Services Aéroport', '• Transports'];
  }

  const langInstructions: Record<string, string> = {
    fr: "Tu es AeroAssist, l'assistant virtuel intelligent des aéroports Charles de Gaulle (CDG) et Orly (ORY). Tu réponds TOUJOURS en français.",
    en: "You are AeroAssist, the virtual airport assistant for Charles de Gaulle (CDG) and Orly (ORY) airports. You ALWAYS respond in English.",
    es: "Eres AeroAssist, el asistente virtual de los aeropuertos Charles de Gaulle (CDG) y Orly (ORY). Respondes SIEMPRE en español.",
    de: "Du bist AeroAssist, der virtuelle Flughafenassistent für Charles de Gaulle (CDG) und Orly (ORY). Du antwortest IMMER auf Deutsch.",
    pt: "Você é AeroAssist, o assistente virtual dos aeroportos Charles de Gaulle (CDG) e Orly (ORY). Responde SEMPRE em português.",
  };

  const ragSection = ragContext
    ? `## Contexte RAG (Base de connaissances) :\n${ragContext}`
    : '## Contexte RAG :\nAucune information spécifique trouvée dans la base de connaissances.';

  return `${langInstructions[language] || langInstructions.fr}

${ragSection}

## Modules Actifs :
${activeModules.join('\n') || 'Aucun module actif'}

## Aéroports couverts :
- Charles de Gaulle (CDG) — Terminal 1, 2A-2F, 2G, 3
- Orly (ORY) — Ouest, Sud

## Règles STRICTES :
- Réponds de manière concise et utile (max 500 caractères si possible)
- Utilise des emojis pertinents ✈️🍽️🛍️🏨🚗
- Structure les réponses avec des listes quand c'est pertinent
- Si tu ne connais pas la réponse, dis-le honnêtement
- Pour les urgences médicales ou de sécurité, dirige vers les services d'urgence
- N'invente JAMAIS d'informations (pas d'hallucination)
- Format de date : JJ/MM/AAAA, heure : HH:MM (Paris CET/CEST)
- Si on te demande de réserver, vérifie que le module correspondant est actif

## Intention détectée : ${intent}
${categoryHint ? `## Catégorie suggérée : ${categoryHint}` : ''}`;
}

// ── Get Conversation History ───────────────────────────────────

async function getConversationHistory(
  conversationId: string,
  maxTurns = 10
): Promise<ConversationTurn[]> {
  try {
    const messages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: maxTurns,
      select: { direction: true, content: true },
    });

    return messages.map((m) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
    }));
  } catch {
    return [];
  }
}

// ── Static FAQ Fallback ────────────────────────────────────────

const STATIC_FALLBACK: Record<string, string> = {
  greeting: "✈️ *Bonjour ! Bienvenue sur AeroAssist !*\n\nJe suis votre assistant virtuel pour CDG et ORY.\n\nComment puis-je vous aider ?\n\n1️⃣ Statut d'un vol\n2️⃣ Restaurants & Cafés\n3️⃣ Boutiques & Duty Free\n4️⃣ Services aéroport\n5️⃣ Transports\n6️⃣ Réservations",
  flight_status: "✈️ *Statut des vols*\n\nIndiquez le numéro de vol (ex: AF1234) et l'aéroport (CDG/ORY).\n\n_Infos temps réel : paris.aeroport.fr_",
  restaurant: "🍽️ *Restaurants ouverts*\n\n📍 CDG T2E : Brasserie Flo, Paul\n📍 CDG T2F : Pret A Manger, Starbucks\n📍 ORY Ouest : Bistro Parisien\n📍 ORY Sud : La Table du Chef",
  transport: "🚗 *Transports*\n\n🚕 Taxis devant chaque terminal\n🚇 RER B : CDG → Paris (35 min)\n🚌 Roissybus, Orlybus, Filéo\n🚗 Location : Avis, Hertz, Europcar",
  service_info: "🏨 *Services*\n\n📶 WiFi gratuit : \"WiFi-AERO\"\n🛋️ Salons VIP T2E CDG\n🧳 Consignes T1 et T2\n🏦 Bureaux de change tous terminaux",
  shops: "🛍️ *Boutiques Duty Free*\n\n📍 CDG T2E : Chanel, Dior, Hermès\n📍 CDG T2F : Sephora, FNAC\n📍 ORY Ouest : Longchamp, Guerlain",
  default: "🤖 *AeroAssist — Mode dégradé*\n\nNotre IA est temporairement indisponible.\n\nQue puis-je faire pour vous ?\n• Statut de vol\n• Restaurants & Boutiques\n• Transports\n• Services aéroport\n\n_Si urgent : appelez le 3950._",
};

// ── Main: Process User Message ─────────────────────────────────

export async function processAssistantMessage(
  userText: string,
  conversationId: string,
  options?: { skipAI?: boolean }
): Promise<AIResponse> {
  const start = Date.now();

  // 1. Detect language
  const language = detectLanguage(userText);

  // 2. Detect intent
  const intent = detectIntent(userText);

  // 3. Detect category hint
  const categoryHint = detectCategory(userText);

  // 4. RAG search
  const rag = await searchKnowledgeBase(userText, intent, {
    maxResults: 5,
    category: categoryHint || undefined,
  });

  // 5. Handle greetings/goodbyes without AI
  if (intent === 'greeting') {
    return {
      reply: STATIC_FALLBACK.greeting,
      confidence: 1.0,
      model: 'static',
      intent,
      language,
      ragUsed: false,
      responseTimeMs: Date.now() - start,
    };
  }

  if (intent === 'goodbye') {
    return {
      reply: "Au revoir ! ✈️ Bon voyage avec AeroAssist !",
      confidence: 1.0,
      model: 'static',
      intent,
      language,
      ragUsed: false,
      responseTimeMs: Date.now() - start,
    };
  }

  // 6. Build system prompt
  const systemPrompt = await buildSystemPrompt(language, rag.context, intent, categoryHint);

  // 7. Get conversation history
  const history = await getConversationHistory(conversationId, 10);

  // 8. Call Groq AI
  let reply: string;
  let confidence: number;
  let model: string;

  const aiResult = await callGroq(systemPrompt, history);

  if (aiResult.reply) {
    reply = aiResult.reply;
    confidence = aiResult.confidence;
    model = 'groq';
  } else {
    // Fallback to static response
    reply = STATIC_FALLBACK[intent] || STATIC_FALLBACK.default;
    confidence = 0.3;
    model = 'fallback';

    if (!rag.context) {
      reply += '\n\n_⚠️ Service dégradé — informations possiblement obsolètes._';
    }
  }

  return {
    reply,
    confidence,
    model,
    intent,
    language,
    ragUsed: rag.chunks.length > 0,
    ragEntries: rag.chunks.length,
    responseTimeMs: Date.now() - start,
  };
}

// ── Call Groq AI ────────────────────────────────────────────────

async function callGroq(
  systemPrompt: string,
  chatHistory: ConversationTurn[],
  maxRetries = 2
): Promise<{ reply: string; confidence: number }> {
  let lastError = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...chatHistory.slice(-10).map((turn) => ({
          role: turn.role as 'user' | 'assistant',
          content: turn.content,
        })),
      ];

      const completion = await zai.chat.completions.create({ messages });

      const reply = completion?.choices?.[0]?.message?.content;
      if (!reply) {
        lastError = 'Empty AI response';
        continue;
      }

      logAIEvent('response_generated', {
        model: 'groq',
        replyLength: reply.length,
        attempt: attempt + 1,
        contextLength: chatHistory.length,
      });

      return { reply, confidence: 0.9 };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      logger.error(`Groq AI call failed (attempt ${attempt + 1})`, { error: lastError });

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  logger.warn('Groq AI exhausted retries, using fallback', { lastError });
  return { reply: '', confidence: 0.3 };
}
