/**
 * AeroAssist — WhatsApp Service
 * Unified WhatsApp messaging via OpenBSP bridge or Meta Cloud API
 *
 * Provider priority:
 * 1. OpenBSP (self-hosted, port 3001) — preferred for full control
 * 2. Meta Cloud API — fallback for production
 */

import logger, { logWebhookEvent, logSecurityEvent } from './logger';

// ── Types ────────────────────────────────────────────────────────

type WhatsAppProvider = 'openbsp' | 'meta' | 'none';

interface OpenBSPPayload {
  chatId: string;       // WhatsApp JID: "33612345678@s.whatsapp.net"
  text?: string;
  file?: string;        // base64 or URL
  fileName?: string;
  caption?: string;
}

interface OpenBSPResponse {
  status: boolean;
  messageId?: string;
  chatId?: string;
  error?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  provider: WhatsAppProvider;
  error?: string;
}

// ── Provider Detection ──────────────────────────────────────────

function getProvider(): WhatsAppProvider {
  const openbspUrl = process.env.OPENBSP_API_URL;
  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN;

  // If OpenBSP is configured, prefer it
  if (openbspUrl) return 'openbsp';

  // Fall back to Meta if configured
  if (metaToken) return 'meta';

  return 'none';
}

function getOpenBSPBaseUrl(): string {
  return (process.env.OPENBSP_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
}

function toJid(phone: string): string {
  // Convert E.164 (+33612345678) or bare number to WhatsApp JID
  const clean = phone.replace(/[^0-9]/g, '');
  return `${clean}@s.whatsapp.net`;
}

function fromJid(jid: string): string {
  // Extract phone number from WhatsApp JID
  return jid.split('@')[0] || jid;
}

// ── E.164 Validation ───────────────────────────────────────────

export function validatePhoneNumber(phone: string): { valid: boolean; normalized?: string; error?: string } {
  const clean = phone.replace(/[\s\-\(\)\.]/g, '');

  // Support +33 prefix or 0 prefix (French numbers)
  let normalized: string;
  if (clean.startsWith('+')) {
    // Already E.164
    normalized = clean;
  } else if (clean.startsWith('33') && clean.length >= 11) {
    normalized = `+${clean}`;
  } else if (clean.startsWith('0') && clean.length >= 10) {
    normalized = `+33${clean.slice(1)}`;
  } else {
    normalized = clean;
  }

  // Basic validation: 8-15 digits
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return { valid: false, error: `Invalid phone number length: ${digits.length} digits (expected 8-15)` };
  }

  return { valid: true, normalized };
}

// ── OpenBSP: Send Text ──────────────────────────────────────────

async function sendViaOpenBSP(phone: string, text: string): Promise<SendMessageResult> {
  const baseUrl = getOpenBSPBaseUrl();
  const chatId = toJid(phone);

  const payload: OpenBSPPayload = { chatId, text };

  try {
    const response = await fetch(`${baseUrl}/api/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: OpenBSPResponse = await response.json().catch(() => ({
      status: false,
      error: `HTTP ${response.status}`,
    }));

    if (!response.ok || !data.status) {
      const errorMsg = data.error || `HTTP ${response.status}`;
      logSecurityEvent('openbsp_send_failed', {
        error: errorMsg,
        recipient: redactPhone(phone),
      });
      return { success: false, provider: 'openbsp', error: errorMsg };
    }

    logWebhookEvent('outbound_openbsp', {
      messageId: data.messageId,
      recipient: redactPhone(phone),
      type: 'text',
      bodyLength: text.length,
    });

    return { success: true, messageId: data.messageId, provider: 'openbsp' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logSecurityEvent('openbsp_connection_error', {
      error: msg,
      recipient: redactPhone(phone),
    });
    return { success: false, provider: 'openbsp', error: msg };
  }
}

// ── OpenBSP: Send Media ─────────────────────────────────────────

async function sendMediaViaOpenBSP(
  phone: string,
  mediaUrl: string,
  fileName: string,
  caption?: string
): Promise<SendMessageResult> {
  const baseUrl = getOpenBSPBaseUrl();
  const chatId = toJid(phone);

  const payload: OpenBSPPayload = {
    chatId,
    file: mediaUrl,
    fileName,
    caption,
  };

  try {
    const response = await fetch(`${baseUrl}/api/sendFile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: OpenBSPResponse = await response.json().catch(() => ({
      status: false,
      error: `HTTP ${response.status}`,
    }));

    if (!response.ok || !data.status) {
      return { success: false, provider: 'openbsp', error: data.error || `HTTP ${response.status}` };
    }

    logWebhookEvent('outbound_openbsp', {
      messageId: data.messageId,
      recipient: redactPhone(phone),
      type: 'media',
      fileName,
    });

    return { success: true, messageId: data.messageId, provider: 'openbsp' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, provider: 'openbsp', error: msg };
  }
}

// ── Meta: Send Text (existing logic) ────────────────────────────

async function sendViaMeta(phone: string, text: string): Promise<SendMessageResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || 'v17.0';

  if (!token || !phoneId) {
    return { success: false, provider: 'meta', error: 'Meta WhatsApp not configured' };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, provider: 'meta', error: errorData?.error?.message || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.messages?.[0]?.id, provider: 'meta' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, provider: 'meta', error: msg };
  }
}

// ── Meta: Send Template ────────────────────────────────────────

async function sendTemplateViaMeta(
  phone: string,
  templateName: string,
  languageCode = 'fr',
  components?: Array<Record<string, unknown>>
): Promise<SendMessageResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || 'v17.0';

  if (!token || !phoneId) {
    return { success: false, provider: 'meta', error: 'Meta WhatsApp not configured' };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components && { components }),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, provider: 'meta', error: errorData?.error?.message || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.messages?.[0]?.id, provider: 'meta' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, provider: 'meta', error: msg };
  }
}

// ── OpenBSP Health Check ───────────────────────────────────────

export async function checkOpenBSPHealth(): Promise<{
  status: 'up' | 'down' | 'degraded';
  latencyMs: number;
  details?: string;
}> {
  const baseUrl = getOpenBSPBaseUrl();
  const start = Date.now();

  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    const latencyMs = Date.now() - start;
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.status === 'ok') {
      return { status: 'up', latencyMs, details: `Sessions: ${data.sessions || 0}` };
    }

    return { status: 'degraded', latencyMs, details: `HTTP ${response.status}` };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      details: error instanceof Error ? error.message : 'Connection refused',
    };
  }
}

// ── Public API: Send Text Message ──────────────────────────────

export async function sendTextMessage(
  phone: string,
  text: string
): Promise<SendMessageResult> {
  const provider = getProvider();

  if (provider === 'openbsp') {
    return sendViaOpenBSP(phone, text);
  }

  if (provider === 'meta') {
    return sendViaMeta(phone, text);
  }

  // No provider configured — log and return error
  logSecurityEvent('whatsapp_no_provider', { phone: redactPhone(phone) });
  return { success: false, provider: 'none', error: 'No WhatsApp provider configured. Set OPENBSP_API_URL or WHATSAPP_ACCESS_TOKEN.' };
}

// ── Public API: Send Media Message ─────────────────────────────

export async function sendMediaMessage(
  phone: string,
  mediaUrl: string,
  fileName: string,
  caption?: string
): Promise<SendMessageResult> {
  const provider = getProvider();

  if (provider === 'openbsp') {
    return sendMediaViaOpenBSP(phone, mediaUrl, fileName, caption);
  }

  // Meta doesn't support direct media upload via this simple API
  return { success: false, provider, error: 'Media sending only supported via OpenBSP provider' };
}

// ── Public API: Send Template Message ──────────────────────────

export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  languageCode = 'fr',
  components?: Array<Record<string, unknown>>,
  parameters?: string[]
): Promise<SendMessageResult> {
  const provider = getProvider();

  if (provider === 'meta') {
    return sendTemplateViaMeta(phone, templateName, languageCode, components);
  }

  // OpenBSP: look up template from DB, substitute parameters, send as formatted text
  try {
    const { db } = await import('./db');
    const template = await db.whatsAppTemplate.findUnique({
      where: { name: templateName },
    });

    if (template?.bodyText) {
      let bodyText = template.bodyText;
      if (parameters) {
        parameters.forEach((param, idx) => {
          bodyText = bodyText.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), param);
        });
      }
      logWebhookEvent('template_sent_openbsp', { templateName, phone: redactPhone(phone), parameters: parameters?.length || 0 });
      return sendViaOpenBSP(phone, bodyText);
    }

    // Template not found in DB, send generic
    logWebhookEvent('template_not_found', { templateName, provider });
    return sendViaOpenBSP(phone, `[Template: ${templateName}] — Template introuvable.`);
  } catch (error) {
    logSecurityEvent('template_db_error', { error: error instanceof Error ? error.message : String(error) });
    return sendViaOpenBSP(phone, `[Template: ${templateName}] — Erreur de chargement.`);
  }
}

// ── Public API: Send Interactive Buttons ───────────────────────

export async function sendInteractiveMessage(
  phone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<SendMessageResult> {
  // For now, send as formatted text with numbered options
  const buttonList = buttons
    .slice(0, 3)
    .map((btn, i) => `${i + 1}️⃣ ${btn.title}`)
    .join('\n');

  const message = `${bodyText}\n\n${buttonList}\n\n_Reply with the number of your choice._`;
  return sendTextMessage(phone, message);
}

// ── Public API: Mark as Read ───────────────────────────────────

export async function markAsRead(_phone: string, _messageId: string): Promise<void> {
  // OpenBSP doesn't require explicit read receipts
  // Meta: handled via their API
  return;
}

// ── Helpers ─────────────────────────────────────────────────────

function redactPhone(phone: string): string {
  if (phone.length <= 4) return '[REDACTED]';
  return phone.slice(0, 3) + '***' + phone.slice(-2);
}

// ── Rate Limiting per Phone ────────────────────────────────────

const phoneRateLimits = new Map<string, { count: number; windowStart: number }>();
const PHONE_RATE_LIMIT = 20; // 20 messages per minute per phone
const PHONE_RATE_WINDOW = 60_000; // 1 minute

export function checkPhoneRateLimit(phone: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = phone.replace(/[^0-9]/g, '');

  let entry = phoneRateLimits.get(key);

  // Reset if window expired
  if (!entry || now - entry.windowStart > PHONE_RATE_WINDOW) {
    entry = { count: 0, windowStart: now };
    phoneRateLimits.set(key, entry);
  }

  const remaining = Math.max(0, PHONE_RATE_LIMIT - entry.count);
  return { allowed: entry.count < PHONE_RATE_LIMIT, remaining };
}

export function incrementPhoneRateLimit(phone: string): void {
  const key = phone.replace(/[^0-9]/g, '');
  const entry = phoneRateLimits.get(key);

  if (entry && Date.now() - entry.windowStart <= PHONE_RATE_WINDOW) {
    entry.count++;
  }
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of phoneRateLimits) {
    if (now - entry.windowStart > PHONE_RATE_WINDOW * 2) {
      phoneRateLimits.delete(key);
    }
  }
}, 300_000);
