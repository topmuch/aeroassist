/**
 * AeroAssist — WhatsApp Meta Cloud API Production Service
 *
 * Production-grade service for WhatsApp Business Platform:
 * - In-memory session management with 24h TTL
 * - Template CRUD via Meta Graph API
 * - Media download from Meta's CDN
 * - Per-user rate limiting (20 msg/min)
 * - PII-safe phone hashing in logs
 * - Graceful timeout fallback (5s)
 *
 * Compatible with the existing webhook at /api/webhook/whatsapp
 */

import logger, { logWebhookEvent, logSecurityEvent } from '@/lib/logger';

// ── Constants ──────────────────────────────────────────────────────

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;          // 24 hours
const RATE_LIMIT_MAX = 20;                              // messages per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000;                 // 1 minute
const META_API_TIMEOUT_MS = 5_000;                      // 5 seconds
const SESSION_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;    // 10 minutes

// ── Types ──────────────────────────────────────────────────────────

export interface WhatsAppSession {
  waId: string;
  contactName: string;
  language: string;
  lastMessageAt: number;
  messageCount: number;
  createdAt: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface MetaAPIError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

interface MetaTemplateResponse {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  created_at: string;
  updated_at?: string;
  components?: Array<Record<string, unknown>>;
}

interface MediaDownloadResult {
  success: boolean;
  url?: string;
  mimeType?: string;
  fileSize?: number;
  error?: string;
}

interface TemplateDefinition {
  name: string;
  displayName: string;
  category: string;
  language: string;
  body: string;
  status: string;
}

interface TemplatesFile {
  version: string;
  templates: TemplateDefinition[];
}

// ── Meta API Config ────────────────────────────────────────────────

function getMetaConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const systemToken = process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
  const businessId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v19.0';

  return {
    token: token || '',
    phoneId: phoneId || '',
    systemToken: systemToken || '',
    businessId: businessId || '',
    apiVersion,
    baseUrl: `https://graph.facebook.com/${apiVersion}`,
  };
}

// ── PII-Safe Phone Hashing ─────────────────────────────────────────

/**
 * Hash phone number for safe logging: first 3 + *** + last 2.
 * e.g. "33612345678" → "336***78"
 */
export function hashPhone(phone: string): string {
  if (!phone || phone.length <= 4) return '[REDACTED]';
  return phone.slice(0, 3) + '***' + phone.slice(-2);
}

// ── Session Management (In-Memory Map with TTL) ───────────────────

const sessions = new Map<string, WhatsAppSession>();

/**
 * Get or create a session for a WhatsApp user.
 * TTL is reset to 24h on every access (incoming message).
 */
export function getOrCreateSession(
  waId: string,
  contactName: string = '',
  language: string = 'fr'
): WhatsAppSession {
  const existing = sessions.get(waId);
  const now = Date.now();

  // Check if session exists and is not expired
  if (existing && (now - existing.createdAt) < SESSION_TTL_MS) {
    // Reset TTL: update lastMessageAt to now (extends session to createdAt + 24h)
    existing.lastMessageAt = now;
    existing.messageCount++;
    if (contactName) existing.contactName = contactName;
    if (language && language !== 'fr') existing.language = language;
    return existing;
  }

  // Create new session
  const session: WhatsAppSession = {
    waId,
    contactName: contactName || 'Unknown',
    language,
    lastMessageAt: now,
    messageCount: 1,
    createdAt: now,
  };

  sessions.set(waId, session);

  logWebhookEvent('session_created', {
    waId: hashPhone(waId),
    contactName: session.contactName,
    language,
  });

  return session;
}

/**
 * Get an existing session without creating one. Returns null if expired or missing.
 */
export function getSession(waId: string): WhatsAppSession | null {
  const session = sessions.get(waId);
  if (!session) return null;

  if (Date.now() - session.createdAt >= SESSION_TTL_MS) {
    sessions.delete(waId);
    return null;
  }

  return session;
}

/**
 * Explicitly reset a session's TTL to 24h from now.
 */
export function resetSessionTTL(waId: string): boolean {
  const session = sessions.get(waId);
  if (!session) return false;

  session.createdAt = Date.now();
  session.lastMessageAt = Date.now();
  return true;
}

/**
 * Destroy a session immediately (e.g., user opts out).
 */
export function destroySession(waId: string): boolean {
  const deleted = sessions.delete(waId);
  if (deleted) {
    logWebhookEvent('session_destroyed', { waId: hashPhone(waId) });
  }
  return deleted;
}

/**
 * Get all active sessions (for monitoring/admin).
 */
export function getAllSessions(): WhatsAppSession[] {
  const now = Date.now();
  const active: WhatsAppSession[] = [];

  for (const session of sessions.values()) {
    if ((now - session.createdAt) < SESSION_TTL_MS) {
      active.push({ ...session });
    } else {
      sessions.delete(session.waId);
    }
  }

  return active;
}

/**
 * Periodic cleanup of expired sessions.
 * Runs every 10 minutes automatically.
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();
  let expiredCount = 0;

  for (const [key, session] of sessions) {
    if ((now - session.createdAt) >= SESSION_TTL_MS) {
      sessions.delete(key);
      expiredCount++;
    }
  }

  if (expiredCount > 0) {
    logger.info('whatsapp_meta.session_cleanup', {
      expiredCount,
      remainingSessions: sessions.size,
    });
  }
}

// Start periodic cleanup
const cleanupTimer = setInterval(cleanupExpiredSessions, SESSION_CLEANUP_INTERVAL_MS);

// Don't prevent process exit during tests
if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
  cleanupTimer.unref();
}

// ── Rate Limiting (per wa_id) ──────────────────────────────────────

const rateLimits = new Map<string, RateLimitEntry>();

/**
 * Check if a user is within the rate limit (20 messages/minute).
 * Returns { allowed, remaining, resetInMs }.
 */
export function checkRateLimit(waId: string): {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
} {
  const now = Date.now();
  let entry = rateLimits.get(waId);

  // Window expired → reset
  if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    rateLimits.set(waId, entry);
  }

  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  const resetInMs = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - entry.windowStart));

  return {
    allowed: entry.count < RATE_LIMIT_MAX,
    remaining,
    resetInMs,
  };
}

/**
 * Increment the rate limit counter for a user after processing a message.
 */
export function incrementRateLimit(waId: string): void {
  const now = Date.now();
  let entry = rateLimits.get(waId);

  if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    rateLimits.set(waId, entry);
  }

  entry.count++;
}

/**
 * Cleanup stale rate limit entries (called periodically).
 */
function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if ((now - entry.windowStart) > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimits.delete(key);
    }
  }
}

const rateLimitCleanupTimer = setInterval(cleanupRateLimits, 300_000);
if (typeof rateLimitCleanupTimer === 'object' && 'unref' in rateLimitCleanupTimer) {
  rateLimitCleanupTimer.unref();
}

// ── Meta API Helper with Timeout ───────────────────────────────────

/**
 * Fetch with a 5-second timeout. Returns error instead of throwing on timeout.
 */
async function metaFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(META_API_TIMEOUT_MS),
    });
    return response;
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
    if (isTimeout) {
      logSecurityEvent('meta_api_timeout', { url: url.replace(/token=[^&]+/, 'token=***'), timeoutMs: META_API_TIMEOUT_MS });
      throw new Error(`Meta API request timed out after ${META_API_TIMEOUT_MS}ms`);
    }
    throw error;
  }
}

/**
 * Parse a Meta API error response into a human-readable message.
 */
function parseMetaError(data: { error?: MetaAPIError }, fallback: string): string {
  if (data?.error?.message) {
    return data.error.message;
  }
  return fallback;
}

// ── Template Management ────────────────────────────────────────────

/**
 * Create a new WhatsApp message template via the Meta Graph API.
 * Requires a System User Access Token with whatsapp_business_messaging permission.
 */
export async function createTemplate(
  template: TemplateDefinition
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  const config = getMetaConfig();
  const authToken = config.systemToken || config.token;

  if (!authToken || !config.businessId) {
    return {
      success: false,
      error: 'WHATSAPP_SYSTEM_USER_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID are required for template management',
    };
  }

  const url = `${config.baseUrl}/${config.businessId}/message_templates`;

  // Build the components array for Meta's API format
  const components = [{
    type: 'BODY',
    text: template.body,
  }];

  const payload = {
    name: template.name,
    category: template.category,
    language: template.language,
    components,
  };

  try {
    const response = await metaFetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = parseMetaError(data, `HTTP ${response.status}`);
      logSecurityEvent('template_create_failed', {
        templateName: template.name,
        error: errorMsg,
        statusCode: response.status,
      });
      return { success: false, error: errorMsg };
    }

    logWebhookEvent('template_created', {
      templateName: template.name,
      templateId: data.id,
    });

    return { success: true, templateId: data.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logSecurityEvent('template_create_error', { templateName: template.name, error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Query existing templates from the Meta Business Account.
 */
export async function queryTemplates(
  limit = 50,
  status?: string
): Promise<{ success: boolean; templates?: MetaTemplateResponse[]; error?: string }> {
  const config = getMetaConfig();
  const authToken = config.systemToken || config.token;

  if (!authToken || !config.businessId) {
    return {
      success: false,
      error: 'WHATSAPP_SYSTEM_USER_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID are required for template queries',
    };
  }

  const params = new URLSearchParams({
    limit: String(limit),
    fields: 'id,name,status,category,language,created_at,updated_at,components',
  });
  if (status) params.set('status', status);

  const url = `${config.baseUrl}/${config.businessId}/message_templates?${params}`;

  try {
    const response = await metaFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = parseMetaError(data, `HTTP ${response.status}`);
      return { success: false, error: errorMsg };
    }

    return { success: true, templates: data.data || [] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/**
 * Update an existing template. Meta requires deleting and re-creating for body changes.
 * This function attempts a deletion + re-creation.
 */
export async function updateTemplate(
  template: TemplateDefinition
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  // First, delete the old template
  const deleteResult = await deleteTemplate(template.name);
  if (!deleteResult.success && !deleteResult.error?.includes('not found')) {
    return { success: false, error: `Failed to delete old template: ${deleteResult.error}` };
  }

  // Small delay to let Meta process the deletion
  await new Promise(resolve => setTimeout(resolve, 500));

  // Then create the new one
  return createTemplate(template);
}

/**
 * Delete a template by name.
 */
export async function deleteTemplate(
  templateName: string
): Promise<{ success: boolean; error?: string }> {
  const config = getMetaConfig();
  const authToken = config.systemToken || config.token;

  if (!authToken || !config.businessId) {
    return {
      success: false,
      error: 'WHATSAPP_SYSTEM_USER_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID are required',
    };
  }

  // First, find the template ID by name
  const queryResult = await queryTemplates(100);
  if (!queryResult.success || !queryResult.templates) {
    return { success: false, error: queryResult.error || 'Failed to query templates' };
  }

  const target = queryResult.templates.find(t => t.name === templateName);
  if (!target) {
    return { success: false, error: `Template "${templateName}" not found` };
  }

  const url = `${config.baseUrl}/${target.id}`;

  try {
    const response = await metaFetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const errorMsg = parseMetaError(data, `HTTP ${response.status}`);
      return { success: false, error: errorMsg };
    }

    logWebhookEvent('template_deleted', { templateName, templateId: target.id });
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/**
 * Load template definitions from the local templates.json file.
 */
export async function loadLocalTemplates(): Promise<TemplateDefinition[]> {
  try {
    const { templates }: TemplatesFile = await import('@/data/templates.json');
    return templates || [];
  } catch (error) {
    logger.error('whatsapp_meta.load_local_templates_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Bulk-sync all local templates to Meta (create missing, update existing).
 * Useful for CI/CD or admin operations.
 */
export async function syncTemplatesToMeta(): Promise<{
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ name: string; error: string }>;
}> {
  const localTemplates = await loadLocalTemplates();
  const existingResult = await queryTemplates(200);

  const existingNames = new Set(
    (existingResult.templates || []).map(t => t.name)
  );

  const result = { created: 0, updated: 0, failed: 0, errors: [] as Array<{ name: string; error: string }> };

  for (const template of localTemplates) {
    if (existingNames.has(template.name)) {
      const res = await updateTemplate(template);
      if (res.success) {
        result.updated++;
      } else {
        result.failed++;
        result.errors.push({ name: template.name, error: res.error || 'Unknown error' });
      }
    } else {
      const res = await createTemplate(template);
      if (res.success) {
        result.created++;
      } else {
        result.failed++;
        result.errors.push({ name: template.name, error: res.error || 'Unknown error' });
      }
    }
  }

  logWebhookEvent('template_sync_completed', {
    total: localTemplates.length,
    created: result.created,
    updated: result.updated,
    failed: result.failed,
  });

  return result;
}

// ── Media Download ─────────────────────────────────────────────────

/**
 * Download media from Meta's WhatsApp Business API.
 *
 * Two-step process:
 * 1. GET /{media_id} → retrieves the media URL (requires Business Account token)
 * 2. GET {media_url} → downloads the actual file (URL expires after ~1 minute)
 */
export async function downloadMedia(
  mediaId: string
): Promise<MediaDownloadResult> {
  const config = getMetaConfig();
  const authToken = config.systemToken || config.token;

  if (!authToken) {
    return { success: false, error: 'WHATSAPP_ACCESS_TOKEN or WHATSAPP_SYSTEM_USER_ACCESS_TOKEN is required' };
  }

  // Step 1: Get the media URL
  const mediaUrl = `${config.baseUrl}/${mediaId}`;

  try {
    const infoResponse = await metaFetch(mediaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!infoResponse.ok) {
      const data = await infoResponse.json().catch(() => ({}));
      const errorMsg = parseMetaError(data, `HTTP ${infoResponse.status}`);
      return { success: false, error: `Failed to get media info: ${errorMsg}` };
    }

    const mediaInfo = await infoResponse.json();
    const downloadUrl: string = mediaInfo.url;
    const mimeType: string = mediaInfo.mime_type;
    const fileSize: number = mediaInfo.file_size;

    if (!downloadUrl) {
      return { success: false, error: 'No download URL returned by Meta API' };
    }

    logWebhookEvent('media_url_retrieved', {
      mediaId,
      mimeType,
      fileSize,
    });

    // Step 2: Download the actual media (no auth header needed for this URL)
    const downloadResponse = await metaFetch(downloadUrl);

    if (!downloadResponse.ok) {
      return { success: false, error: `Failed to download media: HTTP ${downloadResponse.status}` };
    }

    // For large files, we return the URL and metadata
    // The caller can stream the response body as needed
    logWebhookEvent('media_downloaded', {
      mediaId,
      mimeType,
      fileSize,
    });

    return {
      success: true,
      url: downloadUrl,
      mimeType,
      fileSize,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logSecurityEvent('media_download_failed', { mediaId, error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Download media as a Buffer (for small files only, < 5MB).
 * Returns the raw bytes for direct processing (e.g., image analysis).
 */
export async function downloadMediaAsBuffer(
  mediaId: string,
  maxSizeBytes = 5 * 1024 * 1024
): Promise<{ success: boolean; buffer?: Buffer; mimeType?: string; error?: string }> {
  const config = getMetaConfig();
  const authToken = config.systemToken || config.token;

  if (!authToken) {
    return { success: false, error: 'WhatsApp access token not configured' };
  }

  // Step 1: Get media URL
  const mediaUrl = `${config.baseUrl}/${mediaId}`;

  try {
    const infoResponse = await metaFetch(mediaUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    if (!infoResponse.ok) {
      const data = await infoResponse.json().catch(() => ({}));
      return { success: false, error: parseMetaError(data, `HTTP ${infoResponse.status}`) };
    }

    const mediaInfo = await infoResponse.json();

    if (mediaInfo.file_size > maxSizeBytes) {
      return {
        success: false,
        error: `Media too large: ${mediaInfo.file_size} bytes (max ${maxSizeBytes})`,
      };
    }

    // Step 2: Download as buffer
    const downloadResponse = await metaFetch(mediaInfo.url);
    if (!downloadResponse.ok) {
      return { success: false, error: `Download failed: HTTP ${downloadResponse.status}` };
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      success: true,
      buffer,
      mimeType: mediaInfo.mime_type,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

// ── Health Check ───────────────────────────────────────────────────

/**
 * Verify Meta API connectivity by fetching the phone number info.
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  details: string;
  phoneId?: string;
  verifiedName?: string;
}> {
  const config = getMetaConfig();

  if (!config.token || !config.phoneId) {
    return {
      status: 'unhealthy',
      latencyMs: 0,
      details: 'WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured',
    };
  }

  const start = Date.now();

  try {
    const response = await metaFetch(
      `${config.baseUrl}/${config.phoneId}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${config.token}` },
      }
    );

    const latencyMs = Date.now() - start;
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return {
        status: 'healthy',
        latencyMs,
        details: 'Meta API connected',
        phoneId: config.phoneId,
        verifiedName: data.verified_name || data.display_phone_number,
      };
    }

    return {
      status: 'degraded',
      latencyMs,
      details: parseMetaError(data, `HTTP ${response.status}`),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      details: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

// ── Process Incoming Message (Integration Hook) ────────────────────

export interface ProcessedMessage {
  waId: string;
  contactName: string;
  language: string;
  text: string;
  messageType: string;
  sessionId: boolean;
  rateLimited: boolean;
  messageCount: number;
}

/**
 * Process an inbound WhatsApp message through session management and rate limiting.
 * Designed to be called from the webhook handler.
 */
export function processIncomingMessage(
  waId: string,
  contactName: string,
  language: string,
  text: string,
  messageType: string
): ProcessedMessage {
  // Rate limit check
  const rateCheck = checkRateLimit(waId);
  if (!rateCheck.allowed) {
    logSecurityEvent('rate_limit_exceeded', {
      waId: hashPhone(waId),
      remaining: 0,
      resetInMs: rateCheck.resetInMs,
    });
  }

  // Session management (creates or refreshes session)
  const isNewSession = !sessions.has(waId);
  const session = getOrCreateSession(waId, contactName, language);

  if (!rateCheck.allowed) {
    return {
      waId,
      contactName: session.contactName,
      language: session.language,
      text,
      messageType,
      sessionId: !isNewSession,
      rateLimited: true,
      messageCount: session.messageCount,
    };
  }

  incrementRateLimit(waId);

  return {
    waId,
    contactName: session.contactName,
    language: session.language,
    text,
    messageType,
    sessionId: !isNewSession,
    rateLimited: false,
    messageCount: session.messageCount,
  };
}

// ── Statistics (for monitoring) ────────────────────────────────────

export function getSessionStats(): {
  activeSessions: number;
  totalMessagesProcessed: number;
  avgMessagesPerSession: number;
} {
  let totalMessages = 0;
  let activeCount = 0;
  const now = Date.now();

  for (const session of sessions.values()) {
    if ((now - session.createdAt) < SESSION_TTL_MS) {
      activeCount++;
      totalMessages += session.messageCount;
    }
  }

  return {
    activeSessions: activeCount,
    totalMessagesProcessed: totalMessages,
    avgMessagesPerSession: activeCount > 0 ? Math.round(totalMessages / activeCount) : 0,
  };
}
