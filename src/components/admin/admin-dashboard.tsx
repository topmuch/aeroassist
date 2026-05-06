"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  MessageCircle,
  Users,
  Settings,
  Plane,
  BarChart3,
  Activity,
  CreditCard,
  FileText,
  Zap,
  Save,
  Loader2,
  CheckCircle,
  Crown,
  ShoppingBag,
  Building2,
  Car,
  Utensils,
  Sun,
  Moon,
  Home,
  LogOut,
} from "lucide-react";

import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ─── Shared Types ───────────────────────────────────────────────────────────
import type {
  ApiAnalytics,
  ApiUser,
  ApiReservation,
  Module,
  PaginationInfo,
  HealthData,
  AiLog,
} from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────
import {
  dayNames,
  monthLabels,
  formatRelativeTime,
  intentLabelMap,
} from "./helpers";

// ─── Tab Components ─────────────────────────────────────────────────────────
import OverviewTab from "./tabs/overview-tab";
import UsersTab from "./tabs/users-tab";
import KnowledgeTab from "./tabs/knowledge-tab";
import AiConfigTab from "./tabs/ai-config-tab";
import FlightsTab from "./tabs/flights-tab";
import BillingTab from "./tabs/billing-tab";
import WhatsAppConsoleTab from "./tabs/whatsapp-console-tab";
import { LoadingSpinner } from "./helpers";

// ─── Main Component ────────────────────────────────────────────────────────

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
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
  const usersPerPage = 8;

  // ─── Knowledge state ────────────────────────────────────────────────────
  const [knowledge, setKnowledge] = useState<import("./types").ApiKnowledge[]>([]);
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
  const kbPerPage = 10;

  // ─── AI Config state ─────────────────────────────────────────────────────
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
  const [aiConfigLoading, setAiConfigLoading] = useState(false);

  // AI Logs state
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
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
  const [flights, setFlights] = useState<import("./types").ApiFlight[]>([]);
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
  const [realBillingStats, setRealBillingStats] = useState<{ total: number; paid: number; pending: number; refunded: number } | null>(null);

  // ─── WhatsApp Console state ─────────────────────────────────────────────
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [whatsappTemplates, setWhatsappTemplates] = useState<import("./types").WhatsAppTemplate[]>([]);
  const [whatsappContacts, setWhatsappContacts] = useState<import("./types").WhatsAppContact[]>([]);

  // ─── Fetch functions ────────────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } catch { /* silent */ } finally {
      setAnalyticsLoading(false);
    }
  }, []);

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
    } catch { /* silent */ } finally {
      setUsersLoading(false);
    }
  }, [userPage, userSearch, userRoleFilter, usersPerPage]);

  const fetchBillingStats = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/stats");
      const data = await res.json();
      if (data.success) setRealBillingStats(data.data);
    } catch { /* silent */ }
  }, []);

  const fetchKnowledge = useCallback(async () => {
    setKnowledgeLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(kbPage),
        limit: String(kbPerPage),
      });
      if (kbSearch) params.set("search", kbSearch);
      if (kbCategoryFilter !== "all") params.set("category", kbCategoryFilter);
      if (kbStatusFilter !== "all") params.set("status", kbStatusFilter);
      const res = await fetch(`/api/knowledge?${params}`);
      const data = await res.json();
      if (data.success) {
        setKnowledge(data.data);
        setKnowledgePagination(data.pagination);
      }
    } catch { /* silent */ } finally {
      setKnowledgeLoading(false);
    }
  }, [kbPage, kbSearch, kbCategoryFilter, kbStatusFilter, kbPerPage]);

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
          (m: { id: string; name: string; description: string; isActive: boolean; config: string }) => {
            let cfg: Record<string, unknown> = {};
            try { cfg = m.config ? JSON.parse(m.config) : {}; } catch { cfg = {}; }
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
    } catch { /* silent */ } finally {
      setModulesLoading(false);
    }
  }, []);

  const fetchFlights = useCallback(async () => {
    setFlightsLoading(true);
    try {
      const params = new URLSearchParams();
      if (flightFilter === "depart") params.set("type", "departures");
      else if (flightFilter === "arrivee") params.set("type", "arrivals");
      if (flightSearch) params.set("search", flightSearch);
      const res = await fetch(`/api/flights?${params}`);
      const data = await res.json();
      if (data.success) setFlights(data.data);
    } catch { /* silent */ } finally {
      setFlightsLoading(false);
    }
  }, [flightFilter, flightSearch]);

  const fetchReservations = useCallback(async () => {
    setReservationsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(billingPage),
        limit: String(billingPerPage),
      });
      if (billingStatusFilter !== "all") params.set("paymentStatus", billingStatusFilter);
      if (billingTypeFilter !== "all") params.set("type", billingTypeFilter);
      const res = await fetch(`/api/reservations?${params}`);
      const data = await res.json();
      if (data.success) {
        setReservations(data.data);
        setReservationsPagination(data.pagination);
      }
    } catch { /* silent */ } finally {
      setReservationsLoading(false);
    }
  }, [billingPage, billingStatusFilter, billingTypeFilter, billingPerPage]);

  const fetchAiConfig = useCallback(async () => {
    setAiConfigLoading(true);
    try {
      const res = await fetch("/api/ai/config");
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.model_name) setSelectedModel(data.data.model_name);
        if (data.data.system_prompt) setSystemPrompt(data.data.system_prompt);
        if (data.data.confidence_threshold != null) setConfidenceThreshold(data.data.confidence_threshold);
        if (data.data.supported_languages) setSelectedLanguages(data.data.supported_languages);
        if (data.data.human_fallback_enabled !== undefined) setFallbackEnabled(data.data.human_fallback_enabled);
      }
    } catch {
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
    } catch { /* silent */ } finally {
      setAiLogsLoading(false);
    }
  }, [aiLogsPage, aiLogsPerPage]);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (data) setHealthData(data);
    } catch { /* silent */ } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchWhatsappData = useCallback(async () => {
    try {
      const [tplRes, cntRes] = await Promise.all([
        fetch('/api/whatsapp/templates'),
        fetch('/api/whatsapp/contacts'),
      ]);
      const tplData = await tplRes.json();
      const cntData = await cntRes.json();
      if (tplData.success) setWhatsappTemplates(tplData.data || []);
      if (cntData.success) setWhatsappContacts(cntData.data || []);
    } catch { /* silent */ }
  }, []);

  // ─── Effects ────────────────────────────────────────────────────────────

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchKnowledge(); }, [fetchKnowledge]);
  useEffect(() => { fetchModules(); }, [fetchModules]);
  useEffect(() => { fetchFlights(); }, [fetchFlights]);
  useEffect(() => {
    const interval = setInterval(() => { fetchFlights(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchFlights]);
  useEffect(() => { fetchReservations(); }, [fetchReservations]);
  useEffect(() => { fetchAiConfig(); }, [fetchAiConfig]);
  useEffect(() => { fetchAiLogs(); }, [fetchAiLogs]);
  useEffect(() => {
    fetchHealth();
    fetchWhatsappData();
    fetchBillingStats();
  }, [fetchHealth, fetchWhatsappData, fetchBillingStats]);
  useEffect(() => {
    const interval = setInterval(() => { fetchHealth(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // ─── Derived Data ───────────────────────────────────────────────────────

  const chartMessagesData = useMemo(() => {
    if (!analytics?.messagesPerDay) return [];
    return analytics.messagesPerDay.map((item) => ({
      jour: dayNames[new Date(item.date).getDay()] || item.date.slice(5),
      messages: item.count,
    }));
  }, [analytics]);

  const chartIntentData = useMemo(() => {
    if (!analytics?.intentDistribution) return [];
    return analytics.intentDistribution.map((item) => ({
      intent: intentLabelMap[item.intent] || item.intent,
      count: item.count,
    }));
  }, [analytics]);

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

  const billingStats = useMemo(() => {
    const total = reservations.reduce((sum, r) => sum + r.totalAmount, 0);
    const pending = reservations.filter((r) => r.paymentStatus === "pending").reduce((sum, r) => sum + r.totalAmount, 0);
    const paid = reservations.filter((r) => r.paymentStatus === "paid").reduce((sum, r) => sum + r.totalAmount, 0);
    const refunded = reservations.filter((r) => r.paymentStatus === "refunded" || r.paymentStatus === "cancelled").reduce((sum, r) => sum + r.totalAmount, 0);
    return { total, pending, paid, refunded };
  }, [reservations]);

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
      setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, statut: newStatus } : m));
      try {
        const res = await fetch("/api/modules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: moduleId, isActive: newStatus }),
        });
        if (!res.ok) {
          setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, statut: !newStatus } : m));
        }
      } catch {
        setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, statut: !newStatus } : m));
      }
    },
    [modules]
  );

  const openModuleConfig = (mod: Module) => {
    setSelectedModule(mod);
    try {
      const cfg = mod.config ? JSON.parse(mod.config) : {};
      setModuleConfig({
        pricing: String((cfg.pricing as { single?: number })?.single || (cfg.pricing as number) || 45),
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
        body: JSON.stringify({ id: selectedModule.id, config: configData, isActive: selectedModule.statut }),
      });
      if (res.ok) {
        setModuleConfigSaved(true);
        setModules((prev) => prev.map((m) => m.id === selectedModule.id ? { ...m, config: configData } : m));
        setTimeout(() => setModuleConfigOpen(false), 1200);
      }
    } catch { /* silent */ } finally {
      setModulesLoading(false);
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
    <div className="flex h-full">
      {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
      <aside className="admin-sidebar w-64 shrink-0 hidden md:flex flex-col p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Plane className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm tracking-wider">AEROASSIST</h2>
            <p className="text-xs text-white/60">Administration</p>
          </div>
        </div>
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
        <div className="border-t border-white/10 pt-3 mt-3 space-y-1">
          <a
            href="/"
            className="sidebar-nav-item w-full"
            onClick={(e) => {
              e.preventDefault();
              onLogout();
            }}
          >
            <Home className="h-4 w-4" />
            <span>Retour à l&apos;accueil</span>
          </a>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="sidebar-nav-item w-full"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === "dark" ? "Mode clair" : "Mode sombre"}</span>
          </button>
          <button
            onClick={onLogout}
            className="sidebar-nav-item w-full text-red-300 hover:text-red-200 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
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
            <OverviewTab
              analytics={analytics}
              loading={analyticsLoading}
              chartMessagesData={chartMessagesData}
              chartIntentData={chartIntentData}
              recentActivity={recentActivity}
            />
          )}
          {activeTab === "users" && (
            <UsersTab
              users={users}
              loading={usersLoading}
              pagination={userPagination}
              search={userSearch}
              setSearch={setUserSearch}
              roleFilter={userRoleFilter}
              setRoleFilter={setUserRoleFilter}
              page={userPage}
              setPage={setUserPage}
              onFetchUsers={fetchUsers}
              onSetUsers={setUsers}
            />
          )}
          {activeTab === "knowledge" && (
            <KnowledgeTab
              knowledge={knowledge}
              loading={knowledgeLoading}
              pagination={knowledgePagination}
              search={kbSearch}
              setSearch={setKbSearch}
              categoryFilter={kbCategoryFilter}
              setCategoryFilter={setKbCategoryFilter}
              statusFilter={kbStatusFilter}
              setStatusFilter={setKbStatusFilter}
              page={kbPage}
              setPage={setKbPage}
              onFetchKnowledge={fetchKnowledge}
            />
          )}
          {activeTab === "ai" && (
            <AiConfigTab
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
              confidenceThreshold={confidenceThreshold}
              setConfidenceThreshold={setConfidenceThreshold}
              selectedLanguages={selectedLanguages}
              setSelectedLanguages={setSelectedLanguages}
              fallbackEnabled={fallbackEnabled}
              setFallbackEnabled={setFallbackEnabled}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              aiConfigSaved={aiConfigSaved}
              onSaveAiConfig={saveAiConfig}
              aiConfigLoading={aiConfigLoading}
              aiLogs={aiLogs}
              aiLogsLoading={aiLogsLoading}
              aiLogsTotal={aiLogsTotal}
              aiLogsPage={aiLogsPage}
              aiLogsPerPage={aiLogsPerPage}
              setAiLogsPage={setAiLogsPage}
              fetchAiLogs={fetchAiLogs}
            />
          )}
          {activeTab === "billing" && (
            <BillingTab
              reservations={reservations}
              loading={reservationsLoading}
              pagination={reservationsPagination}
              billingStats={billingStats}
              realBillingStats={realBillingStats}
              monthlyRevenue={monthlyRevenue}
              statusFilter={billingStatusFilter}
              setStatusFilter={setBillingStatusFilter}
              typeFilter={billingTypeFilter}
              setTypeFilter={setBillingTypeFilter}
              page={billingPage}
              setPage={setBillingPage}
            />
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
            <FlightsTab
              flights={flights}
              loading={flightsLoading}
              filter={flightFilter}
              setFilter={setFlightFilter}
              search={flightSearch}
              setSearch={setFlightSearch}
            />
          )}
          {activeTab === "whatsapp" && (
            <WhatsAppConsoleTab
              healthData={healthData}
              healthLoading={healthLoading}
              whatsappTemplates={whatsappTemplates}
              whatsappContacts={whatsappContacts}
            />
          )}
        </div>
      </div>
    </div>
  );
}
