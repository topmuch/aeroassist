/**
 * Health Check Endpoint
 * Verifies connectivity to all critical services:
 * - Database (SQLite/PostgreSQL)
 * - AI Service (z-ai-web-dev-sdk / Groq)
 * - WhatsApp API (OpenBSP Bridge preferred, Meta Cloud API fallback)
 * - OpenBSP Bridge (self-hosted WhatsApp)
 *
 * Returns structured status with service-by-service health info
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { checkOpenBSPHealth } from '@/lib/whatsapp-service';
import { getSecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  error?: string;
  details?: string;
}

interface HealthCheckResponse {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceStatus;
    ai: ServiceStatus;
    openbsp: ServiceStatus;
    whatsapp: ServiceStatus;
  };
  system: {
    nodeVersion: string;
    platform: string;
    memoryUsage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
  };
}

export async function GET() {
  const startTime = Date.now();

  // Run all checks in parallel
  const [dbStatus, aiStatus, openbspStatus, whatsappStatus] = await Promise.all([
    checkDatabase(),
    checkAIService(),
    checkOpenBSPBridge(),
    checkWhatsAppAPI(),
  ]);

  // Determine overall status
  const criticalUp = dbStatus.status === 'up';
  const anyDown = dbStatus.status === 'down';
  const overallStatus = anyDown ? 'DOWN' : criticalUp ? 'UP' : 'DEGRADED';

  const memoryUsage = process.memoryUsage();

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.2.0',
    services: {
      database: dbStatus,
      ai: aiStatus,
      openbsp: openbspStatus,
      whatsapp: whatsappStatus,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
      },
    },
  };

  logger.info('Health check completed', {
    status: overallStatus,
    durationMs: Date.now() - startTime,
    services: {
      db: dbStatus.status,
      ai: aiStatus.status,
      openbsp: openbspStatus.status,
      whatsapp: whatsappStatus.status,
    },
  });

  const httpStatus = overallStatus === 'DOWN' ? 503 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: { ...getSecurityHeaders(), 'Cache-Control': 'no-store' },
  });
}

// ── Database Health Check ────────────────────────────────────────

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await db.module.count();
    const latency = Date.now() - start;
    const analyticsCount = await db.analyticsEvent.count();
    const contactCount = await db.whatsAppContact.count();
    const templateCount = await db.whatsAppTemplate.count();
    const hasData = analyticsCount > 0;

    return {
      status: 'up',
      latencyMs: latency,
      details: hasData
        ? `${analyticsCount} events, ${contactCount} contacts, ${templateCount} templates`
        : 'Database connected but no analytics data',
    };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

// ── AI Service Health Check (with 60s cache) ───────────────────────

let aiHealthCache: { status: ServiceStatus; checkedAt: number } | null = null;
const AI_HEALTH_CACHE_TTL = 60_000; // 60 seconds

async function checkAIService(): Promise<ServiceStatus> {
  // Return cached result if still fresh
  if (aiHealthCache && Date.now() - aiHealthCache.checkedAt < AI_HEALTH_CACHE_TTL) {
    return aiHealthCache.status;
  }

  const start = Date.now();
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'user', content: 'ping' }],
    });
    const reply = completion?.choices?.[0]?.message?.content;

    if (!reply) {
      const status = {
        status: 'degraded' as const,
        latencyMs: Date.now() - start,
        error: 'AI returned empty response',
      };
      aiHealthCache = { status, checkedAt: Date.now() };
      return status;
    }

    const status = {
      status: 'up' as const,
      latencyMs: Date.now() - start,
      details: `AI responding (${reply.length} chars)`,
    };
    aiHealthCache = { status, checkedAt: Date.now() };
    return status;
  } catch (error) {
    const status = {
      status: 'down' as const,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'AI service unavailable',
    };
    aiHealthCache = { status, checkedAt: Date.now() };
    return status;
  }
}

// ── OpenBSP Bridge Health Check ──────────────────────────────────

async function checkOpenBSPBridge(): Promise<ServiceStatus> {
  const openbspUrl = process.env.OPENBSP_API_URL;

  if (!openbspUrl) {
    return {
      status: 'degraded',
      latencyMs: 0,
      error: 'OPENBSP_API_URL not configured',
      details: 'OpenBSP bridge not configured — using Meta or mock mode',
    };
  }

  return checkOpenBSPHealth();
}

// ── WhatsApp API Health Check ────────────────────────────────────

async function checkWhatsAppAPI(): Promise<ServiceStatus> {
  const start = Date.now();

  // Check if OpenBSP is available (preferred)
  const openbspUrl = process.env.OPENBSP_API_URL;
  if (openbspUrl) {
    try {
      const response = await fetch(`${openbspUrl.replace(/\/+$/, '')}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          status: 'up',
          latencyMs: Date.now() - start,
          details: `WhatsApp via OpenBSP (${data.sessions?.connected || 0} session(s))`,
          provider: 'openbsp',
        };
      }

      return {
        status: 'degraded',
        latencyMs: Date.now() - start,
        error: `OpenBSP returned HTTP ${response.status}`,
        details: 'OpenBSP bridge unreachable, falling back',
        provider: 'openbsp',
      };
    } catch {
      return {
        status: 'degraded',
        latencyMs: Date.now() - start,
        error: 'OpenBSP bridge connection refused',
        details: 'OpenBSP not reachable — check if bridge is running on port 3001',
        provider: 'openbsp',
      };
    }
  }

  // Fallback: Check Meta Cloud API
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return {
      status: 'degraded',
      latencyMs: Date.now() - start,
      error: 'No WhatsApp provider configured',
      details: 'Set OPENBSP_API_URL or WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID',
    };
  }

  try {
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v17.0';
    const url = `https://graph.facebook.com/${apiVersion}/${phoneId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: `WhatsApp API error: ${response.status}`,
        details: errorData?.error?.message || 'Phone number ID may be invalid',
        provider: 'meta',
      };
    }

    const data = await response.json();
    return {
      status: 'up',
      latencyMs: Date.now() - start,
      details: `WhatsApp via Meta: ${data.display_phone_number || phoneId}`,
      provider: 'meta',
    };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'WhatsApp API unreachable',
      provider: 'meta',
    };
  }
}
