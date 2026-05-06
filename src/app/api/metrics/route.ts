/**
 * AeroAssist — Prometheus Metrics Endpoint
 * GET /api/metrics
 *
 * Exposes application metrics in Prometheus exposition format.
 * Scraped by Prometheus every 15s (configured in monitoring/prometheus.yml).
 *
 * No auth required (Prometheus needs direct access).
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import logger from '@/lib/logger';

// ── In-Memory Counters (survive hot reloads in dev) ────────────

const counters: Record<string, number> = {
  http_requests_total: 0,
  http_requests_success_total: 0,
  http_requests_error_total: 0,
  stripe_webhook_errors_total: 0,
  whatsapp_send_failures_total: 0,
};

const histograms: Record<string, { count: number; sum: number; buckets: Record<string, number> }> = {
  http_request_duration_seconds: {
    count: 0,
    sum: 0,
    buckets: { '0.1': 0, '0.25': 0, '0.5': 0, '1': 0, '2': 0, '5': 0, '+Inf': 0 },
  },
};

/**
 * Increment a counter metric. Call from route handlers.
 */
export function incrementCounter(name: string, labels: Record<string, string> = {}): void {
  counters[name] = (counters[name] || 0) + 1;
}

/**
 * Record a request duration observation.
 */
export function observeDuration(durationSeconds: number, endpoint: string): void {
  const h = histograms.http_request_duration_seconds;
  h.count++;
  h.sum += durationSeconds;

  // Find the appropriate bucket
  const bucketKeys = Object.keys(h.buckets).map(Number).sort((a, b) => a - b);
  for (const threshold of bucketKeys) {
    if (durationSeconds <= threshold || threshold === Infinity) {
      h.buckets[String(threshold)]++;
    }
  }
}

// ── Prometheus Exposition Format Builder ───────────────────────

function formatMetric(
  name: string,
  value: number,
  help: string,
  type: 'counter' | 'gauge' | 'histogram' = 'counter',
  labels?: Record<string, string>
): string {
  const lines: string[] = [];
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} ${type}`);

  if (labels) {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    lines.push(`${name}{${labelStr}} ${value}`);
  } else {
    lines.push(`${name} ${value}`);
  }

  return lines.join('\n');
}

function formatHistogram(
  name: string,
  data: { count: number; sum: number; buckets: Record<string, number> },
  help: string,
  labels: Record<string, string> = {}
): string {
  const lines: string[] = [];
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} histogram`);

  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  const suffix = labelStr ? `{${labelStr},` : '{';
  const suffixEnd = labelStr ? '}' : '}';

  // Bucket lines
  const bucketKeys = Object.keys(data.buckets).map(Number).sort((a, b) => a - b);
  let cumulative = 0;
  for (const threshold of bucketKeys) {
    cumulative += data.buckets[String(threshold)];
    const le = threshold === Infinity ? '+Inf' : String(threshold);
    lines.push(`${name}_bucket${suffix}le="${le}"${suffixEnd} ${cumulative}`);
  }

  // Sum and count
  lines.push(`${name}_sum${labels ? `{${labelStr}}` : ''} ${data.sum}`);
  lines.push(`${name}_count${labels ? `{${labelStr}}` : ''} ${data.count}`);

  return lines.join('\n');
}

// ── GET: Expose Metrics ─────────────────────────────────────────

export async function GET() {
  try {
    const startTime = Date.now();

    // Increment total requests counter
    counters.http_requests_total++;

    // Fetch live stats from DB for gauge metrics
    let contactCount = 0;
    let conversationCount = 0;
    let messageCount = 0;
    let reservationCount = 0;

    try {
      const [contacts, conversations, messages, reservations] = await Promise.all([
        db.whatsAppContact.count(),
        db.conversation.count(),
        db.message.count(),
        db.reservation.count(),
      ]);
      contactCount = contacts;
      conversationCount = conversations;
      messageCount = messages;
      reservationCount = reservations;
    } catch {
      // DB unavailable — expose 0 for gauges
    }

    const uptimeSeconds = process.uptime();
    const memoryUsage = process.memoryUsage();
    const durationSeconds = (Date.now() - startTime) / 1000;

    // Observe this request's own duration
    observeDuration(durationSeconds, '/api/metrics');

    // Build Prometheus output
    const output = [
      // Counters
      formatMetric('http_requests_total', counters.http_requests_total,
        'Total HTTP requests received'),
      formatMetric('http_requests_success_total', counters.http_requests_success_total,
        'Total successful HTTP requests (2xx-3xx)'),
      formatMetric('http_requests_error_total', counters.http_requests_error_total,
        'Total failed HTTP requests (4xx-5xx)'),
      formatMetric('stripe_webhook_errors_total', counters.stripe_webhook_errors_total,
        'Total Stripe webhook processing errors'),
      formatMetric('whatsapp_send_failures_total', counters.whatsapp_send_failures_total,
        'Total WhatsApp message send failures'),

      // Histograms
      formatHistogram('http_request_duration_seconds', histograms.http_request_duration_seconds,
        'HTTP request duration in seconds'),

      // Gauges — Application stats
      formatMetric('aeroassist_contacts_total', contactCount,
        'Total WhatsApp contacts', 'gauge'),
      formatMetric('aeroassist_conversations_total', conversationCount,
        'Total active conversations', 'gauge'),
      formatMetric('aeroassist_messages_total', messageCount,
        'Total messages processed', 'gauge'),
      formatMetric('aeroassist_reservations_total', reservationCount,
        'Total reservations created', 'gauge'),

      // Gauges — Process info
      formatMetric('process_uptime_seconds', uptimeSeconds,
        'Process uptime in seconds', 'gauge'),
      formatMetric('process_memory_rss_bytes', memoryUsage.rss,
        'Process RSS memory in bytes', 'gauge'),
      formatMetric('process_memory_heap_used_bytes', memoryUsage.heapUsed,
        'Process heap used memory in bytes', 'gauge'),
      formatMetric('process_memory_heap_total_bytes', memoryUsage.heapTotal,
        'Process heap total memory in bytes', 'gauge'),
    ].join('\n\n');

    return new NextResponse(output, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('metrics_endpoint_error', { error: msg });

    return new NextResponse(`# Error generating metrics: ${msg}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
