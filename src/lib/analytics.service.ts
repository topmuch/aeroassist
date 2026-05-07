/**
 * AeroAssist — Analytics Dashboard Service
 *
 * Optimized analytics queries for the admin dashboard.
 * - All queries run in parallel via Promise.all()
 * - Results cached in-memory for 5 minutes
 * - 5s query timeout protection
 * - No N+1 queries
 */

import { db } from '@/lib/db';
import { get, set, del } from '@/lib/cache';
import { logger } from '@/lib/logger';

// ── Cache Configuration ────────────────────────────────────────────

const ANALYTICS_CACHE_KEY = 'analytics:dashboard';
const ANALYTICS_CACHE_TTL_SECONDS = 300; // 5 minutes

// ── Date Helpers ───────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ── Query Timeout Helper ──────────────────────────────────────────

const QUERY_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Query timeout: ${label}`)), QUERY_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]);
}

// ── Historical Data Builders ───────────────────────────────────────

export interface DayBucket {
  date: string;
  label: string;
  revenue: number;
  messages: number;
  conversations: number;
  reservations: number;
  paidReservations: number;
}

function buildDayBuckets(): DayBucket[] {
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  const buckets: DayBucket[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    buckets.push({
      date: toDateString(d),
      label: `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`,
      revenue: 0,
      messages: 0,
      conversations: 0,
      reservations: 0,
      paidReservations: 0,
    });
  }
  return buckets;
}

// ── Main Analytics Function ────────────────────────────────────────

export interface DashboardAnalytics {
  kpis: {
    totalRevenue30d: number;
    totalRevenue7d: number;
    activeUsers24h: number;
    activeUsers7d: number;
    totalMessages7d: number;
    flightQueries7d: number;
    conversionRate: number;
    avgResponseTimeSeconds: number;
    totalConversations7d: number;
    totalReservations7d: number;
  };
  topIntents: Array<{ intent: string; count: number; percentage: number }>;
  revenueByType: Array<{ type: string; revenue: number; count: number }>;
  dailyHistory: DayBucket[];
  recentConversations: Array<{
    id: string;
    whatsappId: string;
    status: string;
    lastMessage: string | null;
    messageCount: number;
  }>;
  meta: {
    generatedAt: string;
    queryTimeMs: number;
    cacheHit: boolean;
  };
}

/**
 * Fetch all dashboard analytics with optimized parallel queries.
 * Results are cached for 5 minutes (use forceRefresh=true to bypass).
 */
export async function getDashboardAnalytics(
  forceRefresh = false
): Promise<DashboardAnalytics> {
  // Check cache first
  if (!forceRefresh) {
    const cached = get<DashboardAnalytics>(ANALYTICS_CACHE_KEY);
    if (cached) {
      logger.info('analytics.dashboard.cache_hit');
      return { ...cached, meta: { ...cached.meta, cacheHit: true } };
    }
  }

  const startTime = performance.now();

  // ── Run all queries in parallel (no N+1) ────────────────────────
  const [
    revenueResult,
    activeUsers24hResult,
    activeUsers7dResult,
    topIntentsResult,
    flightQueriesResult,
    recentReservations,
    paidReservations7d,
    totalReservations7d,
    totalConversations7d,
    recentMessages,
    recentConversations,
    messages7d,
    conversations7d,
  ] = await Promise.all([
    // 1. Revenue 30 days (paid reservations)
    withTimeout(
      db.reservation.aggregate({
        _sum: { totalAmount: true },
        where: {
          paymentStatus: 'PAID_DIRECT',
          createdAt: { gte: daysAgo(30) },
        },
      }),
      'revenue_30d'
    ),

    // 2. Active users 24h (distinct conversations with messages in last 24h)
    withTimeout(
      db.message.groupBy({
        by: ['conversationId'],
        where: { createdAt: { gte: daysAgo(1) } },
        _count: { id: true },
      }),
      'active_users_24h'
    ),

    // 3. Active users 7d
    withTimeout(
      db.message.groupBy({
        by: ['conversationId'],
        where: { createdAt: { gte: daysAgo(7) } },
        _count: { id: true },
      }),
      'active_users_7d'
    ),

    // 4. Top intents (7 days)
    withTimeout(
      db.message.groupBy({
        by: ['intent'],
        where: {
          intent: { not: null },
          createdAt: { gte: daysAgo(7) },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      'top_intents'
    ),

    // 5. Flight queries (7 days)
    withTimeout(
      db.message.count({
        where: {
          createdAt: { gte: daysAgo(7) },
          intent: { in: ['flight_status', 'flight_info', 'CHECK_FLIGHT', 'FLIGHT_STATUS'] },
        },
      }),
      'flight_queries'
    ),

    // 6. Reservations 7d (for daily history + revenue by type)
    withTimeout(
      db.reservation.findMany({
        where: { createdAt: { gte: daysAgo(7) } },
        select: {
          type: true,
          totalAmount: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      'reservations_7d'
    ),

    // 7. Paid reservations 7d (for conversion rate)
    withTimeout(
      db.reservation.count({
        where: {
          createdAt: { gte: daysAgo(7) },
          paymentStatus: 'PAID_DIRECT',
        },
      }),
      'paid_reservations_7d'
    ),

    // 8. Total reservations 7d
    withTimeout(
      db.reservation.count({
        where: { createdAt: { gte: daysAgo(7) } },
      }),
      'total_reservations_7d'
    ),

    // 9. Total conversations 7d
    withTimeout(
      db.conversation.count({
        where: { createdAt: { gte: daysAgo(7) } },
      }),
      'conversations_7d'
    ),

    // 10. Recent messages for response time calculation (last 7d, take 1000)
    withTimeout(
      db.message.findMany({
        where: { createdAt: { gte: daysAgo(7) } },
        orderBy: { createdAt: 'asc' },
        select: { conversationId: true, direction: true, createdAt: true, intent: true },
        take: 1000,
      }),
      'response_time'
    ),

    // 11. Recent conversations for dashboard
    withTimeout(
      db.conversation.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          whatsappId: true,
          status: true,
          lastMessage: true,
          messages: { select: { id: true } },
        },
      }),
      'recent_conversations'
    ),

    // 12. Messages 7d for daily history
    withTimeout(
      db.message.findMany({
        where: { createdAt: { gte: daysAgo(7) } },
        select: { createdAt: true },
      }),
      'messages_7d'
    ),

    // 13. Conversations 7d for daily history
    withTimeout(
      db.conversation.findMany({
        where: { createdAt: { gte: daysAgo(7) } },
        select: { createdAt: true },
      }),
      'conversations_7d'
    ),
  ]);

  const queryTimeMs = Math.round(performance.now() - startTime);

  // ── Process KPIs ────────────────────────────────────────────────

  const totalRevenue30d = revenueResult._sum.totalAmount || 0;

  // Revenue by type + daily paid revenue from recent reservations
  const revenueByTypeMap = new Map<string, { revenue: number; count: number }>();
  let totalRevenue7d = 0;

  for (const r of recentReservations) {
    if (r.paymentStatus === 'PAID_DIRECT') {
      totalRevenue7d += r.totalAmount;
    }
    const existing = revenueByTypeMap.get(r.type) || { revenue: 0, count: 0 };
    existing.revenue += r.totalAmount;
    existing.count += 1;
    revenueByTypeMap.set(r.type, existing);
  }

  // Active users = distinct conversation count with messages
  const activeUsers24h = activeUsers24hResult.length;
  const activeUsers7d = activeUsers7dResult.length;

  // Total intents for percentage calculation
  const totalIntentCount = topIntentsResult.reduce((sum, item) => sum + item._count.id, 0);

  // Top intents
  const topIntents = topIntentsResult
    .filter((item) => item.intent !== null)
    .map((item) => ({
      intent: item.intent!,
      count: item._count.id,
      percentage: totalIntentCount > 0 ? Math.round((item._count.id / totalIntentCount) * 1000) / 10 : 0,
    }));

  // Conversion rate = paid reservations / total reservations (7d)
  const conversionRate =
    totalReservations7d > 0
      ? Math.round((paidReservations7d / totalReservations7d) * 1000) / 10
      : 0;

  // Average response time (inbound -> outbound pairs)
  let totalResponseTime = 0;
  let responseCount = 0;
  const convMsgs: Record<string, Array<{ direction: string; createdAt: Date }>> = {};

  for (const msg of recentMessages) {
    if (!convMsgs[msg.conversationId]) convMsgs[msg.conversationId] = [];
    convMsgs[msg.conversationId].push(msg);
  }

  for (const msgs of Object.values(convMsgs)) {
    for (let i = 0; i < msgs.length - 1; i++) {
      if (msgs[i].direction === 'inbound' && msgs[i + 1].direction === 'outbound') {
        const diff = msgs[i + 1].createdAt.getTime() - msgs[i].createdAt.getTime();
        if (diff >= 0 && diff < 3600000) {
          totalResponseTime += diff;
          responseCount++;
        }
      }
    }
  }

  const avgResponseTimeSeconds =
    responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000) : 0;

  // ── Build Daily History (7 days) ────────────────────────────────

  const buckets = buildDayBuckets();

  // Messages per day
  for (const msg of messages7d) {
    const dayStr = toDateString(msg.createdAt);
    const bucket = buckets.find((b) => b.date === dayStr);
    if (bucket) bucket.messages++;
  }

  // Conversations per day
  for (const conv of conversations7d) {
    const dayStr = toDateString(conv.createdAt);
    const bucket = buckets.find((b) => b.date === dayStr);
    if (bucket) bucket.conversations++;
  }

  // Reservations & revenue per day
  for (const r of recentReservations) {
    const dayStr = toDateString(r.createdAt);
    const bucket = buckets.find((b) => b.date === dayStr);
    if (bucket) {
      bucket.reservations++;
      if (r.paymentStatus === 'PAID_DIRECT') {
        bucket.paidReservations++;
        bucket.revenue += r.totalAmount;
      }
    }
  }

  // Revenue by type sorted by revenue desc
  const revenueByType = Array.from(revenueByTypeMap.entries())
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  // Recent conversations with PII masking
  const recentConvoList = recentConversations.map((c) => ({
    id: c.id,
    whatsappId: c.whatsappId.replace(/(\+?\d{2})\d+(\d{2})/, '$1****$2'),
    status: c.status,
    lastMessage: c.lastMessage?.toISOString() || null,
    messageCount: c.messages.length,
  }));

  // ── Assemble Result ─────────────────────────────────────────────

  const result: DashboardAnalytics = {
    kpis: {
      totalRevenue30d,
      totalRevenue7d,
      activeUsers24h,
      activeUsers7d,
      totalMessages7d: messages7d.length,
      flightQueries7d: flightQueriesResult,
      conversionRate,
      avgResponseTimeSeconds,
      totalConversations7d,
      totalReservations7d,
    },
    topIntents,
    revenueByType,
    dailyHistory: buckets,
    recentConversations: recentConvoList,
    meta: {
      generatedAt: new Date().toISOString(),
      queryTimeMs,
      cacheHit: false,
    },
  };

  // Cache the result
  set(ANALYTICS_CACHE_KEY, result, ANALYTICS_CACHE_TTL_SECONDS);
  logger.info('analytics.dashboard.computed', {
    queryTimeMs,
    cacheTtl: ANALYTICS_CACHE_TTL_SECONDS,
  });

  return result;
}

/**
 * Invalidate analytics cache (called after data mutations).
 */
export function invalidateAnalyticsCache(): void {
  del(ANALYTICS_CACHE_KEY);
  logger.info('analytics.dashboard.cache_invalidated');
}
