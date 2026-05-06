/**
 * WhatsApp Business API Integration
 * Uses Meta Cloud API v17.0 for sending messages
 * Full production code with retry logic, error handling, and template support
 */

import logger, { logWebhookEvent, logSecurityEvent } from './logger';
import crypto from 'crypto';

// ── Types ────────────────────────────────────────────────────────

interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  verifyToken: string;
}

interface SendMessagePayload {
  to: string;
  type: 'text' | 'interactive' | 'template' | 'location' | 'document';
  text?: { body: string; preview_url?: boolean };
  interactive?: {
    type: 'button' | 'list' | 'reply_button';
    body?: { text: string };
    action?: Record<string, unknown>;
  };
  template?: {
    name: string;
    language: { code: string };
    components?: Array<Record<string, unknown>>;
  };
}

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{
    id: string;
    status: string;
    timestamp: string;
    recipient_type: string;
  }>;
}

export interface InboundMessage {
  from: string;        // WhatsApp phone number (e.g., "33612345678")
  id: string;          // Message ID from WhatsApp
  type: string;        // "text", "image", "interactive", "location", etc.
  timestamp: string;   // Unix timestamp
  text?: { body: string; preview_url?: boolean };
  image?: { id: string; caption?: string; mime_type: string; sha256: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  interactive?: { type: string; list_reply?: { id: string; title: string }; button_reply?: { id: string; title: string } };
  document?: { id: string; caption?: string; filename: string; mime_type: string; sha256: string };
  audio?: { id: string; mime_type: string };
  voice?: { id: string; mime_type: string };
  sticker?: { id: string; mime_type: string };
  video?: { id: string; caption?: string; mime_type: string };
  contacts?: { contacts: unknown[] };
  reactions?: { emoji: string; message_id: string };
  system?: { type: string; body: string };
  context?: { from: string; id: string; group_id?: string };
  errors?: Array<{ code: number; title: string; message: string }>;
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    field: string;
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: InboundMessage[];
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
        conversation?: { id: string; origin: { type: string } };
        pricing?: { billable: boolean; pricing_model: string; category: string };
        errors?: Array<{ code: number; title: string; message: string }>;
      }>;
    };
  }>;
}

// ── Config ───────────────────────────────────────────────────────

function getConfig(): WhatsAppConfig {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v17.0';

  if (!token || !phoneId || !verifyToken) {
    logSecurityEvent('whatsapp_config_incomplete', {
      hasToken: !!token,
      hasPhoneId: !!phoneId,
      hasVerifyToken: !!verifyToken,
    });
  }

  return {
    accessToken: token || '',
    phoneNumberId: phoneId || '',
    apiVersion,
    verifyToken: verifyToken || '',
  };
}

// ── Webhook Signature Verification ───────────────────────────────

/**
 * Verify that a webhook request genuinely comes from Meta.
 * Uses HMAC-SHA256 with the App Secret.
 * See: https://developers.facebook.com/docs/messenger-platform/webhooks#security
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null
): { valid: boolean; error?: string; warning?: string } {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // In development/test, skip signature verification if secret is not configured
  if (!appSecret) {
    logSecurityEvent('webhook_sig_skipped', {
      warning: 'WHATSAPP_APP_SECRET not configured — signature verification DISABLED. Set this in production!',
    });
    return { valid: true, warning: 'Signature verification skipped (no WHATSAPP_APP_SECRET)' };
  }

  if (!signatureHeader) {
    return { valid: false, error: 'Missing X-Hub-Signature-256 header' };
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(payload, 'utf8')
    .digest('hex')}`;

  // Constant-time comparison to prevent timing attacks
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signatureHeader, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
    return { valid: isValid };
  } catch {
    // Lengths differ - clearly invalid
    return { valid: false, error: 'Signature length mismatch' };
  }
}

// ── Webhook Verification (GET) ───────────────────────────────────

/**
 * Handles Meta's initial webhook verification challenge.
 * Called by Meta when you subscribe to the webhook.
 */
export function verifyWebhookChallenge(
  mode: string,
  token: string,
  challenge: string
): { success: boolean; statusCode: number; body?: string } {
  const config = getConfig();

  if (mode === 'subscribe' && token === config.verifyToken) {
    logger.info('WhatsApp webhook verified successfully');
    return { success: true, statusCode: 200, body: challenge };
  }

  logSecurityEvent('webhook_verify_failed', { mode, tokenProvided: !!token });
  return { success: false, statusCode: 403, body: 'Forbidden' };
}

// ── Send Message ─────────────────────────────────────────────────

/**
 * Send a text message via WhatsApp Business API.
 * Includes retry logic with exponential backoff.
 */
export async function sendTextMessage(
  to: string,
  body: string,
  previewUrl = false
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig();

  // Early exit if WhatsApp is not configured
  if (!config.accessToken || !config.phoneNumberId) {
    logSecurityEvent('whatsapp_send_skipped', {
      reason: 'WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured',
      to: redactPhone(to),
    });
    return { success: false, error: 'WhatsApp not configured (missing access token or phone number ID)' };
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const payload: SendMessagePayload = {
    to,
    type: 'text',
    text: { body, preview_url: previewUrl },
  };

  // Retry with exponential backoff (max 3 retries)
  const maxRetries = 3;
  let lastError = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
        lastError = errorMsg;

        logger.error(`WhatsApp API error (attempt ${attempt + 1}/${maxRetries + 1})`, {
          statusCode: response.status,
          error: errorMsg,
          to: redactPhone(to),
        });

        // Retry on 429 (rate limit) or 5xx (server error)
        if (response.status === 429 || response.status >= 500) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await sleep(delay);
          continue;
        }

        return { success: false, error: errorMsg };
      }

      const data: WhatsAppMessageResponse = await response.json();
      const messageId = data.messages?.[0]?.id;

      logWebhookEvent('outbound', {
        messageId,
        recipient: redactPhone(to),
        type: 'text',
        bodyLength: body.length,
      });

      return { success: true, messageId };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`WhatsApp send error (attempt ${attempt + 1}/${maxRetries + 1})`, {
        error: lastError,
        to: redactPhone(to),
      });

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await sleep(delay);
      }
    }
  }

  return { success: false, error: `Max retries exceeded: ${lastError}` };
}

/**
 * Send an interactive message with quick reply buttons.
 */
export async function sendInteractiveMessage(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig();
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const payload = {
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title.slice(0, 20) },
        })),
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData?.error?.message || `HTTP ${response.status}` };
    }

    const data = await response.json();
    logWebhookEvent('outbound', {
      messageId: data.messages?.[0]?.id,
      recipient: redactPhone(to),
      type: 'interactive',
      buttonCount: buttons.length,
    });

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/**
 * Send a template message (useful for welcome, notifications, etc.)
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode = 'fr',
  components?: Array<Record<string, unknown>>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig();
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components && { components }),
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData?.error?.message || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

// ── Parse Inbound Webhook ────────────────────────────────────────

/**
 * Parse the raw webhook payload from Meta and extract relevant messages.
 */
export function parseWebhookPayload(body: unknown): {
  messages: Array<InboundMessage & { contactName?: string; contactWaId?: string }>;
  statuses: Array<unknown>;
  metadata?: { display_phone_number: string; phone_number_id: string };
} {
  const result = {
    messages: [] as Array<InboundMessage & { contactName?: string; contactWaId?: string }>,
    statuses: [] as Array<unknown>,
    metadata: undefined as { display_phone_number: string; phone_number_id: string } | undefined,
  };

  if (!body || typeof body !== 'object') return result;

  const entry = (body as { entry?: WhatsAppWebhookEntry[] }).entry;
  if (!Array.isArray(entry)) return result;

  for (const e of entry) {
    for (const change of e.changes) {
      if (change.value.metadata) {
        result.metadata = change.value.metadata;
      }

      // Extract contacts info for sender identification
      const contactInfo = change.value.contacts?.[0];

      if (Array.isArray(change.value.messages)) {
        for (const msg of change.value.messages) {
          result.messages.push({
            ...msg,
            contactName: contactInfo?.profile?.name,
            contactWaId: contactInfo?.wa_id,
          });
        }
      }

      if (Array.isArray(change.value.statuses)) {
        result.statuses.push(...change.value.statuses);
      }
    }
  }

  return result;
}

// ── Utility: Send typing indicator ───────────────────────────────

export async function sendTypingIndicator(to: string): Promise<void> {
  const config = getConfig();
  if (!config.accessToken || !config.phoneNumberId) return; // Skip if not configured

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'reaction',
        reaction: { message: '', emoji: '' },
      }),
    });
  } catch {
    // Typing indicator is best-effort, don't throw
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redactPhone(phone: string): string {
  if (phone.length <= 4) return '[REDACTED]';
  return phone.slice(0, 3) + '***' + phone.slice(-2);
}

// ── Static FAQ Fallback (when Groq is down) ──────────────────────

export const STATIC_FALLBACK_RESPONSES: Record<string, string> = {
  greeting: "✈️ *Bonjour ! Bienvenue sur AeroAssist !*\n\nJe suis votre assistant virtuel pour les aéroports Charles de Gaulle (CDG) et Orly (ORY).\n\nComment puis-je vous aider ?\n\n1️⃣ Statut d'un vol\n2️⃣ Restaurants & Cafés\n3️⃣ Boutiques & Duty Free\n4️⃣ Services aéroport (WiFi, salons VIP...)\n5️⃣ Transports\n6️⃣ Réservations",
  flight_status: "✈️ *Statut des vols*\n\nPour connaître le statut d'un vol, merci d'indiquer :\n• Le numéro de vol (ex: AF1234)\n• L'aéroport (CDG ou ORY)\n\n_Notre service est temporairement réduit. Pour les infos en temps réel, consultez :_ paris.aeroport.fr",
  restaurant: "🍽️ *Restaurants*\n\nLes principaux restaurants ouverts :\n\n📍 *CDG Terminal 2E* : Brasserie Flo, Paul\n📍 *CDG Terminal 2F* : Pret A Manger, Starbucks\n📍 *ORY Ouest* : Bistro Parisien, Quick\n📍 *ORY Sud* : La Table du Chef\n\n_Servez-vous de nos boutiques ! N'hésitez pas à demander des détails._",
  transport: "🚗 *Transports depuis l'aéroport*\n\n🚕 *Taxis* : Disponibles devant chaque terminal\n🚇 *RER B* : CDG → Paris centre (35 min)\n🚌 *Bus* : Roissybus, Orlybus, Filéo\n🚗 *Location* : Avis, Hertz, Europcar\n✈️ *Navettes* : Entre terminaux CDG\n\n_Besoin d'informations spécifiques ?_",
  service_info: "🏨 *Services Aéroport*\n\n📶 *WiFi* : Gratuit, réseau \"WiFi-AERO\"\n🛋️ *Salons VIP* : Terminal 2E CDG\n🧳 *Consignes* : Disponibles T1 et T2\n🛃 *Douane* : Passeport + billet requis\n🏦 *Devises* : Bureaux de change dans tous les terminaux\n\n_Autre chose ?_",
  shops: "🛍️ *Boutiques & Duty Free*\n\n📍 *CDG T2E* : Chanel, Dior, Hermès\n📍 *CDG T2F* : Sephora, FNAC, Relay\n📍 *ORY Ouest* : Longchamp, Guerlain\n📍 *ORY Sud* : Clinique, MAC\n\n_Votre billet d'avion ouvre droit aux prix Duty Free !_",
  default: "🤖 *AeroAssist*\n\nJe suis actuellement en mode dégradé. Nos équipes travaillent à rétablir le service complet.\n\nEn attendant, je peux vous aider avec :\n• Statut de vol\n• Restaurants & Boutiques\n• Transports\n• Services aéroport\n\n_Si votre demande est urgente, appelez le service client au 3950._",
};
