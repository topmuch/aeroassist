import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(4000, 'Message too long'),
  conversationId: z.string().optional(),
  language: z.string().optional().default('fr'),
});

const SYSTEM_PROMPT = `Tu es AeroAssist, l'assistant virtuel intelligent de l'aéroport. Tu aides les voyageurs en français (ou dans leur langue si demandé) avec les informations et services suivants :

## Tes compétences :
1. **Vols** : Vérifier les statuts de vols (départs/arrivées), portes d'embarquement, terminaux, retards
2. **Restaurants & Cafés** : Recommander des restaurants, informer sur les horaires d'ouverture, la disponibilité
3. **Boutiques & Duty Free** : Informations sur les boutiques, promotions, produits disponibles
4. **Services aéroport** : WiFi, salons VIP, consigne à bagages, toilettes, zones de repos
5. **Transports** : Navettes, taxis, RER, bus, parking
6. **Réservations** : Aider avec les réservations de salons VIP, hôtels, location de voitures
7. **Informations générales** : Règles de sécurité, taille des bagages, documents de voyage

## Règles :
- Réponds toujours de manière polie, professionnelle et concise
- Si tu ne connais pas la réponse, propose d'escalader à un agent humain
- Utilise des emojis pertinents pour rendre la conversation agréable
- Fournis des informations précises sur les horaires et les lieux
- Adapte ta langue à celle du voyageur
- Pour les urgences, dirige immédiatement vers les services compétents

Tu travailles principalement pour les aéroports Charles de Gaulle (CDG) et Orly (ORY) en région parisienne.

Détecte l'intention de l'utilisateur et classe-la dans une de ces catégories : flight_status, restaurant_recommendation, shop_info, service_info, transport_info, reservation, lost_baggage, complaint, greeting, goodbye, general_inquiry`;

const INTENT_KEYWORDS: Record<string, string[]> = {
  flight_status: ['vol', 'départ', 'arrivée', 'retard', 'annulé', 'gate', 'porte', 'terminal', 'embarquement', 'atterrissage', 'flight', 'décoller', 'atterri'],
  restaurant_recommendation: ['restaurant', 'manger', 'repas', 'café', 'dîner', 'déjeuner', 'boire', 'faim', 'soif', 'manger', 'gastronomie'],
  shop_info: ['boutique', 'acheter', 'magasin', 'duty free', 'shopping', 'cadeau', 'promotion', 'soldes', 'achat'],
  service_info: ['wifi', 'salon', 'vip', 'consigne', 'bagage', 'toilette', 'détente', 'zone', 'service', 'info', 'douane', 'sécurité'],
  transport_info: ['taxi', 'bus', 'rer', 'navette', 'parking', 'voiture', 'train', 'métro', 'transport', 'accès'],
  reservation: ['réserver', 'réservation', 'louer', 'hôtel', 'chambre', 'salon vip', 'location'],
  lost_baggage: ['bagage perdu', 'valise', 'retrouver', 'objet perdu', 'perdu'],
  complaint: ['plainte', 'problème', 'mécontent', 'insatisfait', 'réclamation', 'mauvais', 'horrible'],
  greeting: ['bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'coucou', 'bonsoir'],
  goodbye: ['merci', 'au revoir', 'adieu', 'bye', 'à bientôt', 'bonne journée'],
  general_inquiry: ['information', 'aide', 'comment', 'quel', 'où', 'quand', 'pourquoi'],
};

function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return intent;
      }
    }
  }
  return 'general_inquiry';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { message, conversationId, language } = parsed.data;
    const detectedIntent = detectIntent(message);

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
          whatsappId: `wa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
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
        intent: detectedIntent,
        confidence: 0.85,
      },
    });

    // Call LLM via z-ai-web-dev-sdk
    const zai = await ZAI.create();

    const conversationHistory = await db.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { direction: true, content: true },
    });

    const chatMessages = conversationHistory.map((msg) => ({
      role: (msg.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
    }));

    // Add the new user message at the end if not already present
    if (chatMessages.length === 0 || chatMessages[chatMessages.length - 1].content !== message) {
      chatMessages.push({ role: 'user', content: message });
    }

    const systemLanguage =
      language === 'en'
        ? 'You are AeroAssist, the virtual assistant for Paris airports (CDG, ORY). Respond in English.'
        : language === 'es'
          ? 'Eres AeroAssist, el asistente virtual de los aeropuertos de París (CDG, ORY). Responde en español.'
          : language === 'de'
            ? 'Du bist AeroAssist, der virtuelle Assistent der Pariser Flughäfen (CDG, ORY). Antworte auf Deutsch.'
            : SYSTEM_PROMPT;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemLanguage },
        ...chatMessages,
      ],
    });

    const reply =
      completion?.choices?.[0]?.message?.content ??
      'Je suis désolé, une erreur est survenue. Veuillez réessayer.';

    // Store AI response
    await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: reply,
        messageType: 'text',
        intent: detectedIntent,
        confidence: 0.9,
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
        eventType: 'intent_detected',
        metadata: JSON.stringify({ intent: detectedIntent, language }),
      },
    });

    return NextResponse.json({
      reply,
      conversationId: conversation.id,
      intent: detectedIntent,
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
