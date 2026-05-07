/**
 * Stripe Checkout Session Endpoint
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for a reservation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createCheckoutSession, getPublicConfig, PRICING, type ReservationType } from '@/lib/stripe';
import { requireAuth } from '@/lib/security';
import logger from '@/lib/logger';

const checkoutSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reservationType: z.enum(['vip_lounge', 'hotel', 'car_rental', 'duty_free']),
  priceId: z.string().min(1, 'Price ID is required'),
  currency: z.string().optional().default('eur'),
  email: z.string().email().optional(),
});

// ── POST: Create Checkout Session ───────────────────────────────

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, reservationType, priceId, currency, email } = parsed.data;

    // Find the pricing for this type
    const tier = PRICING[reservationType as ReservationType];
    if (!tier) {
      return NextResponse.json(
        { error: `Unknown reservation type: ${reservationType}` },
        { status: 400 }
      );
    }

    const price = tier.prices.find((p) => p.id === priceId);
    if (!price) {
      return NextResponse.json(
        {
          error: `Unknown price ID: ${priceId}`,
          availablePrices: tier.prices.map((p) => ({ id: p.id, label: p.label, amount: p.amount })),
        },
        { status: 400 }
      );
    }

    // Create checkout session
    const result = await createCheckoutSession({
      userId,
      reservationType: reservationType as ReservationType,
      amount: price.amount,
      currency,
      metadata: {
        priceId,
        email: email || '',
        airport: 'CDG',
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      checkoutUrl: result.checkoutUrl,
      amount: price.amount,
      currency,
      type: reservationType,
      label: price.label,
    });
  } catch (error) {
    logger.error('Stripe checkout error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// ── GET: Stripe Configuration ───────────────────────────────────

export async function GET() {
  const config = getPublicConfig();

  return NextResponse.json({
    success: true,
    configured: config.isConfigured,
    publishableKey: config.publishableKey,
    pricing: Object.fromEntries(
      Object.entries(PRICING).map(([key, tier]) => [
        key,
        {
          name: tier.name,
          description: tier.description,
          prices: tier.prices.map((p) => ({
            id: p.id,
            label: p.label,
            amount: p.amount,
            formatted: `${(p.amount / 100).toFixed(2)} €`,
          })),
        },
      ])
    ),
  });
}
