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
