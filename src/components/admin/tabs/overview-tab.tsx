"use client";

import React from "react";
import {
  MessageCircle,
  Users,
  CheckCircle,
  Euro,
  TrendingUp,
  TrendingDown,
  Activity,
  Plane,
  RefreshCw,
  Zap,
  Target,
  Clock,
  BarChart3,
  DollarSign,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  messagesChartConfig,
  intentChartConfig,
  LoadingSpinner,
  intentLabelMap,
  formatCurrency,
} from "../helpers";
import type { ApiAnalytics, DashboardAnalyticsData } from "../types";

// ─── Chart Color Palette ─────────────────────────────────────────────────────

const COLORS = [
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#f97316",
  "#6366f1",
];

const CHART_CONFIGS = {
  revenue: { label: "Revenus (€)", color: "#10b981" },
  messages: { label: "Messages", color: "#f59e0b" },
  conversations: { label: "Conversations", color: "#06b6d4" },
  reservations: { label: "Réservations", color: "#8b5cf6" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface OverviewTabProps {
  analytics: ApiAnalytics | null;
  loading: boolean;
  chartMessagesData: Array<{ jour: string; messages: number }>;
  chartIntentData: Array<{ intent: string; count: number }>;
  recentActivity: Array<{
    id: string;
    action: string;
    utilisateur: string;
    detail: string;
    timestamp: string;
  }>;
  dashboardAnalytics: DashboardAnalyticsData | null;
  dashboardLoading: boolean;
  onRefreshDashboard: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OverviewTab({
  analytics,
  loading,
  chartMessagesData,
  chartIntentData,
  recentActivity,
  dashboardAnalytics: da,
  dashboardLoading,
  onRefreshDashboard,
}: OverviewTabProps) {
  const isLoading = loading || dashboardLoading;

  if (isLoading && !da) {
    return (
      <div className="space-y-6">
        <LoadingSpinner text="Chargement des statistiques..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══════ Header Row ═══════ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Vue d&apos;ensemble</h2>
          <p className="text-sm text-muted-foreground">
            Métriques temps réel — 7 derniers jours
          </p>
        </div>
        <div className="flex items-center gap-2">
          {da?.meta && (
            <Badge variant="outline" className="text-xs gap-1">
              <Activity className="h-3 w-3" />
              {da.meta.cacheHit ? "Cache" : `${da.meta.queryTimeMs}ms`}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshDashboard}
            disabled={dashboardLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${dashboardLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* ═══════ KPI Cards (Enhanced) ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Revenue 30d */}
        <Card className="border-0 overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25">
          <CardContent className="p-4 relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-white/30" />
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">Revenus 30j</p>
                <p className="text-xl font-bold mt-0.5 text-white">
                  {formatCurrency(da?.kpis.totalRevenue30d || 0)}
                </p>
                <p className="text-[10px] text-white/60 mt-1">
                  7j: {formatCurrency(da?.kpis.totalRevenue7d || 0)}
                </p>
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card className="border-0 overflow-hidden bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/25">
          <CardContent className="p-4 relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-white/30" />
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">Utilisateurs actifs</p>
                <p className="text-xl font-bold mt-0.5 text-white">
                  {da?.kpis.activeUsers24h || 0}
                </p>
                <p className="text-[10px] text-white/60 mt-1">
                  7j: {da?.kpis.activeUsers7d || 0}
                </p>
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="border-0 overflow-hidden bg-gradient-to-br from-violet-400 to-violet-600 shadow-lg shadow-violet-500/25">
          <CardContent className="p-4 relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-white/30" />
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">Messages 7j</p>
                <p className="text-xl font-bold mt-0.5 text-white">
                  {(da?.kpis.totalMessages7d || 0).toLocaleString("fr-FR")}
                </p>
                <p className="text-[10px] text-white/60 mt-1">
                  {analytics?.overview.totalMessages?.toLocaleString("fr-FR") || 0} total
                </p>
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="border-0 overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/25">
          <CardContent className="p-4 relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-white/30" />
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">Taux conversion</p>
                <p className="text-xl font-bold mt-0.5 text-white">
                  {da?.kpis.conversionRate || 0}%
                </p>
                <p className="text-[10px] text-white/60 mt-1">
                  {da?.kpis.totalReservations7d || 0} réservations
                </p>
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                <Target className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avg Response Time */}
        <Card className="border-0 overflow-hidden bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-500/25 col-span-2 lg:col-span-1">
          <CardContent className="p-4 relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-white/30" />
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">Temps réponse</p>
                <p className="text-xl font-bold mt-0.5 text-white">
                  {da?.kpis.avgResponseTimeSeconds || analytics?.overview.avgResponseTimeSeconds || 0}s
                </p>
                <p className="text-[10px] text-white/60 mt-1">
                  <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                  Temps moyen
                </p>
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                <Zap className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════ Secondary KPIs Row ═══════ */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 shrink-0">
            <BarChart3 className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Conversations 7j</p>
            <p className="text-lg font-bold">{da?.kpis.totalConversations7d?.toLocaleString("fr-FR") || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shrink-0">
            <Plane className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Requêtes vols 7j</p>
            <p className="text-lg font-bold">{da?.kpis.flightQueries7d?.toLocaleString("fr-FR") || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 shrink-0">
            <CheckCircle className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Résolution</p>
            <p className="text-lg font-bold">
              {analytics?.overview.resolutionRate != null
                ? `${(analytics.overview.resolutionRate * 100).toFixed(1)}%`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════ Charts Row 1 ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue + Messages Combined Chart */}
        <Card className="premium-card">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-base">Revenus & Messages</CardTitle>
            <CardDescription>Évolution sur 7 jours</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {da && da.dailyHistory.length > 0 ? (
              <ChartContainer config={CHART_CONFIGS} className="h-[280px] w-full">
                <AreaChart data={da.dailyHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_CONFIGS.revenue.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_CONFIGS.revenue.color} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="messagesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_CONFIGS.messages.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_CONFIGS.messages.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke={CHART_CONFIGS.revenue.color} fill="url(#revenueGrad)" strokeWidth={2} name="Revenus (€)" />
                  <Area yAxisId="right" type="monotone" dataKey="messages" stroke={CHART_CONFIGS.messages.color} fill="url(#messagesGrad)" strokeWidth={2} name="Messages" />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversations + Reservations Line Chart */}
        <Card className="premium-card">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-base">Conversations & Réservations</CardTitle>
            <CardDescription>Tendances sur 7 jours</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {da && da.dailyHistory.length > 0 ? (
              <ChartContainer config={CHART_CONFIGS} className="h-[280px] w-full">
                <LineChart data={da.dailyHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="conversations" stroke={CHART_CONFIGS.conversations.color} strokeWidth={2.5} dot={{ r: 4, fill: CHART_CONFIGS.conversations.color }} name="Conversations" />
                  <Line type="monotone" dataKey="reservations" stroke={CHART_CONFIGS.reservations.color} strokeWidth={2.5} dot={{ r: 4, fill: CHART_CONFIGS.reservations.color }} name="Réservations" />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════ Charts Row 2 ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Intents (Horizontal Bar) */}
        <Card className="premium-card">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-base">Top Intentions</CardTitle>
            <CardDescription>Par fréquence (7j)</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {da && da.topIntents.length > 0 ? (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
                {da.topIntents.slice(0, 8).map((item, idx) => (
                  <div key={item.intent} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate">
                          {intentLabelMap[item.intent] || item.intent}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(item.percentage, 2)}%`,
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-8 text-right shrink-0">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Type (Pie/Donut) */}
        <Card className="premium-card">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-base">Revenus par type</CardTitle>
            <CardDescription>Répartition 30 jours</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {da && da.revenueByType.length > 0 ? (
              <div className="flex flex-col items-center gap-3">
                <ChartContainer
                  config={Object.fromEntries(
                    da.revenueByType.map((item, idx) => [
                      item.type,
                      { label: item.type, color: COLORS[idx % COLORS.length] },
                    ])
                  )}
                  className="h-[180px] w-[180px]"
                >
                  <PieChart>
                    <Pie
                      data={da.revenueByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="revenue"
                      nameKey="type"
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {da.revenueByType.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full mt-1">
                  {da.revenueByType.slice(0, 6).map((item, idx) => (
                    <div key={item.type} className="flex items-center gap-2 text-xs">
                      <div
                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="truncate text-muted-foreground">
                        {item.type.replace(/_/g, " ")}
                      </span>
                      <span className="ml-auto font-medium shrink-0">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée de revenus
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages per day (original area chart preserved) */}
        <Card className="premium-card">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-base">Messages par jour</CardTitle>
            <CardDescription>Derniers jours</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {chartMessagesData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            ) : (
              <ChartContainer config={messagesChartConfig} className="h-[250px] w-full">
                <AreaChart
                  data={chartMessagesData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="jour" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    stroke="var(--chart-1)"
                    fill="url(#messagesGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════ Charts Row 3: Intent Bar + Recent Activity ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intent Distribution Bar Chart */}
        <Card className="premium-card">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-base">Distribution des intentions</CardTitle>
            <CardDescription>Par catégorie de requête</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {chartIntentData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            ) : (
              <ChartContainer config={intentChartConfig} className="h-[250px] w-full">
                <BarChart
                  data={chartIntentData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="intent" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="premium-card">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base">Activité récente</CardTitle>
            <CardDescription>Dernières actions sur la plateforme</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[310px] overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Aucune activité récente
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted shrink-0 mt-0.5">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {activity.action}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {activity.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.utilisateur}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════ Daily History Table ═══════ */}
      {da && da.dailyHistory.length > 0 && (
        <Card className="premium-card">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base">Détail journalier</CardTitle>
            <CardDescription>Données consolidées des 7 derniers jours</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-right p-3 font-medium">Revenus</th>
                    <th className="text-right p-3 font-medium">Messages</th>
                    <th className="text-right p-3 font-medium">Conversations</th>
                    <th className="text-right p-3 font-medium">Réservations</th>
                    <th className="text-right p-3 font-medium">Payées</th>
                  </tr>
                </thead>
                <tbody>
                  {da.dailyHistory.map((day) => (
                    <tr key={day.date} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{day.label}</td>
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(day.revenue)}
                      </td>
                      <td className="p-3 text-right font-mono">{day.messages}</td>
                      <td className="p-3 text-right font-mono">{day.conversations}</td>
                      <td className="p-3 text-right font-mono">{day.reservations}</td>
                      <td className="p-3 text-right font-mono">{day.paidReservations}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50 font-semibold">
                    <td className="p-3">Total</td>
                    <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(da.dailyHistory.reduce((s, d) => s + d.revenue, 0))}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {da.dailyHistory.reduce((s, d) => s + d.messages, 0)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {da.dailyHistory.reduce((s, d) => s + d.conversations, 0)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {da.dailyHistory.reduce((s, d) => s + d.reservations, 0)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {da.dailyHistory.reduce((s, d) => s + d.paidReservations, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
