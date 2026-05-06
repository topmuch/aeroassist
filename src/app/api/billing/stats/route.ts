import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/security';

// ── Validation Schema ──────────────────────────────────────────

const billingStatsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

// ── GET: Billing statistics with real SQL aggregations ──────────

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;
  const traceId = crypto.randomUUID?.() || `trace_${Date.now()}`;

  try {
    const { searchParams } = new URL(request.url);
    const months = searchParams.get('months') || '6';

    const parsed = billingStatsQuerySchema.safeParse({ months });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { months: numMonths } = parsed.data;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - numMonths);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // ── Real aggregations from Reservation table ──

    const [
      totalRevenue,
      totalPaid,
      totalPending,
      totalRefunded,
      totalReservations,
      paidCount,
      pendingCount,
      refundedCount,
      allReservations,
    ] = await Promise.all([
      // Total revenue (all)
      db.reservation.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: startDate } },
      }),
      // Total paid
      db.reservation.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'paid', createdAt: { gte: startDate } },
      }),
      // Total pending
      db.reservation.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'pending', createdAt: { gte: startDate } },
      }),
      // Total refunded
      db.reservation.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'refunded', createdAt: { gte: startDate } },
      }),
      // Total reservations count
      db.reservation.count({
        where: { createdAt: { gte: startDate } },
      }),
      // Paid count
      db.reservation.count({
        where: { paymentStatus: 'paid', createdAt: { gte: startDate } },
      }),
      // Pending count
      db.reservation.count({
        where: { paymentStatus: 'pending', createdAt: { gte: startDate } },
      }),
      // Refunded count
      db.reservation.count({
        where: { paymentStatus: 'refunded', createdAt: { gte: startDate } },
      }),
      // All reservations for per-month breakdown
      db.reservation.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          totalAmount: true,
          paymentStatus: true,
          type: true,
          currency: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // ── Per-month revenue breakdown ──
    const monthlyData: Record<string, { month: string; revenue: number; count: number; paid: number; pending: number; refunded: number }> = {};

    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];

    // Initialize months
    for (let i = 0; i < numMonths; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (numMonths - 1 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = {
        month: monthNames[d.getMonth()],
        revenue: 0,
        count: 0,
        paid: 0,
        pending: 0,
        refunded: 0,
      };
    }

    // Aggregate per month
    for (const r of allReservations) {
      const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key].count++;
        if (r.paymentStatus === 'paid') {
          monthlyData[key].revenue += r.totalAmount;
          monthlyData[key].paid++;
        } else if (r.paymentStatus === 'pending') {
          monthlyData[key].pending++;
        } else if (r.paymentStatus === 'refunded') {
          monthlyData[key].refunded++;
        }
      }
    }

    const monthlyRevenue = Object.entries(monthlyData).map(([, data]) => ({
      mois: data.month,
      revenus: Math.round(data.revenue * 100) / 100,
      count: data.count,
      paid: data.paid,
      pending: data.pending,
      refunded: data.refunded,
    }));

    // ── Per-type breakdown ──
    const typeBreakdown = await db.reservation.groupBy({
      by: ['type'],
      where: { createdAt: { gte: startDate } },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const typeStats = typeBreakdown.map((t) => ({
      type: t.type,
      total: t._sum.totalAmount || 0,
      count: t._count.id,
    }));

    // ── Average ticket ──
    const avgTicket = paidCount > 0
      ? (totalPaid._sum.totalAmount || 0) / paidCount
      : 0;

    console.log(JSON.stringify({
      level: 'info',
      traceId,
      event: 'billing_stats_fetched',
      totalRevenue: totalRevenue._sum.totalAmount,
      totalReservations,
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          totalPaid: totalPaid._sum.totalAmount || 0,
          totalPending: totalPending._sum.totalAmount || 0,
          totalRefunded: totalRefunded._sum.totalAmount || 0,
          totalReservations,
          paidCount,
          pendingCount,
          refundedCount,
          averageTicket: Math.round(avgTicket * 100) / 100,
          conversionRate: totalReservations > 0
            ? Math.round((paidCount / totalReservations) * 10000) / 100
            : 0,
        },
        monthlyRevenue,
        typeBreakdown: typeStats,
        period: {
          from: startDate.toISOString(),
          to: new Date().toISOString(),
          months: numMonths,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(JSON.stringify({
      level: 'error',
      traceId,
      event: 'billing_stats_error',
      error: message,
    }));

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch billing stats' },
      { status: 500 }
    );
  }
}
