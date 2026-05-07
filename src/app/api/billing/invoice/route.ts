/**
 * AeroAssist — Invoice Retrieval Endpoint
 * GET /api/billing/invoice?reservationId=...
 *
 * Returns an HTML invoice for a given reservation.
 * The HTML can be rendered in the browser or printed to PDF.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/security';
import { getInvoiceData, generateInvoiceHtml, storeInvoice } from '@/lib/invoice-generator';
import { db } from '@/lib/db';
import logger from '@/lib/logger';

// ── GET: Retrieve Invoice ────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth check ──
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const reservationId = searchParams.get('reservationId');

    // ── Validate input ──
    const parsed = z
      .object({
        reservationId: z.string().min(1, 'Reservation ID is required'),
      })
      .safeParse({ reservationId });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { reservationId: id } = parsed.data;

    // ── Check if cached invoice exists in reservation details ──
    const reservation = await db.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Try to load cached invoice
    let html: string | null = null;
    try {
      const details = JSON.parse(reservation.details || '{}');
      html = details.invoiceHtml || null;
    } catch {
      // details might be malformed — regenerate
    }

    // Generate fresh invoice if not cached
    if (!html) {
      const invoiceData = await getInvoiceData(id);
      if (!invoiceData) {
        return NextResponse.json(
          { error: 'Could not generate invoice data' },
          { status: 500 }
        );
      }

      html = generateInvoiceHtml(invoiceData);

      // Cache the invoice for future requests
      await storeInvoice(id, html);
    }

    logger.info('Invoice retrieved', {
      reservationId: id,
      reference: reservation.reference,
    });

    return NextResponse.json({
      success: true,
      html,
      reservationId: id,
      reference: reservation.reference,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Invoice retrieval error', { error: msg });
    return NextResponse.json(
      { error: 'Failed to retrieve invoice' },
      { status: 500 }
    );
  }
}
