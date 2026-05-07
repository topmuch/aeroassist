import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/security';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    // Run all analytics queries in parallel
    const [
      totalConversations,
      totalMessages,
      activeUsersCount,
      intentDistribution,
      messagesPerDay,
      resolvedConversations,
      totalClosedConversations,
    ] = await Promise.all([
      // Total conversations
      db.conversation.count(),

      // Total messages
      db.message.count(),

      // Active users (have logged in or have conversations in last 30 days)
      db.user.count({
        where: {
          OR: [
            { isActive: true },
            {
              conversations: {
                some: {
                  updatedAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  },
                },
              },
            },
          ],
        },
      }),

      // Intent distribution - count messages grouped by intent
      db.message.groupBy({
        by: ['intent'],
        where: { intent: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Messages per day (last 7 days)
      db.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM Message
        WHERE createdAt >= DATE('now', '-7 days')
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `,

      // Resolved conversations (status = closed)
      db.conversation.count({ where: { status: 'closed' } }),

      // Total closed or escalated conversations for resolution rate
      db.conversation.count({
        where: { status: { in: ['closed', 'escalated'] } },
      }),
    ]);

    // Calculate resolution rate (as ratio 0-1)
    const resolutionRate =
      totalClosedConversations > 0
        ? resolvedConversations / totalClosedConversations
        : 0;

    // Calculate average response time (approximate from message pairs)
    const recentMessages = await db.message.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'asc' },
      select: { conversationId: true, direction: true, createdAt: true },
      take: 500,
    });

    let totalResponseTime = 0;
    let responseCount = 0;

    // Group by conversation and find inbound->outbound pairs
    const conversationMessages: Record<string, Array<{ direction: string; createdAt: Date }>> = {};
    for (const msg of recentMessages) {
      if (!conversationMessages[msg.conversationId]) {
        conversationMessages[msg.conversationId] = [];
      }
      conversationMessages[msg.conversationId].push(msg);
    }

    for (const messages of Object.values(conversationMessages)) {
      for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].direction === 'inbound' && messages[i + 1].direction === 'outbound') {
          const diff = messages[i + 1].createdAt.getTime() - messages[i].createdAt.getTime();
          if (diff >= 0 && diff < 3600000) {
            // Only count responses under 1 hour (filter anomalies)
            totalResponseTime += diff;
            responseCount++;
          }
        }
      }
    }

    const avgResponseTime =
      responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000) : 0; // in seconds

    // Format intent distribution
    const intentData = intentDistribution
      .filter((item) => item.intent !== null)
      .map((item) => ({
        intent: item.intent,
        count: item._count.id,
      }));

    // Format messages per day
    const dailyMessages = messagesPerDay.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalConversations,
          totalMessages,
          activeUsers: activeUsersCount,
          resolutionRate,
          avgResponseTimeSeconds: avgResponseTime,
        },
        intentDistribution: intentData,
        messagesPerDay: dailyMessages,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[Analytics API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
