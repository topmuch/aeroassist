import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { logger } from '@/lib/logger';
import { getDashboardAnalytics, type DashboardAnalytics } from '@/lib/analytics.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/dashboard
 *
 * Superadmin-only analytics endpoint.
 * Returns aggregated KPIs, top intents, revenue breakdown, and 7-day historical data.
 *
 * Query params:
 *   forceRefresh=true — bypass the 5-minute cache
 */
export async function GET(request: NextRequest) {
  // ── Auth: Superadmin only ───────────────────────────────────────
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = request.nextUrl;
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    const data: DashboardAnalytics = await getDashboardAnalytics(forceRefresh);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.message.includes('timeout');

    if (isTimeout) {
      logger.warn('analytics.dashboard.timeout', { error: (error as Error).message });
      return NextResponse.json(
        {
          success: false,
          error: 'Query timeout',
          message: 'Analytics queries exceeded 5s limit. Try again later.',
        },
        { status: 504 }
      );
    }

    logger.error('analytics.dashboard.error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to compute analytics.',
      },
      { status: 500 }
    );
  }
}
