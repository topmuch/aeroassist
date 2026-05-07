/**
 * Stripe Customer Portal Endpoint
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session for managing subscriptions and payment history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPortalSession } from '@/lib/stripe';
import { requireAuth } from '@/lib/security';
import logger from '@/lib/logger';

const portalSchema = z.object({
  customerId: z.string().min(1, 'Stripe customer ID is required'),
  returnUrl: z.string().url('Valid return URL is required'),
});

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = portalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { customerId, returnUrl } = parsed.data;
    const result = await createPortalSession(customerId, returnUrl);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: result.url,
    });
  } catch (error) {
    logger.error('Stripe portal error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
