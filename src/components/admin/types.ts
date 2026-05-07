import React from "react";

// ─── API Types ─────────────────────────────────────────────────────────────

export interface ApiAnalyticsOverview {
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  resolutionRate: number;
  avgResponseTimeSeconds: number;
}

export interface ApiAnalytics {
  overview: ApiAnalyticsOverview;
  intentDistribution: Array<{ intent: string; count: number }>;
  messagesPerDay: Array<{ date: string; count: number }>;
}

// ─── Dashboard Analytics (New) ─────────────────────────────────────

export interface DashboardKpis {
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
}

export interface DashboardAnalyticsData {
  kpis: DashboardKpis;
  topIntents: Array<{ intent: string; count: number; percentage: number }>;
  revenueByType: Array<{ type: string; revenue: number; count: number }>;
  dailyHistory: Array<{
    date: string;
    label: string;
    revenue: number;
    messages: number;
    conversations: number;
    reservations: number;
    paidReservations: number;
  }>;
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

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar: string | null;
  language: string;
  isVerified: boolean;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  _count: { conversations: number; reservations: number };
}

export interface ApiKnowledge {
  id: string;
  title: string;
  content: string;
  source: string | null;
  category: string;
  status: string;
  version: number;
  chunkCount: number;
  ownerId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; email: string } | null;
}

export interface ApiReservation {
  id: string;
  userId: string | null;
  type: string;
  status: string;
  reference: string;
  details: string;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; phone: string } | null;
}

export interface ApiFlight {
  id: string;
  flightNumber: string;
  airline: string;
  departure: string;
  arrival: string;
  scheduledDep: string;
  scheduledArr: string;
  actualDep: string | null;
  actualArr: string | null;
  status: string;
  gate: string | null;
  terminal: string | null;
}

export interface Module {
  id: string;
  nom: string;
  description: string;
  icon: React.ReactNode;
  statut: boolean;
  utilisateurs: number;
  config?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HealthData {
  status: string;
  services: {
    database: { status: string; latencyMs: number; details: string; error: string };
    ai: { status: string; latencyMs: number; details: string; error: string };
    openbsp: { status: string; latencyMs: number; details: string; error: string };
    whatsapp: { status: string; latencyMs: number; details: string; error: string };
  };
  system: {
    nodeVersion: string;
    platform: string;
    memoryUsage: { rss: number; heapUsed: number; heapTotal: number };
  };
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  displayName: string;
  category: string;
  language: string;
  status: string;
}

export interface WhatsAppContact {
  id: string;
  phoneNumber: string;
  pushName: string | null;
  language: string;
  isOptIn: boolean;
  isBlacklisted: boolean;
  messageCount: number;
  lastSeenAt: string;
}

export interface AiLog {
  id: string;
  sessionId: string;
  userMessage: string;
  aiResponse: string;
  intent: string;
  confidence: number;
  timestamp: string;
}
