/**
 * AeroAssist — Invoice PDF Generation Endpoint
 * GET /api/billing/invoice/[id]/pdf
 *
 * Generates and returns an HTML invoice for a reservation.
 * The browser can print the HTML to PDF (Ctrl+P / Cmd+P).
 *
 * Flow:
 * 1. Auth check
 * 2. Fetch reservation from DB by ID
 * 3. Build invoice data via getInvoiceData()
 * 4. Generate HTML via generateInvoiceHtml()
 * 5. Return HTML with Content-Disposition for download
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { getInvoiceData, generateInvoiceHtml } from '@/lib/invoice-generator';
import logger from '@/lib/logger';

// ── GET: Generate and Return Invoice HTML ────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth check ──
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID de réservation invalide' },
        { status: 400 }
      );
    }

    // ── Fetch invoice data from reservation ──
    const invoiceData = await getInvoiceData(id);

    if (!invoiceData) {
      logger.warn('Invoice PDF requested but reservation not found', { reservationId: id });
      return NextResponse.json(
        { error: 'Facture introuvable', details: `Aucune réservation trouvée avec l'ID: ${id}` },
        { status: 404 }
      );
    }

    // ── Generate HTML invoice ──
    const html = generateInvoiceHtml(invoiceData);

    logger.info('Invoice PDF generated', {
      reservationId: id,
      invoiceNumber: invoiceData.invoiceNumber,
      reference: invoiceData.reference,
    });

    // ── Return HTML as downloadable file ──
    // Content-Disposition prompts browser download; user can open in browser and print to PDF
    const filename = `${invoiceData.invoiceNumber.replace(/\//g, '-')}.html`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Invoice PDF generation error', { error: msg });
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la facture', details: msg },
      { status: 500 }
    );
  }
}
