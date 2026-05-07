/**
 * AeroAssist — PaymentIntent Creation Endpoint
 * POST /api/billing/create-payment
 *
 * Creates a Stripe PaymentIntent for direct card payment (no redirect).
 * Stores a pending reservation in the DB and returns the client secret
 * for the frontend to complete the payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripeRequest } from '@/lib/stripe';
import { requireAuth } from '@/lib/security';
import { db } from '@/lib/db';
import logger from '@/lib/logger';

// ── Validation Schema ────────────────────────────────────────────

const createPaymentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['vip_lounge', 'hotel', 'car_rental', 'duty_free'], {
    message: 'Invalid reservation type. Must be one of: vip_lounge, hotel, car_rental, duty_free',
  }),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(999999, 'Amount exceeds maximum allowed'),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter ISO code')
    .optional()
    .default('eur'),
  description: z.string().max(500, 'Description too long').optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

// ── POST: Create PaymentIntent ───────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth check ──
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, type, amount, currency, description, metadata } = parsed.data;

    // ── Build unique reservation reference ──
    const timestamp = Date.now();
    const reference = `PI_${type.toUpperCase()}_${timestamp.toString(36).toUpperCase()}`;

    // ── Idempotency key ──
    const idempotencyKey = `pi_${userId}_${timestamp}`;

    // ── Create Stripe PaymentIntent ──
    const serviceLabels: Record<string, string> = {
      vip_lounge: 'Salon VIP AeroAssist',
      hotel: 'Hôtel Aéroport',
      car_rental: 'Location de Voiture',
      duty_free: 'Duty Free Express',
    };

    const { status, data } = await stripeRequest('/payment_intents', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        'payment_method_types[]': 'card',
        description: description || `${serviceLabels[type]} — ${reference}`,
        metadata: {
          userId,
          reservationType: type,
          reference,
          source: 'aeroassist',
          ...(metadata || {}),
        },
        // Auto-confirm off — frontend will confirm with Stripe Elements
        'setup_future_usage': undefined,
      },
    });

    if (status >= 400 || !data) {
      const errorData = data as Record<string, unknown> | null;
      const stripeError = errorData?.error as Record<string, unknown> | undefined;
      logger.error('PaymentIntent creation failed', {
        status,
        errorCode: stripeError?.code,
        errorMessage: stripeError?.message,
        userId,
        type,
        amount,
      });
      return NextResponse.json(
        {
          error: 'Failed to create payment intent',
          details: stripeError?.message || `Stripe error (${status})`,
        },
        { status: 502 }
      );
    }

    const paymentIntent = data as {
      id: string;
      client_secret: string;
      amount: number;
      currency: string;
      status: string;
    };

    // ── Store pending reservation in DB ──
    const reservation = await db.reservation.create({
      data: {
        userId,
        type,
        status: 'pending',
        reference,
        details: JSON.stringify({
          stripePaymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          paymentIntentStatus: paymentIntent.status,
          idempotencyKey,
          description: description || '',
          ...(metadata || {}),
        }),
        totalAmount: paymentIntent.amount / 100,
        currency: paymentIntent.currency || currency,
        paymentStatus: 'pending',
      },
    });

    logger.info('PaymentIntent created and reservation stored', {
      paymentIntentId: paymentIntent.id,
      reservationId: reservation.id,
      reference,
      userId,
      type,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      reservationId: reservation.id,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Create payment endpoint error', { error: msg });
    return NextResponse.json(
      { error: 'Internal server error while creating payment' },
      { status: 500 }
    );
  }
}
