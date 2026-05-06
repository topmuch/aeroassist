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
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { messagesChartConfig, intentChartConfig, LoadingSpinner } from "../helpers";
import type { ApiAnalytics } from "../types";

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
}

export default function OverviewTab({
  analytics,
  loading,
  chartMessagesData,
  chartIntentData,
  recentActivity,
}: OverviewTabProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSpinner text="Chargement des statistiques..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 overflow-hidden bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-500/25">
          <CardContent className="p-5 relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-white/30" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">
                  Conversations
                </p>
                <p className="text-3xl font-bold mt-1 text-white">
                  {analytics?.overview.totalConversations.toLocaleString("fr-FR") || "0"}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3.5 w-3.5 text-white/70" />
                  <span className="text-xs text-white/70 font-medium">
                    Données en direct
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 overflow-hidden bg-gradient-to-br from-violet-400 to-violet-600 shadow-lg shadow-violet-500/25">
          <CardContent className="p-5 relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-white/30" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">
                  Messages totaux
                </p>
                <p className="text-3xl font-bold mt-1 text-white">
                  {analytics?.overview.totalMessages.toLocaleString("fr-FR") || "0"}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3.5 w-3.5 text-white/70" />
                  <span className="text-xs text-white/70 font-medium">
                    Toutes conversations
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm">
                <Users className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/25">
          <CardContent className="p-5 relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-white/30" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">
                  Utilisateurs actifs
                </p>
                <p className="text-3xl font-bold mt-1 text-white">
                  {analytics?.overview.activeUsers.toLocaleString("fr-FR") || "0"}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3.5 w-3.5 text-white/70" />
                  <span className="text-xs text-white/70 font-medium">
                    Utilisateurs inscrits
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 overflow-hidden bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/25">
          <CardContent className="p-5 relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-white/30" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">
                  Taux de Résolution
                </p>
                <p className="text-3xl font-bold mt-1 text-white">
                  {analytics?.overview.resolutionRate != null
                    ? `${(analytics.overview.resolutionRate * 100).toFixed(1)}%`
                    : "—"}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {analytics?.overview.resolutionRate != null &&
                  analytics.overview.resolutionRate >= 0.9 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-white/70" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-white/70" />
                  )}
                  <span className="text-xs text-white/70 font-medium">
                    Temps moyen :{" "}
                    {analytics?.overview.avgResponseTimeSeconds || 0}s
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm">
                <Euro className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages per day chart */}
        <Card className="premium-card">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-base">
              Messages par jour
            </CardTitle>
            <CardDescription>
              Derniers jours
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {chartMessagesData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            ) : (
              <ChartContainer
                config={messagesChartConfig}
                className="h-[250px] w-full"
              >
                <AreaChart
                  data={chartMessagesData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="messagesGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="jour"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
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

        {/* Intent distribution chart */}
        <Card className="premium-card">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-base">
              Distribution des intentions
            </CardTitle>
            <CardDescription>
              Par catégorie de requête
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {chartIntentData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            ) : (
              <ChartContainer
                config={intentChartConfig}
                className="h-[250px] w-full"
              >
                <BarChart
                  data={chartIntentData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="intent"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--chart-2)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="premium-card">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-base">Activité récente</CardTitle>
          <CardDescription>
            Dernières actions sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
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
  );
}
