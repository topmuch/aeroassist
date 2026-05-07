/**
 * WhatsApp Template Status API
 * GET: Checks the approval status of each Meta template defined in meta-templates.json
 *
 * Queries the Meta Graph API for each template and returns its current status.
 * Falls back to mock data if WHATSAPP_ACCESS_TOKEN is not configured (dev mode).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, withSecurityHeaders, startTimer, applyRateLimit, STRICT_RATE_LIMIT } from '@/lib/security';
import metaTemplates from '@/data/meta-templates.json';
import logger from '@/lib/logger';

// ── Types ────────────────────────────────────────────────────────

interface MetaTemplateStatus {
  name: string;
  status: string;
  category: string;
  rejection_reason: string | null;
  language: string;
}

interface MetaGraphTemplate {
  name: string;
  status: string;
  category: string;
  rejection_reason?: string;
  language_policy?: string;
  language?: string;
}

// ── GET: Fetch template approval status ──────────────────────────

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const rateLimitResponse = applyRateLimit(request, STRICT_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  const timer = startTimer();

  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v17.0';

    // If not configured, return mock data for development
    if (!accessToken || !phoneNumberId) {
      logger.info('Template status: returning mock data (WhatsApp not configured)');
      const mockStatuses: MetaTemplateStatus[] = metaTemplates.templates.map((tpl) => ({
        name: tpl.name,
        status: 'APPROVED',
        category: tpl.category,
        rejection_reason: null,
        language: tpl.language,
      }));

      return withSecurityHeaders(
        NextResponse.json({
          success: true,
          data: mockStatuses,
          source: 'mock',
          message: 'Mock data returned — configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID for live status',
          durationMs: timer(),
        })
      );
    }

    // Query Meta Graph API for all templates belonging to this phone number
    const graphUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/message_templates`;

    const response = await fetch(graphUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;

      logger.error('Failed to fetch template status from Meta', {
        statusCode: response.status,
        error: errorMsg,
      });

      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: `Meta API error: ${errorMsg}`,
          },
          { status: 502 }
        )
      );
    }

    const data = await response.json();
    const remoteTemplates: MetaGraphTemplate[] = data?.data || [];

    // Build a lookup map from remote templates (by name)
    const remoteMap = new Map<string, MetaGraphTemplate>();
    for (const tpl of remoteTemplates) {
      remoteMap.set(tpl.name, tpl);
    }

    // For each template in our meta-templates.json, get its status from Meta
    const statuses: MetaTemplateStatus[] = metaTemplates.templates.map((localTpl) => {
      const remote = remoteMap.get(localTpl.name);
      return {
        name: localTpl.name,
        status: remote?.status || 'NOT_FOUND',
        category: localTpl.category,
        rejection_reason: remote?.rejection_reason || null,
        language: localTpl.language,
      };
    });

    // Also include any remote templates that are not in our local config
    for (const remote of remoteTemplates) {
      const existsLocally = metaTemplates.templates.some((t) => t.name === remote.name);
      if (!existsLocally) {
        statuses.push({
          name: remote.name,
          status: remote.status,
          category: remote.category || 'UNKNOWN',
          rejection_reason: remote.rejection_reason || null,
          language: remote.language || 'unknown',
        });
      }
    }

    logger.info('Template status fetched from Meta', {
      total: statuses.length,
      approved: statuses.filter((s) => s.status === 'APPROVED').length,
      pending: statuses.filter((s) => s.status === 'PENDING').length,
      rejected: statuses.filter((s) => s.status === 'REJECTED').length,
      durationMs: timer(),
    });

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        data: statuses,
        source: 'meta',
        summary: {
          total: statuses.length,
          approved: statuses.filter((s) => s.status === 'APPROVED').length,
          pending: statuses.filter((s) => s.status === 'PENDING').length,
          rejected: statuses.filter((s) => s.status === 'REJECTED').length,
          not_found: statuses.filter((s) => s.status === 'NOT_FOUND').length,
        },
        durationMs: timer(),
      })
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Template status check failed', { error: errorMsg });

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'Failed to check template status',
          details: errorMsg,
        },
        { status: 500 }
      )
    );
  }
}
