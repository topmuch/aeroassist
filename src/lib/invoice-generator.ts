/**
 * AeroAssist — Invoice HTML Generator
 *
 * Generates branded HTML invoices for reservations.
 * Uses pure HTML/CSS — the user can print to PDF from the browser.
 */

import { db } from './db';
import logger from './logger';

// ── Types ────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;  // e.g. 85.00 (euros, not cents)
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerName: string;
  customerEmail: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  reference: string;
  paymentIntentId?: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getDueDate(date: Date): Date {
  const due = new Date(date);
  due.setDate(due.getDate() + 30);
  return due;
}

// ── Generate Invoice HTML ────────────────────────────────────────

/**
 * Generates a fully branded HTML invoice string.
 */
export function generateInvoiceHtml(data: InvoiceData): string {
  const lineItemsHtml = data.lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #374151;">${item.description}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.quantity}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">${formatCurrency(item.unitPrice, data.currency)}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">${formatCurrency(item.quantity * item.unitPrice, data.currency)}</td>
        </tr>`
    )
    .join('');

  const statusColors: Record<string, string> = {
    paid: 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;',
    pending: 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;',
    failed: 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;',
    refunded: 'background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;',
  };

  const statusLabels: Record<string, string> = {
    paid: 'PAYE',
    pending: 'EN ATTENTE',
    failed: 'IMPAYE',
    refunded: 'REMBOURSE',
  };

  const statusStyle = statusColors[data.status] || statusColors.pending;
  const statusLabel = statusLabels[data.status] || data.status.toUpperCase();

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Facture ${data.invoiceNumber} — AeroAssist</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f3f4f6; color: #111827; line-height: 1.6; }
    .invoice-container { max-width: 800px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #059669, #047857); padding: 32px 40px; display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .logo span { color: #a7f3d0; }
    .header-right { text-align: right; color: #d1fae5; font-size: 13px; }
    .body { padding: 40px; }
    .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .meta-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; font-weight: 600; }
    .meta-block p { color: #374151; font-size: 14px; margin-bottom: 2px; }
    .divider { height: 2px; background: linear-gradient(to right, #059669, #d1fae5, transparent); margin: 24px 0; border: none; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead th { padding: 12px 16px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; border-bottom: 2px solid #e5e7eb; font-weight: 600; }
    thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
    .totals { margin-top: 24px; display: flex; justify-content: flex-end; }
    .totals-table { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; color: #6b7280; font-size: 14px; }
    .totals-row.grand { border-top: 2px solid #059669; padding-top: 12px; margin-top: 4px; color: #111827; font-size: 18px; font-weight: 700; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; ${statusStyle} }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 40px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af; }
    .footer a { color: #059669; text-decoration: none; }
    .print-btn { margin: 20px 0 0 40px; }
    .print-btn button { background: #059669; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .print-btn button:hover { background: #047857; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="logo">Aero<span>Assist</span></div>
      <div class="header-right">
        <div><strong>Facture</strong></div>
        <div>${data.invoiceNumber}</div>
      </div>
    </div>

    <div class="body">
      <!-- Invoice Meta -->
      <div class="invoice-meta">
        <div class="meta-block">
          <h3>Factur&eacute; &agrave;</h3>
          <p style="font-weight:600; font-size:16px;">${data.customerName}</p>
          <p>${data.customerEmail}</p>
        </div>
        <div class="meta-block" style="text-align:right;">
          <h3>D&eacute;tails de la facture</h3>
          <p><strong>Date :</strong> ${data.date}</p>
          <p><strong>&Eacute;ch&eacute;ance :</strong> ${data.dueDate}</p>
          <p><strong>R&eacute;f&eacute;rence :</strong> ${data.reference}</p>
          <p style="margin-top:8px;"><span class="status-badge">${statusLabel}</span></p>
        </div>
      </div>

      <hr class="divider" />

      <!-- Line Items -->
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:center;">Qt&eacute;</th>
            <th style="text-align:right;">Prix unitaire</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <div class="totals">
        <div class="totals-table">
          <div class="totals-row">
            <span>Sous-total HT</span>
            <span>${formatCurrency(data.subtotal, data.currency)}</span>
          </div>
          <div class="totals-row">
            <span>TVA (${(data.taxRate * 100).toFixed(0)}%)</span>
            <span>${formatCurrency(data.taxAmount, data.currency)}</span>
          </div>
          <div class="totals-row grand">
            <span>Total TTC</span>
            <span>${formatCurrency(data.grandTotal, data.currency)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>
        <strong style="color:#6b7280;">AeroAssist</strong> &mdash; Services a&eacute;roportuaires premium
      </div>
      <div>
        contact@aeroassist.fr &middot; +33 1 23 45 67 89
      </div>
    </div>
  </div>

  <div class="print-btn no-print">
    <button onclick="window.print()">Imprimer / Sauvegarder en PDF</button>
  </div>
</body>
</html>`;
}

// ── Get Invoice Data from Reservation ────────────────────────────

/**
 * Fetches a reservation from the DB and formats it as InvoiceData.
 */
export async function getInvoiceData(reservationId: string): Promise<InvoiceData | null> {
  try {
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!reservation) {
      logger.warn('Invoice data: reservation not found', { reservationId });
      return null;
    }

    const details = JSON.parse(reservation.details || '{}');
    const amount = reservation.totalAmount;
    const subtotal = amount / 1.2; // Back-calculate HT from TTC (20% TVA)
    const taxAmount = amount - subtotal;

    // Build line items from reservation details
    const lineItems: InvoiceLineItem[] = [];
    const serviceLabels: Record<string, string> = {
      vip_lounge: 'Salon VIP AeroAssist',
      hotel: 'Hôtel Aéroport',
      car_rental: 'Location de Voiture',
      duty_free: 'Duty Free Express',
    };

    lineItems.push({
      description: serviceLabels[reservation.type] || `Service: ${reservation.type}`,
      quantity: 1,
      unitPrice: Math.round(subtotal * 100) / 100,
    });

    // Add any extra line items from details
    if (details.extras && Array.isArray(details.extras)) {
      for (const extra of details.extras) {
        lineItems.push({
          description: extra.description || 'Service supplémentaire',
          quantity: extra.quantity || 1,
          unitPrice: extra.unitPrice || 0,
        });
      }
    }

    return {
      invoiceNumber: `INV-${reservation.reference}`,
      date: formatDate(reservation.createdAt),
      dueDate: formatDate(getDueDate(reservation.createdAt)),
      customerName: reservation.user?.name || 'Client',
      customerEmail: reservation.user?.email || 'N/A',
      lineItems,
      subtotal: Math.round(subtotal * 100) / 100,
      taxRate: 0.20,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grandTotal: amount,
      currency: reservation.currency,
      status: (reservation.paymentStatus as InvoiceData['status']) || 'pending',
      reference: reservation.reference,
      paymentIntentId: details.stripePaymentIntent || undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to build invoice data', { reservationId, error: msg });
    return null;
  }
}

// ── Store Invoice HTML ───────────────────────────────────────────

/**
 * Stores the generated HTML invoice in the reservation's details JSON field.
 */
export async function storeInvoice(reservationId: string, htmlContent: string): Promise<boolean> {
  try {
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      logger.warn('Store invoice: reservation not found', { reservationId });
      return false;
    }

    const existingDetails = JSON.parse(reservation.details || '{}');
    existingDetails.invoiceHtml = htmlContent;
    existingDetails.invoiceGeneratedAt = new Date().toISOString();

    await db.reservation.update({
      where: { id: reservationId },
      data: { details: JSON.stringify(existingDetails) },
    });

    logger.info('Invoice stored for reservation', { reservationId, reference: reservation.reference });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to store invoice', { reservationId, error: msg });
    return false;
  }
}
