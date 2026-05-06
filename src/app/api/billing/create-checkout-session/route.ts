/**
 * AeroAssist — Checkout Session (PaymentIntent) Endpoint
 * POST /api/billing/create-checkout-session
 *
 * Creates a Stripe PaymentIntent for a custom amount (no priceId required).
 * Stores a pending reservation in the DB and returns the client_secret
 * for the frontend to complete the payment via Stripe Elements.
 *
 * Unlike /api/stripe/checkout (which redirects to Stripe Checkout),
 * this endpoint gives direct control over the payment UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripeRequest } from '@/lib/stripe';
import { requireAuth } from '@/lib/security';
import { db } from '@/lib/db';
import logger from '@/lib/logger';

// ── Zod Validation Schema ────────────────────────────────────────

const createCheckoutSessionSchema = z.object({
  userId: z.string().min(1, 'User ID requis'),
  amount: z
    .number()
    .positive('Le montant doit être supérieur à 0')
    .max(99999999, 'Le montant dépasse le maximum autorisé'),
  currency: z
    .string()
    .length(3, 'La devise doit être un code ISO à 3 lettres')
    .optional()
    .default('eur'),
  description: z.string().max(500, 'Description trop longue').optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

// ── Stripe Error Mapping ─────────────────────────────────────────

const STRIPE_ERROR_MAP: Record<string, { status: number; message: string }> = {
  card_declined: {
    status: 402,
    message: 'Votre carte a été refusée. Veuillez utiliser une autre carte ou contacter votre banque.',
  },
  insufficient_funds: {
    status: 402,
    message: 'Fonds insuffisants. Veuillez utiliser une autre méthode de paiement.',
  },
  expired_card: {
    status: 402,
    message: 'Votre carte a expiré. Veuillez mettre à jour vos informations de paiement.',
  },
  incorrect_cvc: {
    status: 402,
    message: 'Le code CVC est incorrect. Veuillez vérifier et réessayer.',
  },
  incorrect_number: {
    status: 402,
    message: 'Le numéro de carte est incorrect. Veuillez vérifier et réessayer.',
  },
  processing_error: {
    status: 502,
    message: 'Une erreur de traitement est survenue. Veuillez réessayer dans quelques instants.',
  },
  rate_limit: {
    status: 429,
    message: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
  },
};

// ── POST: Create PaymentIntent ───────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth check ──
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createCheckoutSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Échec de la validation',
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { userId, amount, currency, description, metadata } = parsed.data;

    // ── Build unique reservation reference ──
    const timestamp = Date.now();
    const reference = `CS_${timestamp.toString(36).toUpperCase()}`;

    // ── Idempotency key (userId + timestamp ensures uniqueness) ──
    const idempotencyKey = `checkout_${userId}_${timestamp}`;

    // ── Convert amount to cents for Stripe ──
    const amountInCents = Math.round(amount * 100);

    // ── Create Stripe PaymentIntent ──
    const { status, data } = await stripeRequest('/payment_intents', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: {
        amount: amountInCents,
        currency,
        'payment_method_types[]': 'card',
        description: description || `Paiement AeroAssist — ${reference}`,
        metadata: {
          userId,
          reference,
          source: 'aeroassist',
          ...(metadata || {}),
        },
        // Do not auto-confirm — frontend will confirm via Stripe Elements
        confirm: 'false',
      },
    });

    // ── Handle Stripe errors ──
    if (status >= 400 || !data) {
      const errorData = data as Record<string, unknown> | null;
      const stripeError = errorData?.error as Record<string, unknown> | undefined;
      const errorCode = stripeError?.code as string | undefined;

      logger.error('PaymentIntent creation failed (create-checkout-session)', {
        status,
        errorCode,
        errorMessage: stripeError?.message,
        userId,
        amount: amountInCents,
        currency,
      });

      // Map known Stripe error codes to user-friendly messages
      if (errorCode && STRIPE_ERROR_MAP[errorCode]) {
        const mapped = STRIPE_ERROR_MAP[errorCode];
        return NextResponse.json(
          {
            error: mapped.message,
            code: errorCode,
            details: stripeError?.message || undefined,
          },
          { status: mapped.status }
        );
      }

      // Generic Stripe error fallback
      return NextResponse.json(
        {
          error: 'Impossible de créer le paiement',
          details: stripeError?.message || `Erreur Stripe (${status})`,
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
        type: metadata?.reservationType || 'general',
        status: 'pending',
        reference,
        details: JSON.stringify({
          stripePaymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          paymentIntentStatus: paymentIntent.status,
          idempotencyKey,
          description: description || '',
          source: 'create-checkout-session',
          ...(metadata || {}),
        }),
        totalAmount: paymentIntent.amount / 100,
        currency: paymentIntent.currency || currency,
        paymentStatus: 'pending',
      },
    });

    logger.info('Checkout session created (PaymentIntent)', {
      paymentIntentId: paymentIntent.id,
      reservationId: reservation.id,
      reference,
      userId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      reservationId: reservation.id,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Create checkout session endpoint error', { error: msg });
    return NextResponse.json(
      { error: 'Erreur interne lors de la création de la session de paiement' },
      { status: 500 }
    );
  }
}
