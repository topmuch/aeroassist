/**
 * AeroAssist — Stripe Integration Service
 * Handles:
 * - Checkout session creation (VIP Lounge, Hotels, Car Rental, Duty Free)
 * - Webhook processing (payment success, failure, refund)
 * - Customer portal management
 * - Subscription lifecycle
 *
 * Uses Stripe API v2024-12-18.acacia
 */

import { db } from './db';
import logger from './logger';
import { getInvoiceData, generateInvoiceHtml, storeInvoice } from './invoice-generator';

// ── Types ────────────────────────────────────────────────────────

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  isConfigured: boolean;
}

export interface CheckoutSessionParams {
  userId: string;
  reservationType: 'vip_lounge' | 'hotel' | 'car_rental' | 'duty_free';
  amount: number;           // In cents (e.g., 5000 = €50.00)
  currency?: string;        // Default: 'eur'
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResult {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  error?: string;
}

export interface PortalResult {
  success: boolean;
  url?: string;
  error?: string;
}

// ── Service Tier Pricing (in EUR) ───────────────────────────────

export const PRICING = {
  vip_lounge: {
    name: 'Salon VIP AeroAssist',
    description: 'Accès au salon VIP avec boissons, snacks, WiFi premium',
    prices: [
      { id: 'vip_2h', label: '2 heures', amount: 3500 },    // €35
      { id: 'vip_4h', label: '4 heures', amount: 5500 },    // €55
      { id: 'vip_day', label: 'Journée', amount: 8500 },    // €85
    ],
  },
  hotel: {
    name: 'Hôtel Aéroport',
    description: 'Réservation de chambre dans les hôtels partenaires',
    prices: [
      { id: 'hotel_night', label: '1 nuit', amount: 9900 },   // €99
      { id: 'hotel_2nights', label: '2 nuits', amount: 17900 }, // €179
    ],
  },
  car_rental: {
    name: 'Location de Voiture',
    description: 'Voiture avec chauffeur ou self-service',
    prices: [
      { id: 'car_halfday', label: 'Demi-journée', amount: 4500 },  // €45
      { id: 'car_fullday', label: 'Journée', amount: 7500 },       // €75
      { id: 'car_weekend', label: 'Week-end', amount: 12000 },     // €120
    ],
  },
  duty_free: {
    name: 'Duty Free Express',
    description: 'Commande en ligne, retrait à l\'aéroport',
    prices: [],  // Dynamic, depends on products
  },
} as const;

export type ReservationType = keyof typeof PRICING;

// ── Configuration ───────────────────────────────────────────────

function getConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  return {
    secretKey,
    publishableKey,
    webhookSecret,
    isConfigured: !!(secretKey && publishableKey),
  };
}

/**
 * Get the public Stripe configuration for the frontend.
 */
export function getPublicConfig(): { publishableKey: string; isConfigured: boolean } {
  const config = getConfig();
  return {
    publishableKey: config.publishableKey,
    isConfigured: config.isConfigured,
  };
}

// ── Stripe API Helper ───────────────────────────────────────────

export async function stripeRequest(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
): Promise<{ status: number; data: unknown }> {
  const config = getConfig();

  if (!config.secretKey) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: options.method || 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${config.secretKey}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers,
    },
    body: options.body
      ? Object.entries(options.body)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => {
            // Stripe expects array keys like payment_method_types[] to remain unencoded
            // Only encode the key if it doesn't end with []
            const encodedKey = k.endsWith('[]')
              ? k
              : encodeURIComponent(k);
            return `${encodedKey}=${encodeURIComponent(String(v))}`;
          })
          .join('&')
      : undefined,
  });

  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

// ── Create Checkout Session ─────────────────────────────────────

/**
 * Create a Stripe Checkout session for a reservation.
 */
export async function createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutResult> {
  const config = getConfig();

  if (!config.isConfigured) {
    logger.warn('Stripe checkout attempted but not configured');
    return {
      success: false,
      error: 'Stripe is not configured. Contact administrator.',
    };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
    const successUrl = params.successUrl || `${baseUrl}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = params.cancelUrl || `${baseUrl}/api/stripe/cancel`;

    const { status, data } = await stripeRequest('/checkout/sessions', {
      body: {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: params.currency || 'eur',
              product_data: {
                name: PRICING[params.reservationType]?.name || 'AeroAssist Service',
                description: PRICING[params.reservationType]?.description || '',
              },
              unit_amount: params.amount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: params.userId,
          reservationType: params.reservationType,
          source: 'aeroassist',
          ...(params.metadata || {}),
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: params.metadata?.email || undefined,
      },
    });

    if (status >= 400 || !data || !(data as Record<string, unknown>)?.id) {
      const errorData = data as Record<string, unknown> | null;
      logger.error('Stripe checkout session creation failed', {
        status,
        error: errorData?.error,
      });
      return {
        success: false,
        error: errorData?.error?.toString() || `Stripe error (${status})`,
      };
    }

    const session = data as { id: string; url: string };
    logger.info('Stripe checkout session created', {
      sessionId: session.id,
      userId: params.userId,
      type: params.reservationType,
      amount: params.amount,
    });

    return {
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Stripe checkout error', { error: msg, userId: params.userId });
    return { success: false, error: msg };
  }
}

// ── Create Customer Portal Session ──────────────────────────────

/**
 * Create a Stripe Customer Portal session for managing subscriptions/payments.
 */
export async function createPortalSession(customerId: string, returnUrl: string): Promise<PortalResult> {
  const config = getConfig();

  if (!config.isConfigured) {
    return { success: false, error: 'Stripe is not configured' };
  }

  try {
    const { status, data } = await stripeRequest('/billing_portal/sessions', {
      body: {
        customer: customerId,
        return_url: returnUrl,
      },
    });

    if (status >= 400 || !data) {
      return {
        success: false,
        error: `Stripe portal error (${status})`,
      };
    }

    const session = data as { url: string };
    return { success: true, url: session.url };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

// ── Verify Webhook Signature ────────────────────────────────────

/**
 * Verify a Stripe webhook signature.
 * Uses the STRIPE_WEBHOOK_SECRET for HMAC-SHA256 verification.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<{ valid: boolean; event?: unknown; error?: string }> {
  const config = getConfig();

  if (!config.webhookSecret) {
    logger.warn('Stripe webhook received but webhook secret not configured');
    // In dev mode, accept unsigned webhooks
    if (process.env.NODE_ENV !== 'production') {
      try {
        return { valid: true, event: JSON.parse(payload) };
      } catch {
        return { valid: false, error: 'Invalid JSON payload' };
      }
    }
    return { valid: false, error: 'Webhook secret not configured' };
  }

  // Parse signature header: t=timestamp,v1=signature
  const elements = signature.split(',');
  let timestamp = '';
  let stripeSignature = '';

  for (const element of elements) {
    const [key, value] = element.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') stripeSignature = value;
  }

  if (!timestamp || !stripeSignature) {
    return { valid: false, error: 'Invalid signature format' };
  }

  // Check timestamp freshness (reject events older than 5 minutes)
  const tolerance = 300;
  const now = Math.floor(Date.now() / 1000);
  if (now - parseInt(timestamp) > tolerance) {
    return { valid: false, error: 'Webhook timestamp too old' };
  }

  // Compute expected signature
  const cryptoModule = await import('crypto');
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSig = cryptoModule
    .createHmac('sha256', config.webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  // Constant-time comparison
  try {
    const isValid = cryptoModule.timingSafeEqual(
      Buffer.from(stripeSignature, 'utf8'),
      Buffer.from(expectedSig, 'utf8')
    );

    if (isValid) {
      try {
        return { valid: true, event: JSON.parse(payload) };
      } catch {
        return { valid: false, error: 'Invalid JSON payload' };
      }
    }
    return { valid: false, error: 'Signature mismatch' };
  } catch {
    return { valid: false, error: 'Signature length mismatch' };
  }
}

// ── Webhook Event Processing ────────────────────────────────────

export interface WebhookProcessResult {
  processed: boolean;
  eventType: string;
  reservationId?: string;
  error?: string;
}

/**
 * Process a Stripe webhook event and update the database accordingly.
 */
export async function processWebhookEvent(event: Record<string, unknown>): Promise<WebhookProcessResult> {
  const eventType = event.type as string;
  const eventData = event.data as Record<string, unknown> | undefined;
  const data = eventData?.object as Record<string, unknown> | undefined;

  if (!data) {
    return { processed: false, eventType, error: 'No event data' };
  }

  logger.info('Processing Stripe webhook', { eventType, eventId: event.id });

  try {
    switch (eventType) {
      case 'checkout.session.completed': {
        // Payment successful — update reservation
        const metadata = data.metadata as Record<string, string> | undefined;
        const userId = metadata?.userId;
        const reservationType = metadata?.reservationType;
        const amountTotal = data.amount_total as number;

        if (userId && reservationType) {
          const reference = `STR_${(data.id as string).slice(-12)}`;

          await db.reservation.create({
            data: {
              userId,
              type: reservationType,
              status: 'confirmed',
              reference,
              details: JSON.stringify({
                stripeSessionId: data.id,
                stripePaymentIntent: data.payment_intent,
                amount: amountTotal,
                currency: data.currency,
              }),
              totalAmount: amountTotal / 100,
              currency: (data.currency as string) || 'eur',
              paymentStatus: 'paid',
              paidAt: new Date(),
            },
          });

          logger.info('Reservation created from Stripe payment', {
            reference,
            userId,
            type: reservationType,
            amount: amountTotal,
          });
        }

        return { processed: true, eventType };
      }

      case 'payment_intent.succeeded': {
        // Direct PaymentIntent succeeded — update reservation and generate invoice
        const metadata = data.metadata as Record<string, string> | undefined;
        const userId = metadata?.userId;
        const reference = metadata?.reference;
        const piId = data.id as string;

        if (reference) {
          const reservation = await db.reservation.findUnique({
            where: { reference },
          });

          if (reservation) {
            await db.reservation.update({
              where: { id: reservation.id },
              data: {
                status: 'confirmed',
                paymentStatus: 'paid',
                paidAt: new Date(),
              },
            });

            // Generate and store the invoice
            try {
              const invoiceData = await getInvoiceData(reservation.id);
              if (invoiceData) {
                const html = generateInvoiceHtml(invoiceData);
                await storeInvoice(reservation.id, html);
              }
            } catch (invoiceErr) {
              // Non-fatal: log but don't fail the webhook
              logger.error('Invoice generation failed after PaymentIntent success', {
                reservationId: reservation.id,
                error: invoiceErr instanceof Error ? invoiceErr.message : String(invoiceErr),
              });
            }

            logger.info('Reservation confirmed via PaymentIntent', {
              reservationId: reservation.id,
              reference,
              paymentIntentId: piId,
              userId,
            });

            return { processed: true, eventType, reservationId: reservation.id };
          }
        }

        // Fallback: no matching reservation found, log and acknowledge
        logger.warn('PaymentIntent succeeded but no matching reservation found', {
          paymentIntentId: piId,
          userId,
          reference,
        });

        return { processed: true, eventType };
      }

      case 'payment_intent.payment_failed': {
        // Direct PaymentIntent failed — update the reservation
        const metadata = data.metadata as Record<string, string> | undefined;
        const reference = metadata?.reference;
        const piId = data.id as string;
        const lastPaymentError = data.last_payment_error as Record<string, unknown> | undefined;

        if (reference) {
          const reservation = await db.reservation.findUnique({
            where: { reference },
          });

          if (reservation) {
            await db.reservation.update({
              where: { id: reservation.id },
              data: {
                status: 'cancelled',
                paymentStatus: 'failed',
              },
            });

            logger.warn('Reservation cancelled due to PaymentIntent failure', {
              reservationId: reservation.id,
              reference,
              paymentIntentId: piId,
              errorMessage: lastPaymentError?.message,
            });

            return { processed: true, eventType, reservationId: reservation.id };
          }
        }

        // Fallback: log for analytics if no reservation matched
        logger.warn('Stripe payment failed', {
          paymentIntentId: piId,
          amount: data.amount,
          currency: data.currency,
          errorMessage: lastPaymentError?.message,
        });

        return { processed: true, eventType };
      }

      case 'charge.refunded': {
        // Refund — update reservation payment status
        const amountRefunded = data.amount_refunded as number;

        // Match by PaymentIntent ID for accuracy (not userId + orderBy which matches wrong reservation)
        const paymentIntentId = data.payment_intent as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reservation from findMany needs dynamic access
        let reservation: any = null;

        if (paymentIntentId) {
          // Try matching by paymentIntentId stored in reservation details
          const allPaidReservations = await db.reservation.findMany({
            where: { paymentStatus: 'paid' },
          });
          reservation = allPaidReservations.find((r: any) => {
            try {
              const details = JSON.parse(r.details || '{}');
              return details.stripePaymentIntent === paymentIntentId;
            } catch {
              return false;
            }
          }) || null;
        }

        if (!reservation) {
          // Fallback: match by Stripe charge ID in details
          const chargeId = data.id as string;
          const allPaidReservations = await db.reservation.findMany({
            where: { paymentStatus: 'paid' },
          });
          reservation = allPaidReservations.find((r: any) => {
            try {
              const details = JSON.parse(r.details || '{}');
              return details.stripeChargeId === chargeId;
            } catch {
              return false;
            }
          }) || null;
        }

        if (reservation) {
          await db.reservation.update({
            where: { id: reservation.id },
            data: {
              paymentStatus: 'refunded',
              status: 'cancelled',
            },
          });

          logger.info('Reservation refunded', {
            reservationId: reservation.id,
            reference: reservation.reference,
            amountRefunded,
          });
        } else {
          logger.warn('Charge refunded but no matching reservation found', {
            paymentIntentId,
            amountRefunded,
          });
        }

        return { processed: true, eventType };
      }

      default:
        logger.info('Unhandled Stripe event type', { eventType });
        return { processed: false, eventType };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Stripe webhook processing failed', { eventType, error: msg });
    return { processed: false, eventType, error: msg };
  }
}
