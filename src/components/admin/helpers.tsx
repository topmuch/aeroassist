"use client";

import React from "react";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ─── Chart Configs ─────────────────────────────────────────────────────────

export const messagesChartConfig = {
  messages: {
    label: "Messages",
    color: "var(--chart-1)",
  },
};

export const intentChartConfig = {
  count: {
    label: "Requêtes",
    color: "var(--chart-2)",
  },
};

export const revenueChartConfig = {
  revenus: {
    label: "Revenus (€)",
    color: "var(--chart-3)",
  },
};

// ─── Constants ─────────────────────────────────────────────────────────────

export const intentLabelMap: Record<string, string> = {
  flight_status: "Vols",
  flight_info: "Vols",
  restaurant_recommendation: "Restaurants",
  restaurants: "Restaurants",
  general_service: "Services",
  services: "Services",
  reservation: "Réservations",
  reservations: "Réservations",
  help: "Aide",
  assistance: "Aide",
  transport: "Transport",
  shops: "Boutiques",
  lost_baggage: "Bagages",
  parking: "Parking",
  shopping: "Shopping",
};

export const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const monthLabels = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

// ─── Formatters ────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHour < 24) return `Il y a ${diffHour}h`;
  if (diffDay < 7) return `Il y a ${diffDay}j`;
  return formatDate(dateStr);
}

// ─── Badge Helpers ─────────────────────────────────────────────────────────

export function getRoleBadge(role: string) {
  const map: Record<string, { label: string; className: string }> = {
    superadmin: {
      label: "Super Admin",
      className:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    },
    admin: {
      label: "Admin",
      className:
        "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    },
    partner: {
      label: "Partenaire",
      className:
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    },
    traveler: {
      label: "Voyageur",
      className:
        "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800",
    },
  };
  const info = map[role] || {
    label: role,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return (
    <Badge variant="outline" className={info.className}>
      {info.label}
    </Badge>
  );
}

export function getCategoryBadge(categorie: string) {
  const map: Record<string, { label: string; className: string }> = {
    flights: {
      label: "Vols",
      className:
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    },
    restaurants: {
      label: "Restaurants",
      className:
        "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    },
    services: {
      label: "Services",
      className:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    },
    shops: {
      label: "Boutiques",
      className:
        "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    },
    transport: {
      label: "Transport",
      className:
        "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800",
    },
    general: {
      label: "Général",
      className:
        "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800",
    },
  };
  const info = map[categorie] || {
    label: categorie,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return (
    <Badge variant="outline" className={info.className}>
      {info.label}
    </Badge>
  );
}

export function getKnowledgeStatusBadge(statut: string) {
  const map: Record<string, { label: string; className: string }> = {
    draft: {
      label: "Brouillon",
      className:
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    },
    validated: {
      label: "Validé",
      className:
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    },
    published: {
      label: "Publié",
      className:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    },
    archived: {
      label: "Archivé",
      className:
        "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-500 dark:border-gray-800",
    },
  };
  const info = map[statut] || {
    label: statut,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return (
    <Badge variant="outline" className={info.className}>
      {info.label}
    </Badge>
  );
}

export function getTransactionStatusBadge(statut: string) {
  const map: Record<string, { label: string; className: string }> = {
    paid: {
      label: "Payé",
      className:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    },
    pending: {
      label: "En attente",
      className:
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    },
    refunded: {
      label: "Remboursé",
      className:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    },
    cancelled: {
      label: "Annulé",
      className:
        "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-500 dark:border-gray-800",
    },
  };
  const info = map[statut] || {
    label: statut,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return (
    <Badge variant="outline" className={info.className}>
      {info.label}
    </Badge>
  );
}

export function getTransactionTypeBadge(type: string) {
  const map: Record<string, { label: string; className: string }> = {
    vip_lounge: {
      label: "VIP",
      className:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    },
    hotel: {
      label: "Hôtel",
      className:
        "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
    },
    car_rental: {
      label: "Voiture",
      className:
        "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800",
    },
    duty_free: {
      label: "Duty-Free",
      className:
        "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
    },
    VIP: {
      label: "VIP",
      className:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    },
    "Hôtel": {
      label: "Hôtel",
      className:
        "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
    },
    Voiture: {
      label: "Voiture",
      className:
        "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800",
    },
    "Duty-Free": {
      label: "Duty-Free",
      className:
        "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
    },
  };
  const info = map[type] || {
    label: type.replace(/_/g, " "),
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return (
    <Badge variant="outline" className={info.className}>
      {info.label}
    </Badge>
  );
}

export function getFlightStatusBadge(statut: string) {
  const map: Record<string, { label: string; className: string }> = {
    scheduled: {
      label: "Programmé",
      className:
        "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700",
    },
    boarding: {
      label: "Embarquement",
      className:
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    },
    delayed: {
      label: "Retardé",
      className:
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    },
    cancelled: {
      label: "Annulé",
      className:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    },
    departed: {
      label: "Décollé",
      className:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    },
    arrived: {
      label: "Arrivé",
      className:
        "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-500 dark:border-green-800",
    },
  };
  const info = map[statut] || {
    label: statut,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return (
    <Badge variant="outline" className={info.className}>
      {info.label}
    </Badge>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────

export function LoadingSpinner({ text = "Chargement..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

export function StatusBadge({ status, labelConnected = "Opérationnel", labelOffline = "Hors ligne" }: {
  status?: string;
  labelConnected?: string;
  labelOffline?: string;
}) {
  const statusClasses = status === "up"
    ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
    : status === "degraded"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
      : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";

  const StatusIcon = status === "up" ? CheckCircle : status === "degraded" ? AlertTriangle : AlertCircle;
  const label = status === "up" ? labelConnected : status === "degraded" ? "Dégradé" : labelOffline;

  return (
    <Badge className={statusClasses}>
      <StatusIcon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
