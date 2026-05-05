"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  MessageCircle,
  Users,
  CheckCircle,
  Euro,
  Plus,
  Search,
  Edit,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Settings,
  Save,
  Plane,
  Clock,
  AlertTriangle,
  Archive,
  Eye,
  Check,
  X,
  Crown,
  ShoppingBag,
  Building2,
  Car,
  Utensils,
  Loader2,
  TrendingUp,
  TrendingDown,
  Zap,
  Globe,
  Shield,
  BarChart3,
  Activity,
  CreditCard,
  FileText,
  Bell,
  ToggleLeft,
  Info,
  Upload,
  Link,
  FileUp,
  AlertCircle,
  Lock,
  Scissors,
  Sun,
  Moon,
} from "lucide-react";

import { useTheme } from "next-themes";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── API Types ─────────────────────────────────────────────────────────────

interface ApiAnalyticsOverview {
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  resolutionRate: number;
  avgResponseTimeSeconds: number;
}

interface ApiAnalytics {
  overview: ApiAnalyticsOverview;
  intentDistribution: Array<{ intent: string; count: number }>;
  messagesPerDay: Array<{ date: string; count: number }>;
}

interface ApiUser {
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

interface ApiKnowledge {
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

interface ApiReservation {
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

interface ApiFlight {
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

interface Module {
  id: string;
  nom: string;
  description: string;
  icon: React.ReactNode;
  statut: boolean;
  utilisateurs: number;
  config?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Chart Configs ─────────────────────────────────────────────────────────

const messagesChartConfig = {
  messages: {
    label: "Messages",
    color: "var(--chart-1)",
  },
};

const intentChartConfig = {
  count: {
    label: "Requêtes",
    color: "var(--chart-2)",
  },
};

const revenueChartConfig = {
  revenus: {
    label: "Revenus (€)",
    color: "var(--chart-3)",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const intentLabelMap: Record<string, string> = {
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

const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const monthLabels = ["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateStr: string): string {
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

function getRoleBadge(role: string) {
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

function getCategoryBadge(categorie: string) {
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

function getKnowledgeStatusBadge(statut: string) {
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

function getTransactionStatusBadge(statut: string) {
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

function getTransactionTypeBadge(type: string) {
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

function getFlightStatusBadge(statut: string) {
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

function LoadingSpinner({ text = "Chargement..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // ─── Analytics state (Overview tab) ─────────────────────────────────────
  const [analytics, setAnalytics] = useState<ApiAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // ─── Users state ────────────────────────────────────────────────────────
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userPagination, setUserPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 0,
  });
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const usersPerPage = 8;

  // ─── Knowledge state ────────────────────────────────────────────────────
  const [knowledge, setKnowledge] = useState<ApiKnowledge[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [knowledgePagination, setKnowledgePagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [kbSearch, setKbSearch] = useState("");
  const [kbCategoryFilter, setKbCategoryFilter] = useState("all");
  const [kbStatusFilter, setKbStatusFilter] = useState("all");
  const [kbPage, setKbPage] = useState(1);
  const [kbDialogOpen, setKbDialogOpen] = useState(false);
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbCategory, setNewKbCategory] = useState("general");
  const [newKbStatus, setNewKbStatus] = useState("draft");
  const [newKbContent, setNewKbContent] = useState("");
  const [kbCreating, setKbCreating] = useState(false);
  const kbPerPage = 10;

  // ─── AI Config state (local only) ───────────────────────────────────────
  const [systemPrompt, setSystemPrompt] = useState(
    "Tu es AeroAssist, un assistant virtuel intelligent pour les aéroports de Paris (CDG et ORY). Tu aides les voyageurs en français, anglais, espagnol et allemand. Tu fournis des informations sur les vols, les services aéroportuaires, les restaurants, les boutiques, le transport et les réservations. Sois toujours poli, concis et précis. Si tu n'es pas sûr, oriente le voyageur vers le comptoir d'information le plus proche."
  );
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.75);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([
    "français",
    "anglais",
  ]);
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");
  const [aiConfigSaved, setAiConfigSaved] = useState(false);

  // AI Logs state
  const [aiLogs, setAiLogs] = useState<Array<{
    id: string;
    sessionId: string;
    userMessage: string;
    aiResponse: string;
    intent: string;
    confidence: number;
    timestamp: string;
  }>>([]);
  const [aiLogsLoading, setAiLogsLoading] = useState(false);
  const [aiLogsTotal, setAiLogsTotal] = useState(0);
  const [aiLogsPage, setAiLogsPage] = useState(1);
  const aiLogsPerPage = 10;

  // ─── Modules state ──────────────────────────────────────────────────────
  const [modules, setModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [moduleConfigOpen, setModuleConfigOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [moduleConfig, setModuleConfig] = useState({
    pricing: "",
    partnerName: "",
    maxCapacity: "",
    description: "",
    contactEmail: "",
  });
  const [moduleConfigSaved, setModuleConfigSaved] = useState(false);

  // ─── Flights state ──────────────────────────────────────────────────────
  const [flights, setFlights] = useState<ApiFlight[]>([]);
  const [flightsLoading, setFlightsLoading] = useState(true);
  const [flightFilter, setFlightFilter] = useState("all");
  const [flightSearch, setFlightSearch] = useState("");

  // ─── Billing / Reservations state ───────────────────────────────────────
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [reservationsPagination, setReservationsPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [billingStatusFilter, setBillingStatusFilter] = useState("all");
  const [billingTypeFilter, setBillingTypeFilter] = useState("all");
  const [billingPage, setBillingPage] = useState(1);
  const billingPerPage = 10;

  // ─── KB Import state ────────────────────────────────────────────────────
  const [kbImportUrlOpen, setKbImportUrlOpen] = useState(false);
  const [kbImportPdfOpen, setKbImportPdfOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importUrlCategory, setImportUrlCategory] = useState("general");
  const [importUrlStatus, setImportUrlStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [importPdfStatus, setImportPdfStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [importPdfName, setImportPdfName] = useState("");
  const [importResultInfo, setImportResultInfo] = useState("");

  // ─── WhatsApp Console state ─────────────────────────────────────────────
  const [healthData, setHealthData] = useState<{
    status: string;
    services: {
      database: { status: string; latencyMs: number; details: string; error: string };
      ai: { status: string; latencyMs: number; details: string; error: string };
      whatsapp: { status: string; latencyMs: number; details: string; error: string };
    };
    system: {
      nodeVersion: string;
      platform: string;
      memoryUsage: { rss: number; heapUsed: number; heapTotal: number };
    };
  } | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // ─── Fetch: Analytics ───────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch {
      // Analytics fetch failed
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // ─── Fetch: Users ───────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(userPage),
        limit: String(usersPerPage),
      });
      if (userSearch) params.set("search", userSearch);
      if (userRoleFilter !== "all") params.set("role", userRoleFilter);
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setUserPagination(data.pagination);
      }
    } catch {
      // Users fetch failed
    } finally {
      setUsersLoading(false);
    }
  }, [userPage, userSearch, userRoleFilter, usersPerPage]);

  // ─── Fetch: Knowledge ───────────────────────────────────────────────────
  const fetchKnowledge = useCallback(async () => {
    setKnowledgeLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(kbPage),
        limit: String(kbPerPage),
      });
      if (kbSearch) params.set("search", kbSearch);
      if (kbCategoryFilter !== "all")
        params.set("category", kbCategoryFilter);
      if (kbStatusFilter !== "all") params.set("status", kbStatusFilter);
      const res = await fetch(`/api/knowledge?${params}`);
      const data = await res.json();
      if (data.success) {
        setKnowledge(data.data);
        setKnowledgePagination(data.pagination);
      }
    } catch {
      // Knowledge fetch failed
    } finally {
      setKnowledgeLoading(false);
    }
  }, [kbPage, kbSearch, kbCategoryFilter, kbStatusFilter, kbPerPage]);

  // ─── Fetch: Modules ─────────────────────────────────────────────────────
  const fetchModules = useCallback(async () => {
    setModulesLoading(true);
    try {
      const res = await fetch("/api/modules");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const iconMap: Record<string, React.ReactNode> = {
          "Salon VIP": <Crown className="h-8 w-8" />,
          Marketplace: <ShoppingBag className="h-8 w-8" />,
          "Duty Free Shopping": <CreditCard className="h-8 w-8" />,
          "Duty-Free": <CreditCard className="h-8 w-8" />,
          "Hôtels & Transferts": <Building2 className="h-8 w-8" />,
          "Location Voitures": <Car className="h-8 w-8" />,
          Restaurants: <Utensils className="h-8 w-8" />,
        };
        const mapped: Module[] = data.data.map(
          (m: {
            id: string;
            name: string;
            description: string;
            isActive: boolean;
            config: string;
          }) => {
            let cfg: Record<string, unknown> = {};
            try {
              cfg = m.config ? JSON.parse(m.config) : {};
            } catch {
              cfg = {};
            }
            return {
              id: m.id,
              nom: m.name,
              description: m.description || "",
              icon: iconMap[m.name] || <Activity className="h-8 w-8" />,
              statut: m.isActive,
              utilisateurs: (cfg.maxCapacity as number) || 0,
              config: m.config || "{}",
            };
          }
        );
        setModules(mapped);
      }
    } catch {
      // Modules fetch failed
    } finally {
      setModulesLoading(false);
    }
  }, []);

  // ─── Fetch: Flights ─────────────────────────────────────────────────────
  const fetchFlights = useCallback(async () => {
    setFlightsLoading(true);
    try {
      const params = new URLSearchParams();
      if (flightFilter === "depart") params.set("type", "departures");
      else if (flightFilter === "arrivee") params.set("type", "arrivals");
      if (flightSearch) params.set("search", flightSearch);
      const res = await fetch(`/api/flights?${params}`);
      const data = await res.json();
      if (data.success) {
        setFlights(data.data);
      }
    } catch {
      // Flights fetch failed
    } finally {
      setFlightsLoading(false);
    }
  }, [flightFilter, flightSearch]);

  // ─── Fetch: Reservations ────────────────────────────────────────────────
  const fetchReservations = useCallback(async () => {
    setReservationsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(billingPage),
        limit: String(billingPerPage),
      });
      if (billingStatusFilter !== "all") params.set("status", billingStatusFilter);
      if (billingTypeFilter !== "all") params.set("type", billingTypeFilter);
      const res = await fetch(`/api/reservations?${params}`);
      const data = await res.json();
      if (data.success) {
        setReservations(data.data);
        setReservationsPagination(data.pagination);
      }
    } catch {
      // Reservations fetch failed
    } finally {
      setReservationsLoading(false);
    }
  }, [billingPage, billingStatusFilter, billingTypeFilter, billingPerPage]);

  // ─── Effects: Fetch all data on mount ───────────────────────────────────
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  // Auto-refresh flights every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFlights();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchFlights]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // ─── AI Config state from API ────────────────────────────────────────────
  const [aiConfigLoading, setAiConfigLoading] = useState(false);

  const fetchAiConfig = useCallback(async () => {
    setAiConfigLoading(true);
    try {
      const res = await fetch("/api/ai/config");
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.model_name) setSelectedModel(data.data.model_name);
        if (data.data.system_prompt) setSystemPrompt(data.data.system_prompt);
        if (data.data.confidence_threshold != null)
          setConfidenceThreshold(data.data.confidence_threshold);
        if (data.data.supported_languages)
          setSelectedLanguages(data.data.supported_languages);
        if (data.data.human_fallback_enabled !== undefined)
          setFallbackEnabled(data.data.human_fallback_enabled);
      }
    } catch {
      // Fallback: try localStorage
      try {
        const saved = localStorage.getItem("aeroassist-ai-config");
        if (saved) {
          const config = JSON.parse(saved);
          if (config.model) setSelectedModel(config.model);
          if (config.systemPrompt) setSystemPrompt(config.systemPrompt);
          if (config.confidenceThreshold) setConfidenceThreshold(config.confidenceThreshold);
          if (config.languages) setSelectedLanguages(config.languages);
          if (config.fallbackEnabled !== undefined) setFallbackEnabled(config.fallbackEnabled);
        }
      } catch { /* silent */ }
    } finally {
      setAiConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAiConfig();
  }, [fetchAiConfig]);

  // ─── Fetch: AI Logs ─────────────────────────────────────────────────────────
  const fetchAiLogs = useCallback(async (page?: number) => {
    setAiLogsLoading(true);
    try {
      const p = page || aiLogsPage;
      const res = await fetch(`/api/ai/logs?page=${p}&limit=${aiLogsPerPage}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAiLogs(data.data.logs);
        setAiLogsTotal(data.data.pagination.total);
      }
    } catch {
      // AI logs fetch failed
    } finally {
      setAiLogsLoading(false);
    }
  }, [aiLogsPage, aiLogsPerPage]);

  useEffect(() => {
    fetchAiLogs();
  }, [fetchAiLogs]);

  // ─── Fetch: Health (WhatsApp Console) ───────────────────────────────────
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (data) {
        setHealthData(data);
      }
    } catch {
      // Health fetch failed
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Auto-refresh health every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // ─── Derived Data ───────────────────────────────────────────────────────

  // Chart data: messages per day (from analytics)
  const chartMessagesData = useMemo(() => {
    if (!analytics?.messagesPerDay) return [];
    return analytics.messagesPerDay.map((item) => ({
      jour: dayNames[new Date(item.date).getDay()] || item.date.slice(5),
      messages: item.count,
    }));
  }, [analytics]);

  // Chart data: intent distribution with French labels
  const chartIntentData = useMemo(() => {
    if (!analytics?.intentDistribution) return [];
    return analytics.intentDistribution.map((item) => ({
      intent: intentLabelMap[item.intent] || item.intent,
      count: item.count,
    }));
  }, [analytics]);

  // Recent activity derived from reservations + users
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      action: string;
      utilisateur: string;
      detail: string;
      timestamp: string;
    }> = [];
    reservations.slice(0, 3).forEach((r) => {
      const action =
        r.paymentStatus === "paid"
          ? "Réservation confirmée"
          : r.paymentStatus === "pending"
            ? "Nouvelle réservation"
            : r.paymentStatus === "refunded"
              ? "Réservation remboursée"
              : "Réservation mise à jour";
      activities.push({
        id: `res-${r.id}`,
        action,
        utilisateur: r.user?.name || "Utilisateur supprimé",
        detail: `${r.type} — ${r.reference}`,
        timestamp: formatRelativeTime(r.createdAt),
      });
    });
    users.slice(0, 2).forEach((u) => {
      activities.push({
        id: `usr-${u.id}`,
        action: "Utilisateur inscrit",
        utilisateur: u.name,
        detail: `Compte ${u.role} créé`,
        timestamp: formatRelativeTime(u.createdAt),
      });
    });
    return activities.slice(0, 5);
  }, [reservations, users]);

  // Billing summary stats derived from reservations
  const billingStats = useMemo(() => {
    const total = reservations.reduce((sum, r) => sum + r.totalAmount, 0);
    const pending = reservations
      .filter((r) => r.paymentStatus === "pending")
      .reduce((sum, r) => sum + r.totalAmount, 0);
    const paid = reservations
      .filter((r) => r.paymentStatus === "paid")
      .reduce((sum, r) => sum + r.totalAmount, 0);
    const refunded = reservations
      .filter(
        (r) => r.paymentStatus === "refunded" || r.paymentStatus === "cancelled"
      )
      .reduce((sum, r) => sum + r.totalAmount, 0);
    return { total, pending, paid, refunded };
  }, [reservations]);

  // Monthly revenue derived from paid reservations
  const monthlyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    reservations.forEach((r) => {
      if (r.paymentStatus === "paid") {
        const date = new Date(r.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        map.set(key, (map.get(key) || 0) + r.totalAmount);
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, amount]) => {
        const month = parseInt(key.split("-")[1], 10);
        return { mois: monthLabels[month - 1] || key, revenus: amount };
      });
  }, [reservations]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const toggleModuleStatus = useCallback(
    async (moduleId: string) => {
      const mod = modules.find((m) => m.id === moduleId);
      if (!mod) return;
      const newStatus = !mod.statut;
      // Optimistic update
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, statut: newStatus } : m
        )
      );
      try {
        const res = await fetch("/api/modules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: moduleId, isActive: newStatus }),
        });
        if (!res.ok) {
          setModules((prev) =>
            prev.map((m) =>
              m.id === moduleId ? { ...m, statut: !newStatus } : m
            )
          );
        }
      } catch {
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId ? { ...m, statut: !newStatus } : m
          )
        );
      }
    },
    [modules]
  );

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const openModuleConfig = (mod: Module) => {
    setSelectedModule(mod);
    try {
      const cfg = mod.config ? JSON.parse(mod.config) : {};
      setModuleConfig({
        pricing: String(
          (cfg.pricing as { single?: number })?.single ||
            (cfg.pricing as number) ||
            45
        ),
        partnerName: (cfg.partnerName as string) || mod.nom,
        maxCapacity: String((cfg.maxCapacity as number) || 100),
        description: (cfg.description as string) || mod.description,
        contactEmail: (cfg.contactEmail as string) || "",
      });
    } catch {
      setModuleConfig({
        pricing: "45",
        partnerName: mod.nom,
        maxCapacity: String(mod.utilisateurs || 100),
        description: mod.description,
        contactEmail: "",
      });
    }
    setModuleConfigOpen(true);
    setModuleConfigSaved(false);
  };

  const saveModuleConfig = async () => {
    if (!selectedModule) return;
    setModulesLoading(true);
    try {
      const configData = JSON.stringify({
        pricing: { single: Number(moduleConfig.pricing) || 0 },
        partnerName: moduleConfig.partnerName,
        maxCapacity: Number(moduleConfig.maxCapacity) || 100,
        description: moduleConfig.description,
        contactEmail: moduleConfig.contactEmail,
      });
      const res = await fetch("/api/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedModule.id,
          config: configData,
          isActive: selectedModule.statut,
        }),
      });
      if (res.ok) {
        setModuleConfigSaved(true);
        // Update local module config
        setModules((prev) =>
          prev.map((m) =>
            m.id === selectedModule.id ? { ...m, config: configData } : m
          )
        );
        setTimeout(() => setModuleConfigOpen(false), 1200);
      }
    } catch {
      // Error handling silent - dialog stays open
    } finally {
      setModulesLoading(false);
    }
  };

  const handleCreateKbArticle = async () => {
    if (!newKbTitle.trim() || !newKbContent.trim()) return;
    setKbCreating(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newKbTitle.trim(),
          content: newKbContent.trim(),
          category: newKbCategory,
          status: newKbStatus,
        }),
      });
      if (res.ok) {
        setKbDialogOpen(false);
        setNewKbTitle("");
        setNewKbCategory("general");
        setNewKbStatus("draft");
        setNewKbContent("");
        fetchKnowledge();
      }
    } catch {
      // Error creating KB article
    } finally {
      setKbCreating(false);
    }
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImportUrlStatus("loading");
    setImportResultInfo("");
    try {
      const res = await fetch("/api/knowledge/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: importUrl,
          category: importUrlCategory,
          status: "draft",
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        const d = result.data;
        setImportResultInfo(
          `${d.chunkCount || 0} chunks extraits (${((d.contentLength || 0) / 1024).toFixed(1)} Ko)`
        );
        setImportUrlStatus("success");
        fetchKnowledge();
        setTimeout(() => {
          setKbImportUrlOpen(false);
          setImportUrl("");
          setImportUrlStatus("idle");
          setImportResultInfo("");
        }, 2000);
      } else {
        setImportResultInfo(
          result.error || "Erreur lors de l'import"
        );
        setImportUrlStatus("error");
        setTimeout(() => {
          setImportUrlStatus("idle");
          setImportResultInfo("");
        }, 3000);
      }
    } catch {
      setImportUrlStatus("error");
      setImportResultInfo("Erreur réseau");
      setTimeout(() => {
        setImportUrlStatus("idle");
        setImportResultInfo("");
      }, 3000);
    }
  };

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportPdfName(file.name);
    setImportPdfStatus("loading");
    setImportResultInfo("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "general");
      formData.append("status", "draft");

      const res = await fetch("/api/knowledge/import-pdf", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (res.ok && result.success) {
        const d = result.data;
        setImportResultInfo(
          `${d.pages || 0} pages, ${d.chunkCount || 0} chunks créés`
        );
        setImportPdfStatus("success");
        fetchKnowledge();
        setTimeout(() => {
          setKbImportPdfOpen(false);
          setImportPdfName("");
          setImportPdfStatus("idle");
          setImportResultInfo("");
        }, 2000);
      } else {
        setImportResultInfo(
          result.error || "Erreur lors de l'import du PDF"
        );
        setImportPdfStatus("error");
        setTimeout(() => {
          setImportPdfStatus("idle");
          setImportResultInfo("");
        }, 3000);
      }
    } catch {
      setImportPdfStatus("error");
      setImportResultInfo("Erreur réseau");
      setTimeout(() => {
        setImportPdfStatus("idle");
        setImportResultInfo("");
      }, 3000);
    }
  };

  const saveAiConfig = async () => {
    setAiConfigLoading(true);
    const config = {
      model_name: selectedModel,
      system_prompt: systemPrompt,
      confidence_threshold: confidenceThreshold,
      supported_languages: selectedLanguages,
      human_fallback_enabled: fallbackEnabled,
    };
    try {
      // Save to API (real DB persistence)
      const res = await fetch("/api/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setAiConfigSaved(true);
        setTimeout(() => setAiConfigSaved(false), 3000);
      }
    } catch {
      // Fallback: save to localStorage
      try {
        localStorage.setItem("aeroassist-ai-config", JSON.stringify(config));
        setAiConfigSaved(true);
        setTimeout(() => setAiConfigSaved(false), 3000);
      } catch { /* silent */ }
    } finally {
      setAiConfigLoading(false);
    }
  };

  // ─── Theme Hook ──────────────────────────────────────────────────────────
  const { theme, setTheme } = useTheme();

  // ─── Navigation Items ────────────────────────────────────────────────────
  const navItems = [
    { value: "overview", label: "Vue d'ensemble", icon: BarChart3 },
    { value: "users", label: "Utilisateurs", icon: Users },
    { value: "knowledge", label: "Base de Connaissance", icon: FileText },
    { value: "ai", label: "Configuration IA", icon: Zap },
    { value: "billing", label: "Facturation", icon: CreditCard },
    { value: "modules", label: "Modules", icon: Activity },
    { value: "flights", label: "Vols", icon: Plane },
    { value: "whatsapp", label: "WhatsApp Console", icon: MessageCircle },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-[calc(100vh-4rem)] -m-4 md:-m-6 lg:-m-8">
      {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
      <aside className="admin-sidebar w-64 shrink-0 hidden md:flex flex-col p-4">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#1e40af] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Plane className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm tracking-wider">AEROASSIST</h2>
            <p className="text-xs text-slate-400">Administration</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              className={`sidebar-nav-item w-full ${activeTab === item.value ? "active" : ""}`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Theme Toggle */}
        <div className="border-t border-white/10 pt-3 mt-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="sidebar-nav-item w-full"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span>{theme === "dark" ? "Mode clair" : "Mode sombre"}</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════════════ MOBILE TAB BAR ═══════════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 admin-header border-t border-white/10">
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                activeTab === item.value
                  ? "bg-white/15 text-white font-medium"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════ MAIN CONTENT ═══════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="admin-header px-6 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-white font-bold text-sm md:text-base uppercase tracking-wider">
            AeroAssist | Tableau de Bord
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-white/70 text-xs hidden sm:block">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4a853] to-[#c9a84c] flex items-center justify-center text-xs font-bold text-[#080d18]">
              AA
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <LoadingSpinner text="Chargement des statistiques..." />
              ) : (
                <>
                  {/* Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="kpi-card-blue premium-card border-l-4 border-l-blue-500">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Conversations
                            </p>
                            <p className="text-3xl font-bold mt-1">
                              {analytics?.overview.totalConversations.toLocaleString("fr-FR") || "0"}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                Données en direct
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                            <MessageCircle className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="kpi-card-emerald premium-card border-l-4 border-l-emerald-500">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Messages totaux
                            </p>
                            <p className="text-3xl font-bold mt-1">
                              {analytics?.overview.totalMessages.toLocaleString("fr-FR") || "0"}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                Toutes conversations
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <Users className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="kpi-card-amber premium-card border-l-4 border-l-amber-500">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Utilisateurs actifs
                            </p>
                            <p className="text-3xl font-bold mt-1">
                              {analytics?.overview.activeUsers.toLocaleString("fr-FR") || "0"}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                Utilisateurs inscrits
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                            <CheckCircle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="kpi-card-purple premium-card border-l-4 border-l-purple-500">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Taux de Résolution
                            </p>
                            <p className="text-3xl font-bold mt-1">
                              {analytics?.overview.resolutionRate != null
                                ? `${(analytics.overview.resolutionRate * 100).toFixed(1)}%`
                                : "—"}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                              {analytics?.overview.resolutionRate != null &&
                              analytics.overview.resolutionRate >= 0.9 ? (
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5 text-yellow-500" />
                              )}
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                Temps moyen :{" "}
                                {analytics?.overview.avgResponseTimeSeconds || 0}s
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                            <Euro className="h-7 w-7 text-purple-600 dark:text-purple-400" />
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
                </>
              )}
            </div>
          )}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Search & Filters */}
                <Card className="premium-card">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher par nom ou email..."
                          value={userSearch}
                          onChange={(e) => {
                            setUserSearch(e.target.value);
                            setUserPage(1);
                          }}
                          className="pl-9"
                        />
                      </div>
                      <Select
                        value={userRoleFilter}
                        onValueChange={(v) => {
                          setUserRoleFilter(v);
                          setUserPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <Filter className="h-4 w-4 mr-1" />
                          <SelectValue placeholder="Filtrer par rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les rôles</SelectItem>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="partner">Partenaire</SelectItem>
                          <SelectItem value="traveler">Voyageur</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Ajouter un utilisateur
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Ajouter un utilisateur</DialogTitle>
                            <DialogDescription>
                              Remplissez les informations du nouvel utilisateur.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="user-name">Nom complet</Label>
                              <Input
                                id="user-name"
                                placeholder="Ex: Jean Dupont"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="user-email">Email</Label>
                              <Input
                                id="user-email"
                                type="email"
                                placeholder="Ex: jean.dupont@email.fr"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="user-phone">Téléphone</Label>
                              <Input
                                id="user-phone"
                                placeholder="Ex: +33 6 12 34 56 78"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="grid gap-2">
                                <Label>Rôle</Label>
                                <Select defaultValue="traveler">
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="superadmin">
                                      Super Admin
                                    </SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="partner">
                                      Partenaire
                                    </SelectItem>
                                    <SelectItem value="traveler">
                                      Voyageur
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Langue</Label>
                                <Select defaultValue="français">
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="français">
                                      Français
                                    </SelectItem>
                                    <SelectItem value="anglais">
                                      Anglais
                                    </SelectItem>
                                    <SelectItem value="espagnol">
                                      Espagnol
                                    </SelectItem>
                                    <SelectItem value="allemand">
                                      Allemand
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setUserDialogOpen(false)}
                            >
                              Annuler
                            </Button>
                            <Button onClick={() => setUserDialogOpen(false)}>
                              Créer l&apos;utilisateur
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>

                {/* Users Table */}
                <Card className="premium-card">
                  <CardContent className="p-0">
                    {usersLoading ? (
                      <LoadingSpinner text="Chargement des utilisateurs..." />
                    ) : (
                      <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nom</TableHead>
                              <TableHead className="hidden md:table-cell">
                                Email
                              </TableHead>
                              <TableHead className="hidden lg:table-cell">
                                Téléphone
                              </TableHead>
                              <TableHead>Rôle</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                  {user.name}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-muted-foreground">
                                  {user.email}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-muted-foreground">
                                  {user.phone || "—"}
                                </TableCell>
                                <TableCell>{getRoleBadge(user.role)}</TableCell>
                                <TableCell>
                                  <Switch
                                    checked={user.isActive}
                                    aria-label={`Statut de ${user.name}`}
                                    onCheckedChange={async (checked) => {
                                      // Optimistic update
                                      setUsers((prev) =>
                                        prev.map((u) =>
                                          u.id === user.id
                                            ? { ...u, isActive: checked }
                                            : u
                                        )
                                      );
                                      try {
                                        await fetch("/api/users", {
                                          method: "PATCH",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ id: user.id, isActive: checked }),
                                        });
                                      } catch {
                                        // Revert on failure
                                        setUsers((prev) =>
                                          prev.map((u) =>
                                            u.id === user.id
                                              ? { ...u, isActive: !checked }
                                              : u
                                          )
                                        );
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Edit className="h-3.5 w-3.5" />
                                      <span className="sr-only">Modifier</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span className="sr-only">Supprimer</span>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {users.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="text-center py-8 text-muted-foreground"
                                >
                                  Aucun utilisateur trouvé
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pagination */}
                {userPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {userPagination.total} utilisateur(s) &middot; Page{" "}
                      {userPage} sur {userPagination.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={userPage <= 1}
                        onClick={() => setUserPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from(
                        { length: Math.min(userPagination.totalPages, 5) },
                        (_, i) => {
                          const pageNum = Math.max(
                            1,
                            Math.min(
                              userPage - 2,
                              userPagination.totalPages - 4
                            )
                          ) + i;
                          if (pageNum > userPagination.totalPages) return null;
                          return (
                            <Button
                              key={pageNum}
                              variant={userPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setUserPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={userPage >= userPagination.totalPages}
                        onClick={() => setUserPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
          {activeTab === "knowledge" && (
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Search & Filters */}
                <Card className="premium-card">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher un article..."
                          value={kbSearch}
                          onChange={(e) => {
                            setKbSearch(e.target.value);
                            setKbPage(1);
                          }}
                          className="pl-9"
                        />
                      </div>
                      <Select
                        value={kbCategoryFilter}
                        onValueChange={(v) => {
                          setKbCategoryFilter(v);
                          setKbPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[170px]">
                          <Filter className="h-4 w-4 mr-1" />
                          <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Toutes les catégories
                          </SelectItem>
                          <SelectItem value="flights">Vols</SelectItem>
                          <SelectItem value="restaurants">Restaurants</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="shops">Boutiques</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="general">Général</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={kbStatusFilter}
                        onValueChange={(v) => {
                          setKbStatusFilter(v);
                          setKbPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[150px]">
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="draft">Brouillon</SelectItem>
                          <SelectItem value="validated">Validé</SelectItem>
                          <SelectItem value="published">Publié</SelectItem>
                          <SelectItem value="archived">Archivé</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={kbImportUrlOpen} onOpenChange={setKbImportUrlOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <Link className="h-4 w-4 mr-1.5" />
                            Importer par URL
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Link className="h-5 w-5 text-emerald-600" />
                              Importer depuis une URL
                            </DialogTitle>
                            <DialogDescription>
                              Collez l&apos;URL d&apos;une page web (site officiel, partenaire, etc.). Le contenu sera automatiquement parsé et chunké par le pipeline RAG.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="import-url">URL source</Label>
                              <Input
                                id="import-url"
                                placeholder="https://www.aeroportsdeparis.fr/..."
                                value={importUrl}
                                onChange={(e) => setImportUrl(e.target.value)}
                                disabled={importUrlStatus === "loading"}
                              />
                              <p className="text-xs text-muted-foreground">
                                Supports : pages HTML, articles, API REST. Le scraping respecte robots.txt.
                              </p>
                            </div>
                            <div className="grid gap-2">
                              <Label>Catégorie</Label>
                              <Select value={importUrlCategory} onValueChange={setImportUrlCategory}>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="flights">Vols</SelectItem>
                                  <SelectItem value="restaurants">Restaurants</SelectItem>
                                  <SelectItem value="services">Services</SelectItem>
                                  <SelectItem value="shops">Boutiques</SelectItem>
                                  <SelectItem value="transport">Transport</SelectItem>
                                  <SelectItem value="general">Général</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {importUrlStatus === "loading" && (
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Extraction et traitement en cours...</span>
                              </div>
                            )}
                            {importUrlStatus === "success" && (
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle className="h-4 w-4" />
                                <div className="text-sm">
                                  <p>Contenu importé avec succès !</p>
                                  {importResultInfo && (
                                    <p className="text-xs mt-0.5 opacity-80">{importResultInfo}</p>
                                  )}
                                </div>
                              </div>
                            )}
                            {importUrlStatus === "error" && (
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                                <AlertCircle className="h-4 w-4" />
                                <div className="text-sm">
                                  <p>Erreur lors de l&apos;import.</p>
                                  {importResultInfo && (
                                    <p className="text-xs mt-0.5 opacity-80">{importResultInfo}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setKbImportUrlOpen(false)}>
                              Annuler
                            </Button>
                            <Button
                              onClick={handleImportUrl}
                              disabled={!importUrl.trim() || importUrlStatus === "loading" || importUrlStatus === "success"}
                            >
                              {importUrlStatus === "loading" ? (
                                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Importation...</>
                              ) : (
                                <><Link className="h-4 w-4 mr-1.5" /> Importer</>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={kbImportPdfOpen} onOpenChange={setKbImportPdfOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <FileUp className="h-4 w-4 mr-1.5" />
                            Importer PDF
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Upload className="h-5 w-5 text-emerald-600" />
                              Importer un document PDF
                            </DialogTitle>
                            <DialogDescription>
                              Uploadez un fichier PDF (guide, brochure, réglementation). Le texte sera extrait et vectorisé.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label>Fichier PDF</Label>
                              <label
                                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
                                  importPdfStatus === "loading"
                                    ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700"
                                    : "border-muted hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/10"
                                }`}
                              >
                                {importPdfStatus === "idle" && !importPdfName && (
                                  <>
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <div className="text-center">
                                      <p className="text-sm font-medium">Cliquez ou glissez votre PDF</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        PDF jusqu&apos;à 10 Mo
                                      </p>
                                    </div>
                                  </>
                                )}
                                {importPdfName && importPdfStatus !== "loading" && (
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-red-500" />
                                    <span className="text-sm font-medium truncate max-w-[200px]">
                                      {importPdfName}
                                    </span>
                                  </div>
                                )}
                                {importPdfStatus === "loading" && (
                                  <div className="flex items-center gap-3">
                                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                    <span className="text-sm text-blue-600 dark:text-blue-400">
                                      Extraction en cours...
                                    </span>
                                  </div>
                                )}
                                {importPdfStatus === "success" && (
                                  <div className="flex flex-col items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle className="h-6 w-6" />
                                    <span className="text-sm font-medium">Importé avec succès !</span>
                                    {importResultInfo && (
                                      <span className="text-xs opacity-80">{importResultInfo}</span>
                                    )}
                                  </div>
                                )}
                                {importPdfStatus === "error" && (
                                  <div className="flex flex-col items-center gap-1 text-red-600 dark:text-red-400">
                                    <AlertCircle className="h-6 w-6" />
                                    <span className="text-sm font-medium">Erreur d&apos;import</span>
                                    {importResultInfo && (
                                      <span className="text-xs opacity-80">{importResultInfo}</span>
                                    )}
                                  </div>
                                )}
                                <input
                                  type="file"
                                  accept=".pdf"
                                  className="hidden"
                                  onChange={handleImportPdf}
                                  disabled={importPdfStatus === "loading"}
                                />
                              </label>
                            </div>
                            <div className="grid gap-2">
                              <Label>Pipeline de traitement</Label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { step: "Extraction", icon: FileText },
                                  { step: "Nettoyage", icon: Settings },
                                  { step: "Chunking", icon: Scissors },
                                  { step: "Vectorisation", icon: Zap },
                                ].map(({ step, icon: Ic }, i) => {
                                  const IconComp = Ic;
                                  const isDone = importPdfStatus === "success" || (importPdfStatus === "loading" && i < 1);
                                  const isRunning = importPdfStatus === "loading" && i === 0;
                                  return (
                                    <div
                                      key={step}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${
                                        isDone
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"
                                          : isRunning
                                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700"
                                            : "bg-muted text-muted-foreground border-border"
                                      }`}
                                    >
                                      <IconComp className="h-3 w-3" />
                                      {step}
                                      {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setKbImportPdfOpen(false)}>
                              Fermer
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={kbDialogOpen} onOpenChange={setKbDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Ajouter un article
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Nouvel article</DialogTitle>
                            <DialogDescription>
                              Créer un nouvel article pour la base de connaissances.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="kb-title">Titre</Label>
                              <Input
                                id="kb-title"
                                placeholder="Titre de l'article"
                                value={newKbTitle}
                                onChange={(e) => setNewKbTitle(e.target.value)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="grid gap-2">
                                <Label>Catégorie</Label>
                                <Select value={newKbCategory} onValueChange={setNewKbCategory}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="flights">Vols</SelectItem>
                                    <SelectItem value="restaurants">
                                      Restaurants
                                    </SelectItem>
                                    <SelectItem value="services">Services</SelectItem>
                                    <SelectItem value="shops">Boutiques</SelectItem>
                                    <SelectItem value="transport">
                                      Transport
                                    </SelectItem>
                                    <SelectItem value="general">Général</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Statut</Label>
                                <Select value={newKbStatus} onValueChange={setNewKbStatus}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">Brouillon</SelectItem>
                                    <SelectItem value="validated">Validé</SelectItem>
                                    <SelectItem value="published">Publié</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="kb-content">Contenu</Label>
                              <Textarea
                                id="kb-content"
                                placeholder="Contenu de l'article..."
                                rows={5}
                                value={newKbContent}
                                onChange={(e) => setNewKbContent(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setKbDialogOpen(false)}
                            >
                              Annuler
                            </Button>
                            <Button
                              disabled={kbCreating || !newKbTitle.trim() || !newKbContent.trim()}
                              onClick={handleCreateKbArticle}
                            >
                              {kbCreating ? (
                                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Création...</>
                              ) : (
                                "Créer l'article"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>

                {/* Knowledge Table */}
                <Card className="premium-card">
                  <CardContent className="p-0">
                    {knowledgeLoading ? (
                      <LoadingSpinner text="Chargement des articles..." />
                    ) : (
                      <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Titre</TableHead>
                              <TableHead>Catégorie</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead className="hidden md:table-cell">
                                Version
                              </TableHead>
                              <TableHead className="hidden lg:table-cell">
                                Auteur
                              </TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {knowledge.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{entry.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(entry.updatedAt)}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>{getCategoryBadge(entry.category)}</TableCell>
                                <TableCell>
                                  {getKnowledgeStatusBadge(entry.status)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-muted-foreground">
                                  v{entry.version}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-muted-foreground">
                                  {entry.owner?.name || "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                      <span className="sr-only">Modifier</span>
                                    </Button>
                                    {entry.status === "draft" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-blue-500"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        <span className="sr-only">Valider</span>
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-muted-foreground"
                                    >
                                      <Archive className="h-3.5 w-3.5" />
                                      <span className="sr-only">Archiver</span>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {knowledge.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="text-center py-8 text-muted-foreground"
                                >
                                  Aucun article trouvé
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Knowledge Pagination */}
                {knowledgePagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {knowledgePagination.total} article(s) &middot; Page{" "}
                      {kbPage} sur {knowledgePagination.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={kbPage <= 1}
                        onClick={() => setKbPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from(
                        { length: Math.min(knowledgePagination.totalPages, 5) },
                        (_, i) => {
                          const pageNum = Math.max(
                            1,
                            Math.min(kbPage - 2, knowledgePagination.totalPages - 4)
                          ) + i;
                          if (pageNum > knowledgePagination.totalPages) return null;
                          return (
                            <Button
                              key={pageNum}
                              variant={kbPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setKbPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={kbPage >= knowledgePagination.totalPages}
                        onClick={() => setKbPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
          {activeTab === "ai" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Settings */}
                <div className="space-y-4">
                  <Card className="premium-card">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Configuration du modèle
                      </CardTitle>
                      <CardDescription>
                        Modèles Groq haute vitesse pour réponses instantanées
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Model Selection */}
                      <div className="grid gap-2">
                        <Label>Modèle IA</Label>
                        <Select
                          value={selectedModel}
                          onValueChange={setSelectedModel}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="llama-3.3-70b-versatile">
                              Llama 3.3 70B (Versatile)
                            </SelectItem>
                            <SelectItem value="llama-3.1-8b-instant">
                              Llama 3.1 8B (Instant)
                            </SelectItem>
                            <SelectItem value="mixtral-8x7b-32768">
                              Mixtral 8x7B (32K context)
                            </SelectItem>
                            <SelectItem value="gemma2-9b-it">
                              Gemma 2 9B (Instruct)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* System Prompt */}
                      <div className="grid gap-2">
                        <Label>Prompt système</Label>
                        <Textarea
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          rows={7}
                          className="text-sm"
                        />
                      </div>

                      {/* Confidence Threshold */}
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between">
                          <Label>Seuil de confiance</Label>
                          <span className="text-sm font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            {(confidenceThreshold * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Slider
                          value={[confidenceThreshold * 100]}
                          onValueChange={([v]) => setConfidenceThreshold(v / 100)}
                          min={0}
                          max={100}
                          step={5}
                        />
                        <p className="text-xs text-muted-foreground">
                          En dessous de ce seuil, la réponse sera marquée comme
                          incertaine et un humain pourra intervenir.
                        </p>
                      </div>

                      {/* Language Selector */}
                      <div className="grid gap-2">
                        <Label>Langues supportées</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { code: "français", flag: "🇫🇷" },
                            { code: "anglais", flag: "🇬🇧" },
                            { code: "espagnol", flag: "🇪🇸" },
                            { code: "allemand", flag: "🇩🇪" },
                            { code: "arabe", flag: "🇸🇦" },
                            { code: "chinois", flag: "🇨🇳" },
                          ].map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => toggleLanguage(lang.code)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                selectedLanguages.includes(lang.code)
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                                  : "bg-muted text-muted-foreground border-border hover:bg-accent"
                              }`}
                            >
                              <span>{lang.flag}</span>
                              {lang.code.charAt(0).toUpperCase() +
                                lang.code.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Fallback Toggle */}
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label>Mode fallback humain</Label>
                          <p className="text-xs text-muted-foreground">
                            Transférer à un agent humain en cas de faible confiance
                          </p>
                        </div>
                        <Switch
                          checked={fallbackEnabled}
                          onCheckedChange={setFallbackEnabled}
                        />
                      </div>

                      <Button className="w-full" onClick={saveAiConfig}>
                        <Save className="h-4 w-4 mr-2" />
                        {aiConfigSaved ? (
                          <span className="flex items-center gap-1.5">
                            <Check className="h-4 w-4" />
                            Configuration sauvegardée !
                          </span>
                        ) : (
                          "Sauvegarder la configuration"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Logs (no dedicated API — placeholder) */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      Journaux IA récents
                    </CardTitle>
                    <CardDescription>
                      Historique des échanges avec l&apos;IA
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {aiLogsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : aiLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                        <MessageCircle className="h-10 w-10 opacity-30" />
                        <p className="text-sm text-center">
                          Les journaux IA seront disponibles une fois les conversations
                          enregistrées via l&apos;assistant.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <ScrollArea className="max-h-[420px]">
                          {aiLogs.map((log) => (
                            <div
                              key={log.id}
                              className="border rounded-lg p-3 mb-3 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={
                                    (log.confidence || 0) >= 0.9
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : (log.confidence || 0) >= 0.7
                                        ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
                                  }>
                                    {(log.confidence || 0) * 100 >= 90 ? "Excellent" : (log.confidence || 0) * 100 >= 70 ? "Bon" : "Faible"} ({((log.confidence || 0) * 100).toFixed(0)}%)
                                  </Badge>
                                  <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                                    {intentLabelMap[log.intent] || log.intent}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(log.timestamp).toLocaleString("fr-FR")}
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">User:</span>
                                  <p className="text-sm text-muted-foreground line-clamp-2">{log.userMessage}</p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">IA:</span>
                                  <p className="text-sm line-clamp-3">{log.aiResponse}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                        {/* Pagination */}
                        {aiLogsTotal > aiLogsPerPage && (
                          <div className="flex items-center justify-between pt-3 border-t">
                            <p className="text-sm text-muted-foreground">
                              {aiLogsTotal} échange{aiLogsTotal > 1 ? "s" : ""} au total
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={aiLogsPage <= 1}
                                onClick={() => { setAiLogsPage((p) => p - 1); fetchAiLogs(aiLogsPage - 1); }}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-sm">{aiLogsPage} / {Math.ceil(aiLogsTotal / aiLogsPerPage)}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={aiLogsPage >= Math.ceil(aiLogsTotal / aiLogsPerPage)}
                                onClick={() => { setAiLogsPage((p) => p + 1); fetchAiLogs(aiLogsPage + 1); }}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          )}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div className="space-y-6">
                {/* Filters */}
                <Card className="kpi-card-emerald premium-card border-l-4 border-l-emerald-500">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Select
                        value={billingStatusFilter}
                        onValueChange={(v) => {
                          setBillingStatusFilter(v);
                          setBillingPage(1);
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
                        value={billingTypeFilter}
                        onValueChange={(v) => {
                          setBillingTypeFilter(v);
                          setBillingPage(1);
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
                  <Card className="kpi-card-amber premium-card border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Total
                          </p>
                          <p className="text-2xl font-bold mt-1">
                            {formatCurrency(billingStats.total)}
                          </p>
                        </div>
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                          <Euro className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card-blue premium-card border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            En attente
                          </p>
                          <p className="text-2xl font-bold mt-1">
                            {formatCurrency(billingStats.pending)}
                          </p>
                        </div>
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                          <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="kpi-card-rose premium-card border-l-4 border-l-rose-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Payé</p>
                          <p className="text-2xl font-bold mt-1">
                            {formatCurrency(billingStats.paid)}
                          </p>
                        </div>
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="premium-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Remboursé
                          </p>
                          <p className="text-2xl font-bold mt-1">
                            {formatCurrency(billingStats.refunded)}
                          </p>
                        </div>
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30">
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
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
                    {reservationsLoading ? (
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
                {reservationsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {reservationsPagination.total} transaction(s) &middot; Page{" "}
                      {billingPage} sur {reservationsPagination.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={billingPage <= 1}
                        onClick={() => setBillingPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from(
                        { length: Math.min(reservationsPagination.totalPages, 5) },
                        (_, i) => {
                          const pageNum = Math.max(
                            1,
                            Math.min(billingPage - 2, reservationsPagination.totalPages - 4)
                          ) + i;
                          if (pageNum > reservationsPagination.totalPages) return null;
                          return (
                            <Button
                              key={pageNum}
                              variant={billingPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setBillingPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={billingPage >= reservationsPagination.totalPages}
                        onClick={() => setBillingPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
          {activeTab === "modules" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Modules disponibles</h2>
                  <p className="text-sm text-muted-foreground">
                    Gérez les fonctionnalités actives de la plateforme AeroAssist.
                  </p>
                </div>
                {modulesLoading ? (
                  <LoadingSpinner text="Chargement des modules..." />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {modules.map((mod) => (
                      <Card
                        key={mod.id}
                        className={`transition-all ${
                          mod.statut
                            ? "border-emerald-200 dark:border-emerald-800"
                            : "opacity-70"
                        }`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div
                              className={`flex items-center justify-center h-12 w-12 rounded-lg ${
                                mod.statut
                                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {mod.icon}
                            </div>
                            <Switch
                              checked={mod.statut}
                              onCheckedChange={() => toggleModuleStatus(mod.id)}
                              aria-label={`Activer ${mod.nom}`}
                            />
                          </div>
                          <h3 className="font-semibold text-base mb-1">{mod.nom}</h3>
                          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                            {mod.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span>{mod.utilisateurs} utilisateurs</span>
                            </div>
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => openModuleConfig(mod)}>
                              <Settings className="h-3.5 w-3.5 mr-1" />
                              Configurer
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {modules.length === 0 && (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        Aucun module disponible
                      </div>
                    )}
                  </div>
                )}

                {/* Module Config Dialog */}
                <Dialog open={moduleConfigOpen} onOpenChange={setModuleConfigOpen}>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-emerald-600" />
                        Configurer : {selectedModule?.nom}
                      </DialogTitle>
                      <DialogDescription>
                        Ajustez les paramètres du module {selectedModule?.nom}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <Label className="text-base font-medium">Statut du module</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedModule?.statut ? "Module actif et accessible aux voyageurs" : "Module désactivé"}
                          </p>
                        </div>
                        <Switch
                          checked={selectedModule?.statut ?? false}
                          onCheckedChange={() => {
                            if (selectedModule) {
                              toggleModuleStatus(selectedModule.id);
                              setSelectedModule({ ...selectedModule, statut: !selectedModule.statut });
                            }
                          }}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="mod-partner">Nom du partenaire</Label>
                        <Input
                          id="mod-partner"
                          value={moduleConfig.partnerName}
                          onChange={(e) => setModuleConfig(prev => ({ ...prev, partnerName: e.target.value }))}
                          placeholder="Nom du partenaire principal"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="mod-pricing">Tarif (€)</Label>
                          <Input
                            id="mod-pricing"
                            type="number"
                            value={moduleConfig.pricing}
                            onChange={(e) => setModuleConfig(prev => ({ ...prev, pricing: e.target.value }))}
                            placeholder="45"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="mod-capacity">Capacité max</Label>
                          <Input
                            id="mod-capacity"
                            type="number"
                            value={moduleConfig.maxCapacity}
                            onChange={(e) => setModuleConfig(prev => ({ ...prev, maxCapacity: e.target.value }))}
                            placeholder="100"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="mod-email">Email de contact</Label>
                        <Input
                          id="mod-email"
                          type="email"
                          value={moduleConfig.contactEmail}
                          onChange={(e) => setModuleConfig(prev => ({ ...prev, contactEmail: e.target.value }))}
                          placeholder="contact@partenaire.fr"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="mod-desc">Description</Label>
                        <Textarea
                          id="mod-desc"
                          value={moduleConfig.description}
                          onChange={(e) => setModuleConfig(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>

                      {moduleConfigSaved && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Configuration sauvegardée avec succès !</span>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setModuleConfigOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={saveModuleConfig} disabled={modulesLoading}>
                        {modulesLoading ? (
                          <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sauvegarde...</>
                        ) : (
                          <><Save className="h-4 w-4 mr-1.5" /> {moduleConfigSaved ? "Sauvegardé !" : "Sauvegarder"}</>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

            </div>
          )}
          {activeTab === "flights" && (
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Flight Filters */}
                <Card className="premium-card">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher par numéro de vol ou compagnie..."
                          value={flightSearch}
                          onChange={(e) => setFlightSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                        <Button
                          variant={flightFilter === "all" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setFlightFilter("all")}
                        >
                          Tous
                        </Button>
                        <Button
                          variant={flightFilter === "depart" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setFlightFilter("depart")}
                        >
                          <Plane className="h-3.5 w-3.5 mr-1 rotate-[25deg]" />
                          Départs
                        </Button>
                        <Button
                          variant={flightFilter === "arrivee" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setFlightFilter("arrivee")}
                        >
                          <Plane className="h-3.5 w-3.5 mr-1 -rotate-[25deg]" />
                          Arrivées
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Flights Table */}
                <Card className="premium-card">
                  <CardContent className="p-0">
                    {flightsLoading ? (
                      <LoadingSpinner text="Chargement des vols..." />
                    ) : (
                      <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Vol</TableHead>
                              <TableHead>Compagnie</TableHead>
                              <TableHead className="hidden lg:table-cell">
                                Départ
                              </TableHead>
                              <TableHead className="hidden lg:table-cell">
                                Arrivée
                              </TableHead>
                              <TableHead>Heure</TableHead>
                              <TableHead className="hidden sm:table-cell">
                                Porte
                              </TableHead>
                              <TableHead className="hidden md:table-cell">
                                Terminal
                              </TableHead>
                              <TableHead>Statut</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {flights.map((flight) => (
                              <TableRow key={flight.id}>
                                <TableCell className="font-mono font-semibold">
                                  {flight.flightNumber}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {flight.airline}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-muted-foreground">
                                  {flight.departure}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-muted-foreground">
                                  {flight.arrival}
                                </TableCell>
                                <TableCell className="font-mono">
                                  {formatTime(flight.scheduledDep)}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-muted-foreground">
                                  {flight.gate || "—"}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Badge variant="secondary">
                                    {flight.terminal || "—"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {getFlightStatusBadge(flight.status)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {flights.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={8}
                                  className="text-center py-8 text-muted-foreground"
                                >
                                  Aucun vol trouvé
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          )}
          {activeTab === "whatsapp" && (
            <div className="space-y-6">
              <div className="space-y-6">
                {/* ─── A) WhatsApp Connection Status Panel ──────────────────────── */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    État des connexions
                  </h3>
                  {healthLoading ? (
                    <LoadingSpinner text="Chargement de l'état de santé…" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Database Card */}
                      <Card className="border-l-4 border-l-emerald-500 premium-card">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Globe className="h-4 w-4 text-emerald-500" />
                            Base de données
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2">
                            {healthData?.services.database.status === "up" ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Opérationnel
                              </Badge>
                            ) : healthData?.services.database.status === "degraded" ? (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Dégradé
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Hors ligne
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Latence : {healthData?.services.database.latencyMs ?? "—"} ms</span>
                          </div>
                          {healthData?.services.database.details && (
                            <p className="text-xs text-muted-foreground">{healthData.services.database.details}</p>
                          )}
                          {healthData?.services.database.error && (
                            <p className="text-xs text-red-500">{healthData.services.database.error}</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* AI Service Card */}
                      <Card className="border-l-4 border-l-teal-500 premium-card">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Zap className="h-4 w-4 text-teal-500" />
                            Service IA
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2">
                            {healthData?.services.ai.status === "up" ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Opérationnel
                              </Badge>
                            ) : healthData?.services.ai.status === "degraded" ? (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Dégradé
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Hors ligne
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Latence : {healthData?.services.ai.latencyMs ?? "—"} ms</span>
                          </div>
                          {healthData?.services.ai.details && (
                            <p className="text-xs text-muted-foreground">{healthData.services.ai.details}</p>
                          )}
                          {healthData?.services.ai.error && (
                            <p className="text-xs text-red-500">{healthData.services.ai.error}</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* WhatsApp API Card */}
                      <Card className="border-l-4 border-l-green-500 premium-card">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-green-500" />
                            API WhatsApp
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2">
                            {healthData?.services.whatsapp.status === "up" ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Connecté
                              </Badge>
                            ) : healthData?.services.whatsapp.status === "degraded" ? (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Dégradé
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Déconnecté
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Latence : {healthData?.services.whatsapp.latencyMs ?? "—"} ms</span>
                          </div>
                          {healthData?.services.whatsapp.details && (
                            <p className="text-xs text-muted-foreground">{healthData.services.whatsapp.details}</p>
                          )}
                          {healthData?.services.whatsapp.error && (
                            <p className="text-xs text-red-500">{healthData.services.whatsapp.error}</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>

                {/* ─── B) Webhook Configuration Panel ───────────────────────────── */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Link className="h-5 w-5 text-emerald-500" />
                      Configuration du Webhook
                    </CardTitle>
                    <CardDescription>
                      Configuration du webhook Meta pour la réception des messages WhatsApp
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">URL du Webhook</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value="/api/webhook/whatsapp"
                          className="bg-muted font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigator.clipboard.writeText("/api/webhook/whatsapp")}
                          title="Copier l'URL"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">WHATSAPP_ACCESS_TOKEN :</span>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                          <Check className="h-3 w-3 mr-1" />
                          Configuré
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">WHATSAPP_VERIFY_TOKEN :</span>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                          <Check className="h-3 w-3 mr-1" />
                          Configuré
                        </Badge>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium">Statut de vérification</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Meta vérifie le webhook en envoyant une requête <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">GET</code> avec un{" "}
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">hub.mode=subscribe</code>,{" "}
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">hub.verify_token</code> et{" "}
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">hub.challenge</code>.
                        Le serveur valide le token et renvoie la valeur <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">hub.challenge</code> pour confirmer la propriété.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* ─── C) Edge Case Handling Panel ──────────────────────────────── */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Gestion des cas limites
                    </CardTitle>
                    <CardDescription>
                      Comportement du système face aux messages inhabituels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[220px]">Cas</TableHead>
                          <TableHead>Réponse du système</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Message vide</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800 mr-2">
                              Redirection
                            </Badge>
                            <span className="text-sm text-muted-foreground">Redirection avec exemples</span>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Images / Vidéos / Audio</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 mr-2">
                              Non supporté
                            </Badge>
                            <span className="text-sm text-muted-foreground">Message type non supporté</span>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Timeout Groq</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 mr-2">
                              Fallback
                            </Badge>
                            <span className="text-sm text-muted-foreground">Fallback FAQ statique</span>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Base de connaissances vide</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 mr-2">
                              Avertissement
                            </Badge>
                            <span className="text-sm text-muted-foreground">Réponse sans hallucination + avertissement</span>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Messages très longs (&gt;4000 car.)</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 mr-2">
                              Limitation
                            </Badge>
                            <span className="text-sm text-muted-foreground">Demande de raccourcir</span>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Messages de localisation</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800 mr-2">
                              Info
                            </Badge>
                            <span className="text-sm text-muted-foreground">Demande de précision</span>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* ─── D) Security Panel ────────────────────────────────────────── */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-500" />
                      Mesures de sécurité
                    </CardTitle>
                    <CardDescription>
                      Protection implémentée pour les endpoints WhatsApp
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 rounded-lg border p-4">
                        <Shield className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Vérification HMAC-SHA256</p>
                          <p className="text-xs text-muted-foreground">
                            Signature des webhooks Meta vérifiée via HMAC-SHA256 pour garantir l&apos;authenticité de chaque requête entrante.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border p-4">
                        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Limitation de débit (Rate Limiting)</p>
                          <p className="text-xs text-muted-foreground">
                            200 requêtes/minute maximum pour le webhook afin de prévenir les abus et les attaques DDoS.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border p-4">
                        <Eye className="h-5 w-5 text-teal-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Filtrage des PII dans les logs</p>
                          <p className="text-xs text-muted-foreground">
                            Les données personnelles identifiables (numéros de téléphone, adresses) sont masquées automatiquement dans les journaux.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border p-4">
                        <Globe className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">En-têtes de sécurité</p>
                          <p className="text-xs text-muted-foreground">
                            CSP, HSTS, X-Frame-Options, X-Content-Type-Options configurés sur tous les endpoints API.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border p-4">
                        <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Validation des entrées (Zod)</p>
                          <p className="text-xs text-muted-foreground">
                            Tous les payloads entrants sont validés avec des schémas Zod pour prévenir les injections et données malformées.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border p-4">
                        <Lock className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">CORS strict</p>
                          <p className="text-xs text-muted-foreground">
                            Politique CORS restrictive limitant l&apos;accès aux origines autorisées uniquement.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ─── E) Rate Limiting Monitor ──────────────────────────────────── */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-emerald-500" />
                      Moniteur de limitation de débit
                    </CardTitle>
                    <CardDescription>
                      Configuration actuelle des limites de requêtes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-lg border p-4 text-center space-y-1">
                          <p className="text-2xl font-bold text-emerald-600">200</p>
                          <p className="text-xs text-muted-foreground">req/min</p>
                          <p className="text-sm font-medium">Webhook WhatsApp</p>
                        </div>
                        <div className="rounded-lg border p-4 text-center space-y-1">
                          <p className="text-2xl font-bold text-teal-600">100</p>
                          <p className="text-xs text-muted-foreground">req/15 min</p>
                          <p className="text-sm font-medium">API par défaut</p>
                        </div>
                        <div className="rounded-lg border p-4 text-center space-y-1">
                          <p className="text-2xl font-bold text-red-600">20</p>
                          <p className="text-xs text-muted-foreground">req/min</p>
                          <p className="text-sm font-medium">Mode strict</p>
                        </div>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Info className="h-4 w-4 text-emerald-600" />
                          Les limites sont appliquées par adresse IP. En cas de dépassement, un code HTTP 429 est renvoyé avec un en-tête <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Retry-After</code>.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
