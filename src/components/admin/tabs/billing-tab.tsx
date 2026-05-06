"use client";

import React from "react";
import {
  Euro,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  formatCurrency,
  formatDate,
  getTransactionStatusBadge,
  getTransactionTypeBadge,
  revenueChartConfig,
  LoadingSpinner,
} from "../helpers";
import type { ApiReservation, PaginationInfo } from "../types";

interface BillingTabProps {
  reservations: ApiReservation[];
  loading: boolean;
  pagination: PaginationInfo;
  billingStats: { total: number; paid: number; pending: number; refunded: number };
  realBillingStats: { total: number; paid: number; pending: number; refunded: number } | null;
  monthlyRevenue: Array<{ mois: string; revenus: number }>;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
}

export default function BillingTab({
  reservations,
  loading,
  pagination,
  billingStats,
  realBillingStats,
  monthlyRevenue,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  page,
  setPage,
}: BillingTabProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Filters */}
        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="Statut paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="paid">Payé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="refunded">Remboursé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="vip_lounge">VIP</SelectItem>
                  <SelectItem value="hotel">Hôtel</SelectItem>
                  <SelectItem value="car_rental">Voiture</SelectItem>
                  <SelectItem value="duty_free">Duty-Free</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="premium-card border-0 overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-teal-600" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total
                  </p>
                  <p className="text-2xl font-bold mt-1 bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                    {formatCurrency(realBillingStats?.total ?? billingStats.total)}
                  </p>
                </div>
                <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/20">
                  <Euro className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card border-0 overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-yellow-400 to-amber-600" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    En attente
                  </p>
                  <p className="text-2xl font-bold mt-1 bg-gradient-to-r from-yellow-600 to-amber-500 dark:from-yellow-400 dark:to-amber-300 bg-clip-text text-transparent">
                    {formatCurrency(realBillingStats?.pending ?? billingStats.pending)}
                  </p>
                </div>
                <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-amber-500/20">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card border-0 overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-green-400 to-emerald-600" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payé</p>
                  <p className="text-2xl font-bold mt-1 bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-300 bg-clip-text text-transparent">
                    {formatCurrency(realBillingStats?.paid ?? billingStats.paid)}
                  </p>
                </div>
                <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/20">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card border-0 overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-400 to-red-600" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Remboursé
                  </p>
                  <p className="text-2xl font-bold mt-1 bg-gradient-to-r from-rose-600 to-red-500 dark:from-rose-400 dark:to-red-300 bg-clip-text text-transparent">
                    {formatCurrency(realBillingStats?.refunded ?? billingStats.refunded)}
                  </p>
                </div>
                <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-rose-400 to-red-600 shadow-lg shadow-rose-500/20">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card className="premium-card">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base">
              Revenus mensuels
            </CardTitle>
            <CardDescription>Basé sur les réservations payées</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyRevenue.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée de revenus disponible
              </div>
            ) : (
              <ChartContainer
                config={revenueChartConfig}
                className="h-[300px] w-full"
              >
                <BarChart
                  data={monthlyRevenue}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mois" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => [
                      `€${Number(value).toLocaleString("fr-FR")}`,
                      "Revenus",
                    ]}
                  />
                  <Bar
                    dataKey="revenus"
                    fill="var(--chart-3)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Reservations Table */}
        <Card className="premium-card">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base">
              Transactions récentes
            </CardTitle>
            <CardDescription>
              Dernières opérations de facturation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <LoadingSpinner text="Chargement des transactions..." />
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Description
                      </TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="font-mono text-xs">
                          {txn.reference}
                        </TableCell>
                        <TableCell>
                          {getTransactionTypeBadge(txn.type)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {txn.details || (txn.user ? `${txn.user.name}` : "—")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(txn.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {getTransactionStatusBadge(txn.paymentStatus)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {formatDate(txn.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {reservations.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Aucune transaction trouvée
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {pagination.total} transaction(s) &middot; Page{" "}
              {page} sur {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from(
                { length: Math.min(pagination.totalPages, 5) },
                (_, i) => {
                  const pageNum = Math.max(
                    1,
                    Math.min(page - 2, pagination.totalPages - 4)
                  ) + i;
                  if (pageNum > pagination.totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                }
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
