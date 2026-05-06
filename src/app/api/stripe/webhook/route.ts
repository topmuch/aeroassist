/**
 * Stripe Webhook Endpoint
 * POST /api/stripe/webhook
 *
 * Receives and processes Stripe webhook events.
 * Handles:
 * - checkout.session.completed → Create reservation
 * - payment_intent.payment_failed → Log failure
 * - charge.refunded → Update reservation status
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, processWebhookEvent } from '@/lib/stripe';
import logger from '@/lib/logger';
import { getSecurityHeaders, withSecurityHeaders } from '@/lib/security';

// ── POST: Process Stripe Webhook ────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    if (!signature) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
      );
    }

    // Verify webhook signature
    const verification = await verifyWebhookSignature(payload, signature);

    if (!verification.valid || !verification.event) {
      logger.warn('Stripe webhook signature verification failed', {
        error: verification.error,
      });
      return withSecurityHeaders(
        NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      );
    }

    const event = verification.event as Record<string, unknown>;

    // Process the event
    const result = await processWebhookEvent(event);

    logger.info('Stripe webhook processed', {
      eventType: result.eventType,
      processed: result.processed,
      error: result.error,
    });

    return withSecurityHeaders(
      NextResponse.json({
        received: true,
        eventType: result.eventType,
        processed: result.processed,
      })
    );
  } catch (error) {
    logger.error('Stripe webhook error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return withSecurityHeaders(
      NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    );
  }
}
