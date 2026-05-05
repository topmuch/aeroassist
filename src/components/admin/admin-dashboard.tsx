"use client";

import React, { useState, useMemo } from "react";
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
  Scissors,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  role: string;
  langue: string;
  statut: boolean;
  conversations: number;
  inscription: string;
}

interface KnowledgeEntry {
  id: string;
  titre: string;
  categorie: string;
  statut: string;
  version: string;
  auteur: string;
  dateMAJ: string;
}

interface AILog {
  id: string;
  timestamp: string;
  userMessage: string;
  aiResponse: string;
  intent: string;
  confidence: number;
}

interface Transaction {
  id: string;
  reference: string;
  type: string;
  montant: string;
  statut: string;
  date: string;
  description: string;
}

interface Module {
  id: string;
  nom: string;
  description: string;
  icon: React.ReactNode;
  statut: boolean;
  utilisateurs: number;
}

interface Flight {
  id: string;
  vol: string;
  compagnie: string;
  depart: string;
  arrivee: string;
  heure: string;
  porte: string;
  statut: string;
  terminal: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockMessagesPerDay = [
  { jour: "Lun", messages: 342 },
  { jour: "Mar", messages: 458 },
  { jour: "Mer", messages: 389 },
  { jour: "Jeu", messages: 512 },
  { jour: "Ven", messages: 467 },
  { jour: "Sam", messages: 298 },
  { jour: "Dim", messages: 231 },
];

const mockIntentDistribution = [
  { intent: "Vols", count: 1240 },
  { intent: "Restaurants", count: 856 },
  { intent: "Services", count: 723 },
  { intent: "Réservations", count: 634 },
  { intent: "Aide", count: 412 },
];

const mockRecentActivity = [
  {
    id: "1",
    action: "Nouvelle conversation",
    utilisateur: "Marie Dupont",
    detail: "Demande d'information vol AF1234",
    timestamp: "Il y a 3 min",
  },
  {
    id: "2",
    action: "Réservation confirmée",
    utilisateur: "Jean-Pierre Martin",
    detail: "Salon VIP - Terminal 2E CDG",
    timestamp: "Il y a 12 min",
  },
  {
    id: "3",
    action: "Article publié",
    utilisateur: "Admin Système",
    detail: "Guide Duty-Free - Mise à jour tarifs",
    timestamp: "Il y a 28 min",
  },
  {
    id: "4",
    action: "Utilisateur inscrit",
    utilisateur: "Sophie Laurent",
    detail: "Compte voyageur créé avec succès",
    timestamp: "Il y a 45 min",
  },
  {
    id: "5",
    action: "Alerte retard",
    utilisateur: "Système Auto",
    detail: "Vol BA0245 - Retard 45 min (Terminal 2A)",
    timestamp: "Il y a 1h",
  },
];

const mockUsers: User[] = [
  {
    id: "1",
    nom: "Pierre Dubois",
    email: "pierre.dubois@aeroassist.fr",
    telephone: "+33 6 12 34 56 78",
    role: "superadmin",
    langue: "français",
    statut: true,
    conversations: 0,
    inscription: "2024-01-15",
  },
  {
    id: "2",
    nom: "Marie Laurent",
    email: "marie.laurent@aeroassist.fr",
    telephone: "+33 6 23 45 67 89",
    role: "admin",
    langue: "français",
    statut: true,
    conversations: 0,
    inscription: "2024-02-20",
  },
  {
    id: "3",
    nom: "Jean-Pierre Martin",
    email: "jp.martin@airfrance.fr",
    telephone: "+33 6 34 56 78 90",
    role: "partner",
    langue: "français",
    statut: true,
    conversations: 5,
    inscription: "2024-03-10",
  },
  {
    id: "4",
    nom: "Sophie Tremblay",
    email: "sophie.tremblay@hotmail.fr",
    telephone: "+33 6 45 67 89 01",
    role: "traveler",
    langue: "français",
    statut: true,
    conversations: 12,
    inscription: "2024-04-05",
  },
  {
    id: "5",
    nom: "Thomas Bernard",
    email: "t.bernard@gmail.com",
    telephone: "+33 6 56 78 90 12",
    role: "traveler",
    langue: "anglais",
    statut: false,
    conversations: 3,
    inscription: "2024-05-12",
  },
  {
    id: "6",
    nom: "Isabelle Moreau",
    email: "isabelle.moreau@lufthansa.com",
    telephone: "+33 6 67 89 01 23",
    role: "partner",
    langue: "allemand",
    statut: true,
    conversations: 8,
    inscription: "2024-06-01",
  },
  {
    id: "7",
    nom: "François Lefèvre",
    email: "f.lefevre@yahoo.fr",
    telephone: "+33 6 78 90 12 34",
    role: "traveler",
    langue: "français",
    statut: true,
    conversations: 7,
    inscription: "2024-06-15",
  },
  {
    id: "8",
    nom: "Camille Petit",
    email: "camille.petit@aeroassist.fr",
    telephone: "+33 6 89 01 23 45",
    role: "admin",
    langue: "espagnol",
    statut: true,
    conversations: 0,
    inscription: "2024-07-20",
  },
  {
    id: "9",
    nom: "Antoine Roux",
    email: "a.roux@emirates.com",
    telephone: "+33 6 90 12 34 56",
    role: "partner",
    langue: "anglais",
    statut: true,
    conversations: 15,
    inscription: "2024-08-03",
  },
  {
    id: "10",
    nom: "Nathalie Garcia",
    email: "nathalie.garcia@orange.fr",
    telephone: "+33 6 01 23 45 67",
    role: "traveler",
    langue: "français",
    statut: false,
    conversations: 2,
    inscription: "2024-09-18",
  },
  {
    id: "11",
    nom: "Lucas Mercier",
    email: "lucas.mercier@britishairways.com",
    telephone: "+33 6 11 22 33 44",
    role: "partner",
    langue: "anglais",
    statut: true,
    conversations: 6,
    inscription: "2024-10-01",
  },
  {
    id: "12",
    nom: "Émilie Leroy",
    email: "emilie.leroy@gmail.com",
    telephone: "+33 6 55 66 77 88",
    role: "traveler",
    langue: "français",
    statut: true,
    conversations: 9,
    inscription: "2024-11-10",
  },
];

const mockKnowledge: KnowledgeEntry[] = [
  {
    id: "1",
    titre: "Guide complet des terminaux CDG",
    categorie: "flights",
    statut: "published",
    version: "3.2",
    auteur: "Marie Laurent",
    dateMAJ: "2025-01-10",
  },
  {
    id: "2",
    titre: "Carte des restaurants Terminal 2",
    categorie: "restaurants",
    statut: "published",
    version: "2.1",
    auteur: "Pierre Dubois",
    dateMAJ: "2025-01-08",
  },
  {
    id: "3",
    titre: "Procédure d'enregistrement en ligne",
    categorie: "services",
    statut: "validated",
    version: "1.5",
    auteur: "Camille Petit",
    dateMAJ: "2025-01-06",
  },
  {
    id: "4",
    titre: "Horaires navettes inter-terminals",
    categorie: "transport",
    statut: "published",
    version: "2.0",
    auteur: "Marie Laurent",
    dateMAJ: "2025-01-05",
  },
  {
    id: "5",
    titre: "Guide shopping Duty-Free",
    categorie: "shops",
    statut: "draft",
    version: "1.0",
    auteur: "Pierre Dubois",
    dateMAJ: "2025-01-04",
  },
  {
    id: "6",
    titre: "FAQ - Questions fréquentes voyageurs",
    categorie: "general",
    statut: "published",
    version: "4.0",
    auteur: "Camille Petit",
    dateMAJ: "2025-01-03",
  },
  {
    id: "7",
    titre: "Procédure bagages perdus",
    categorie: "services",
    statut: "validated",
    version: "2.3",
    auteur: "Marie Laurent",
    dateMAJ: "2025-01-02",
  },
  {
    id: "8",
    titre: "Restaurants recommandés Terminal 2F",
    categorie: "restaurants",
    statut: "draft",
    version: "0.9",
    auteur: "Pierre Dubois",
    dateMAJ: "2024-12-28",
  },
  {
    id: "9",
    titre: "Transfert CDG - Paris centre",
    categorie: "transport",
    statut: "published",
    version: "3.1",
    auteur: "Camille Petit",
    dateMAJ: "2024-12-20",
  },
  {
    id: "10",
    titre: "Services spéciaux PMR",
    categorie: "services",
    statut: "archived",
    version: "1.8",
    auteur: "Marie Laurent",
    dateMAJ: "2024-12-15",
  },
  {
    id: "11",
    titre: "Boutiques tax-free - Guide 2025",
    categorie: "shops",
    statut: "validated",
    version: "2.2",
    auteur: "Pierre Dubois",
    dateMAJ: "2024-12-10",
  },
];

const mockAILogs: AILog[] = [
  {
    id: "1",
    timestamp: "14:32:15",
    userMessage: "Où est le vol AF1234 ?",
    aiResponse:
      "Le vol AF1234 Paris-CDG vers New York JFK est programmé pour un départ à 18h30 depuis le Terminal 2E, porte K42.",
    intent: "vols",
    confidence: 0.96,
  },
  {
    id: "2",
    timestamp: "14:28:03",
    userMessage: "Je cherche un bon restaurant italien au terminal 2F",
    aiResponse:
      "Je vous recommande la trattoria L'Olivo au Terminal 2F, niveau départ. Ouverture de 6h à 22h. Réservation possible au +33 1 49...",
    intent: "restaurants",
    confidence: 0.92,
  },
  {
    id: "3",
    timestamp: "14:15:42",
    userMessage: "Comment réserver un salon VIP ?",
    aiResponse:
      "Pour réserver un salon VIP, vous pouvez le faire directement via notre service ou au comptoir de votre terminal. Tarif à partir de 45€...",
    intent: "réservations",
    confidence: 0.88,
  },
  {
    id: "4",
    timestamp: "14:02:18",
    userMessage: "Mon vol est retardé, que faire ?",
    aiResponse:
      "En cas de retard, vous pouvez consulter le tableau d'affichage, demander de l'aide au comptoir d'information ou contacter votre compagnie...",
    intent: "aide",
    confidence: 0.91,
  },
  {
    id: "5",
    timestamp: "13:55:30",
    userMessage: "Où trouver un distributeur de billets ?",
    aiResponse:
      "Vous trouverez des distributeurs automatiques au niveau arrivées de chaque terminal : T1 hall 4, T2A, T2B, T2C, T2D, T2E et T2F...",
    intent: "services",
    confidence: 0.85,
  },
  {
    id: "6",
    timestamp: "13:41:07",
    userMessage: "Quel est le statut du vol EK73 ?",
    aiResponse:
      "Le vol Emirates EK73 de Dubaï est arrivé à 13h20 au Terminal 2C, porte B14. Bagages au carrousel 5.",
    intent: "vols",
    confidence: 0.97,
  },
  {
    id: "7",
    timestamp: "13:30:22",
    userMessage: "Je voudrais louer une voiture",
    aiResponse:
      "Plusieurs agences de location sont disponibles au Terminal 2 : Avis, Hertz, Europcar, Sixt. Shuttle gratuit vers le parc locatif...",
    intent: "services",
    confidence: 0.83,
  },
  {
    id: "8",
    timestamp: "13:18:45",
    userMessage: "Combien de temps pour aller à Paris en RER ?",
    aiResponse:
      "Le RER B relie CDG à Paris centre en environ 35 minutes. Départ toutes les 15 min. Billet ~11€. Gare RER au niveau -1 T2...",
    intent: "transport",
    confidence: 0.94,
  },
];

const mockTransactions: Transaction[] = [
  {
    id: "1",
    reference: "RES-2025-00847",
    type: "VIP",
    montant: "€85.00",
    statut: "paid",
    date: "2025-01-15",
    description: "Salon VIP Terminal 2E - 2h",
  },
  {
    id: "2",
    reference: "RES-2025-00846",
    type: "Hôtel",
    montant: "€189.00",
    statut: "pending",
    date: "2025-01-15",
    description: "Hilton CDG - 1 nuit",
  },
  {
    id: "3",
    reference: "RES-2025-00845",
    type: "Voiture",
    montant: "€65.00",
    statut: "paid",
    date: "2025-01-14",
    description: "Location Renault Clio - 1 jour",
  },
  {
    id: "4",
    reference: "RES-2025-00844",
    type: "Duty-Free",
    montant: "€234.50",
    statut: "paid",
    date: "2025-01-14",
    description: "Parfumerie & Cosmétiques",
  },
  {
    id: "5",
    reference: "RES-2025-00843",
    type: "VIP",
    montant: "€45.00",
    statut: "refunded",
    date: "2025-01-14",
    description: "Salon VIP Terminal 2F - 1h (remboursé)",
  },
  {
    id: "6",
    reference: "RES-2025-00842",
    type: "Hôtel",
    montant: "€245.00",
    statut: "paid",
    date: "2025-01-13",
    description: "Novotel Orly - 1 nuit",
  },
  {
    id: "7",
    reference: "RES-2025-00841",
    type: "Voiture",
    montant: "€120.00",
    statut: "pending",
    date: "2025-01-13",
    description: "Location BMW Série 3 - 2 jours",
  },
  {
    id: "8",
    reference: "RES-2025-00840",
    type: "Duty-Free",
    montant: "€87.30",
    statut: "paid",
    date: "2025-01-13",
    description: "Liquides & Tabacs",
  },
  {
    id: "9",
    reference: "RES-2025-00839",
    type: "VIP",
    montant: "€125.00",
    statut: "paid",
    date: "2025-01-12",
    description: "Salon VIP Premium - 3h",
  },
  {
    id: "10",
    reference: "RES-2025-00838",
    type: "Hôtel",
    montant: "€156.00",
    statut: "paid",
    date: "2025-01-12",
    description: "Mercure CDG - 1 nuit",
  },
];

const mockRevenue = [
  { mois: "Août", revenus: 12400 },
  { mois: "Sept", revenus: 15200 },
  { mois: "Oct", revenus: 13800 },
  { mois: "Nov", revenus: 16900 },
  { mois: "Déc", revenus: 21400 },
  { mois: "Janv", revenus: 18700 },
];

const mockModules: Module[] = [
  {
    id: "1",
    nom: "Salon VIP",
    description:
      "Gestion des réservations et accès aux salons VIP des terminaux CDG et ORY.",
    icon: <Crown className="h-8 w-8" />,
    statut: true,
    utilisateurs: 342,
  },
  {
    id: "2",
    nom: "Marketplace",
    description:
      "Place de marché pour les services et produits disponibles dans l'aéroport.",
    icon: <ShoppingBag className="h-8 w-8" />,
    statut: true,
    utilisateurs: 189,
  },
  {
    id: "3",
    nom: "Duty-Free",
    description:
      "Catalogue des boutiques hors taxes avec commandes en ligne et retrait au terminal.",
    icon: <CreditCard className="h-8 w-8" />,
    statut: true,
    utilisateurs: 567,
  },
  {
    id: "4",
    nom: "Hôtels",
    description:
      "Réservation d'hôtels proches des aéroports avec navette incluse.",
    icon: <Building2 className="h-8 w-8" />,
    statut: false,
    utilisateurs: 124,
  },
  {
    id: "5",
    nom: "Location Voitures",
    description:
      "Comparateur et réservation de véhicules de location via nos partenaires.",
    icon: <Car className="h-8 w-8" />,
    statut: true,
    utilisateurs: 231,
  },
  {
    id: "6",
    nom: "Restaurants",
    description:
      "Guide des restaurants et réservation de tables dans les terminaux.",
    icon: <Utensils className="h-8 w-8" />,
    statut: true,
    utilisateurs: 415,
  },
];

const mockFlights: Flight[] = [
  {
    id: "1",
    vol: "AF1234",
    compagnie: "Air France",
    depart: "Paris CDG",
    arrivee: "New York JFK",
    heure: "18:30",
    porte: "K42",
    statut: "scheduled",
    terminal: "T2E",
  },
  {
    id: "2",
    vol: "EK73",
    compagnie: "Emirates",
    depart: "Dubaï DXB",
    arrivee: "Paris CDG",
    heure: "13:20",
    porte: "B14",
    statut: "arrived",
    terminal: "T2C",
  },
  {
    id: "3",
    vol: "BA0245",
    compagnie: "British Airways",
    depart: "Paris CDG",
    arrivee: "Londres LHR",
    heure: "17:15",
    porte: "A22",
    statut: "delayed",
    terminal: "T2A",
  },
  {
    id: "4",
    vol: "LH1023",
    compagnie: "Lufthansa",
    depart: "Paris CDG",
    arrivee: "Francfort FRA",
    heure: "19:00",
    porte: "C31",
    statut: "boarding",
    terminal: "T2D",
  },
  {
    id: "5",
    vol: "AF0087",
    compagnie: "Air France",
    depart: "Paris CDG",
    arrivee: "Tokyo NRT",
    heure: "23:10",
    porte: "L08",
    statut: "scheduled",
    terminal: "T2E",
  },
  {
    id: "6",
    vol: "IB3176",
    compagnie: "Iberia",
    depart: "Madrid MAD",
    arrivee: "Paris ORY",
    heure: "14:45",
    porte: "3B",
    statut: "arrived",
    terminal: "T3",
  },
  {
    id: "7",
    vol: "U22056",
    compagnie: "EasyJet",
    depart: "Paris ORY",
    arrivee: "Barcelone BCN",
    heure: "16:30",
    porte: "24A",
    statut: "departed",
    terminal: "T4",
  },
  {
    id: "8",
    vol: "TK1828",
    compagnie: "Turkish Airlines",
    depart: "Istanbul IST",
    arrivee: "Paris CDG",
    heure: "15:10",
    porte: "D55",
    statut: "scheduled",
    terminal: "T2D",
  },
  {
    id: "9",
    vol: "AF1654",
    compagnie: "Air France",
    depart: "Paris CDG",
    arrivee: "Lyon LYS",
    heure: "20:45",
    porte: "B23",
    statut: "scheduled",
    terminal: "T2B",
  },
  {
    id: "10",
    vol: "RY8920",
    compagnie: "Ryanair",
    depart: "Paris CDG",
    arrivee: "Rome FCO",
    heure: "12:00",
    porte: "E12",
    statut: "cancelled",
    terminal: "T2B",
  },
  {
    id: "11",
    vol: "AF4520",
    compagnie: "Air France",
    depart: "Paris ORY",
    arrivee: "Marseille MRS",
    heure: "21:15",
    porte: "15C",
    statut: "scheduled",
    terminal: "T2",
  },
  {
    id: "12",
    vol: "QR042",
    compagnie: "Qatar Airways",
    depart: "Doha DOH",
    arrivee: "Paris CDG",
    heure: "07:30",
    porte: "A08",
    statut: "arrived",
    terminal: "T2A",
  },
];

// ─── Chart Configs ───────────────────────────────────────────────────────────

const messagesChartConfig = {
  messages: {
    label: "Messages",
    color: "var(--color-emerald-500)",
  },
};

const intentChartConfig = {
  count: {
    label: "Requêtes",
    color: "var(--color-emerald-500)",
  },
};

const revenueChartConfig = {
  revenus: {
    label: "Revenus (€)",
    color: "var(--color-emerald-500)",
  },
};

// ─── Badge Helpers ───────────────────────────────────────────────────────────

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
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
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
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
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
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
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
  };
  const info = map[statut] || {
    label: statut,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
}

function getTransactionTypeBadge(type: string) {
  const map: Record<string, { label: string; className: string }> = {
    VIP: {
      label: "VIP",
      className:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    },
    Hôtel: {
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
    label: type,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
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
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Users state
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 8;

  // Knowledge state
  const [kbSearch, setKbSearch] = useState("");
  const [kbCategoryFilter, setKbCategoryFilter] = useState("all");
  const [kbStatusFilter, setKbStatusFilter] = useState("all");
  const [kbDialogOpen, setKbDialogOpen] = useState(false);

  // AI Config state
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

  // Modules state
  const [modules, setModules] = useState(mockModules);
  const [moduleConfigOpen, setModuleConfigOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [moduleConfig, setModuleConfig] = useState({
    pricing: "",
    partnerName: "",
    maxCapacity: "",
    description: "",
    contactEmail: "",
  });

  // KB Import state
  const [kbImportUrlOpen, setKbImportUrlOpen] = useState(false);
  const [kbImportPdfOpen, setKbImportPdfOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importUrlCategory, setImportUrlCategory] = useState("general");
  const [importUrlStatus, setImportUrlStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importPdfStatus, setImportPdfStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importPdfName, setImportPdfName] = useState("");

  // AI save state
  const [aiConfigSaved, setAiConfigSaved] = useState(false);

  // Module config save state
  const [moduleConfigSaved, setModuleConfigSaved] = useState(false);

  // Flights state
  const [flightFilter, setFlightFilter] = useState("all");
  const [flightSearch, setFlightSearch] = useState("");

  // ─── Filtered Data ──────────────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    return mockUsers.filter((u) => {
      const matchSearch =
        u.nom.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [userSearch, userRoleFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, userPage]);

  const userTotalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const filteredKnowledge = useMemo(() => {
    return mockKnowledge.filter((k) => {
      const matchSearch = k.titre
        .toLowerCase()
        .includes(kbSearch.toLowerCase());
      const matchCategory =
        kbCategoryFilter === "all" || k.categorie === kbCategoryFilter;
      const matchStatus =
        kbStatusFilter === "all" || k.statut === kbStatusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [kbSearch, kbCategoryFilter, kbStatusFilter]);

  const filteredFlights = useMemo(() => {
    return mockFlights.filter((f) => {
      const matchFilter =
        flightFilter === "all" ||
        (flightFilter === "depart" &&
          (f.statut === "scheduled" ||
            f.statut === "boarding" ||
            f.statut === "delayed" ||
            f.statut === "departed")) ||
        (flightFilter === "arrivee" &&
          (f.statut === "arrived" ||
            f.depart !== "Paris CDG" &&
            f.depart !== "Paris ORY"));
      const matchSearch = f.vol
        .toLowerCase()
        .includes(flightSearch.toLowerCase()) ||
        f.compagnie.toLowerCase().includes(flightSearch.toLowerCase());
      // Filter logic: all flights, departures from CDG/ORY, arrivals to CDG/ORY
      let matchDirection = true;
      if (flightFilter === "depart") {
        matchDirection =
          f.depart === "Paris CDG" || f.depart === "Paris ORY";
      } else if (flightFilter === "arrivee") {
        matchDirection =
          f.arrivee === "Paris CDG" || f.arrivee === "Paris ORY";
      }
      return matchDirection && matchSearch;
    });
  }, [flightFilter, flightSearch]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const toggleModuleStatus = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, statut: !m.statut } : m
      )
    );
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang)
        ? prev.filter((l) => l !== lang)
        : [...prev, lang]
    );
  };

  const openModuleConfig = (mod: Module) => {
    setSelectedModule(mod);
    setModuleConfig({
      pricing: "45",
      partnerName: mod.nom,
      maxCapacity: "100",
      description: mod.description,
      contactEmail: `contact@${mod.nom.toLowerCase().replace(/\s+/g, '')}.fr`,
    });
    setModuleConfigOpen(true);
    setModuleConfigSaved(false);
  };

  const saveModuleConfig = () => {
    setModuleConfigSaved(true);
    setTimeout(() => setModuleConfigOpen(false), 1200);
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImportUrlStatus("loading");
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Import: ${new URL(importUrl).hostname}`,
          content: `Contenu importé depuis ${importUrl}. Le contenu sera parsé et chunké automatiquement par le pipeline RAG.`,
          source: importUrl,
          category: importUrlCategory,
          status: "draft",
        }),
      });
      if (res.ok) {
        setImportUrlStatus("success");
        setTimeout(() => {
          setKbImportUrlOpen(false);
          setImportUrl("");
          setImportUrlStatus("idle");
        }, 1500);
      } else {
        setImportUrlStatus("error");
      }
    } catch {
      setImportUrlStatus("error");
      setTimeout(() => setImportUrlStatus("idle"), 2000);
    }
  };

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportPdfName(file.name);
    setImportPdfStatus("loading");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `PDF: ${file.name.replace(/\.pdf$/i, "")}`,
          content: `Document PDF importé : ${file.name} (${(file.size / 1024).toFixed(1)} Ko). Le contenu sera extrait, nettoyé et vectorisé par le pipeline RAG.`,
          source: `pdf://${file.name}`,
          category: "general",
          status: "draft",
        }),
      });
      if (res.ok) {
        setImportPdfStatus("success");
        setTimeout(() => {
          setKbImportPdfOpen(false);
          setImportPdfName("");
          setImportPdfStatus("idle");
        }, 1500);
      } else {
        setImportPdfStatus("error");
      }
    } catch {
      setImportPdfStatus("error");
      setTimeout(() => setImportPdfStatus("idle"), 2000);
    }
  };

  const saveAiConfig = () => {
    setAiConfigSaved(true);
    setTimeout(() => setAiConfigSaved(false), 2000);
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Settings className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              AeroAssist - Administration
            </h1>
            <p className="text-sm text-muted-foreground">
              Tableau de bord de gestion aéroportuaire
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="mb-4 overflow-x-auto pb-2 -mx-1 px-1">
          <TabsList className="inline-flex flex-nowrap">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-4 w-4 hidden sm:block" />
              Vue d&apos;ensemble
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4 hidden sm:block" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-1.5">
              <FileText className="h-4 w-4 hidden sm:block" />
              Base de Connaissance
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <Zap className="h-4 w-4 hidden sm:block" />
              Configuration IA
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5">
              <CreditCard className="h-4 w-4 hidden sm:block" />
              Facturation
            </TabsTrigger>
            <TabsTrigger value="modules" className="gap-1.5">
              <Activity className="h-4 w-4 hidden sm:block" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="flights" className="gap-1.5">
              <Plane className="h-4 w-4 hidden sm:block" />
              Vols
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════════════════ TAB 1: Overview ═══════════════════════ */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Conversations Actives
                      </p>
                      <p className="text-2xl font-bold mt-1">247</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          +12% vs hier
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Voyageurs Inscrits
                      </p>
                      <p className="text-2xl font-bold mt-1">3,842</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          +8% ce mois
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Taux de Résolution
                      </p>
                      <p className="text-2xl font-bold mt-1">94.2%</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          +2.1% vs mois dernier
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Revenus du Jour
                      </p>
                      <p className="text-2xl font-bold mt-1">&euro;2,340</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          +5% vs hier
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Euro className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Messages per day chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Messages par jour
                  </CardTitle>
                  <CardDescription>
                    7 derniers jours
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ChartContainer
                    config={messagesChartConfig}
                    className="h-[250px] w-full"
                  >
                    <AreaChart
                      data={mockMessagesPerDay}
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
                            stopColor="var(--color-emerald-500)"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-emerald-500)"
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
                        stroke="var(--color-emerald-500)"
                        fill="url(#messagesGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Intent distribution chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Distribution des intentions
                  </CardTitle>
                  <CardDescription>
                    Par catégorie de requête
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ChartContainer
                    config={intentChartConfig}
                    className="h-[250px] w-full"
                  >
                    <BarChart
                      data={mockIntentDistribution}
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
                        fill="var(--color-emerald-500)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activité récente</CardTitle>
                <CardDescription>
                  Dernières actions sur la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRecentActivity.map((activity) => (
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════ TAB 2: Users ═══════════════════════ */}
        <TabsContent value="users">
          <div className="space-y-4">
            {/* Search & Filters */}
            <Card>
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
            <Card>
              <CardContent className="p-0">
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
                      {paginatedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.nom}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {user.telephone}
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>
                            <Switch
                              checked={user.statut}
                              aria-label={`Statut de ${user.nom}`}
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
                      {paginatedUsers.length === 0 && (
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
              </CardContent>
            </Card>

            {/* Pagination */}
            {userTotalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredUsers.length} utilisateur(s) &middot; Page{" "}
                  {userPage} sur {userTotalPages}
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
                  {Array.from({ length: userTotalPages }, (_, i) => (
                    <Button
                      key={i}
                      variant={userPage === i + 1 ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setUserPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={userPage >= userTotalPages}
                    onClick={() => setUserPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════════ TAB 3: Knowledge Base ═══════════════════════ */}
        <TabsContent value="knowledge">
          <div className="space-y-4">
            {/* Search & Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un article..."
                      value={kbSearch}
                      onChange={(e) => setKbSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={kbCategoryFilter}
                    onValueChange={setKbCategoryFilter}
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
                    onValueChange={setKbStatusFilter}
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
                            <span className="text-sm">Contenu importé avec succès ! En attente de validation.</span>
                          </div>
                        )}
                        {importUrlStatus === "error" && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Erreur lors de l&apos;import. Vérifiez l&apos;URL et réessayez.</span>
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
                              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle className="h-6 w-6" />
                                <span className="text-sm font-medium">Importé avec succès !</span>
                              </div>
                            )}
                            {importPdfStatus === "error" && (
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-6 w-6" />
                                <span className="text-sm font-medium">Erreur d&apos;import</span>
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
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label>Catégorie</Label>
                            <Select defaultValue="general">
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
                            <Select defaultValue="draft">
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
                        <Button onClick={() => setKbDialogOpen(false)}>
                          Créer l&apos;article
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Knowledge Table */}
            <Card>
              <CardContent className="p-0">
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
                      {filteredKnowledge.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{entry.titre}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.dateMAJ}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getCategoryBadge(entry.categorie)}</TableCell>
                          <TableCell>
                            {getKnowledgeStatusBadge(entry.statut)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            v{entry.version}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {entry.auteur}
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
                              {entry.statut === "draft" && (
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
                      {filteredKnowledge.length === 0 && (
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════ TAB 4: AI Configuration ═══════════════════════ */}
        <TabsContent value="ai">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Settings */}
            <div className="space-y-4">
              <Card>
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

            {/* AI Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  Journaux IA récents
                </CardTitle>
                <CardDescription>
                  Historique des échanges avec l&apos;IA
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Heure</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Intent</TableHead>
                        <TableHead className="w-[70px]">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockAILogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {log.timestamp}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  U:
                                </span>{" "}
                                {log.userMessage}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                  IA:
                                </span>{" "}
                                {log.aiResponse}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {log.intent}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs font-mono font-medium ${
                                log.confidence >= 0.9
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : log.confidence >= 0.75
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {(log.confidence * 100).toFixed(0)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════ TAB 5: Billing ═══════════════════════ */}
        <TabsContent value="billing">
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total ce mois
                      </p>
                      <p className="text-2xl font-bold mt-1">&euro;18,700</p>
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Euro className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        En attente
                      </p>
                      <p className="text-2xl font-bold mt-1">&euro;331</p>
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                      <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Payé</p>
                      <p className="text-2xl font-bold mt-1">&euro;18,014</p>
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Remboursé
                      </p>
                      <p className="text-2xl font-bold mt-1">&euro;45</p>
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Revenus mensuels
                </CardTitle>
                <CardDescription>6 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={revenueChartConfig}
                  className="h-[300px] w-full"
                >
                  <BarChart
                    data={mockRevenue}
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
                      fill="var(--color-emerald-500)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Transactions récentes
                </CardTitle>
                <CardDescription>
                  Dernières opérations de facturation
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
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
                      {mockTransactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="font-mono text-xs">
                            {txn.reference}
                          </TableCell>
                          <TableCell>
                            {getTransactionTypeBadge(txn.type)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {txn.description}
                          </TableCell>
                          <TableCell className="font-medium">
                            {txn.montant}
                          </TableCell>
                          <TableCell>
                            {getTransactionStatusBadge(txn.statut)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {txn.date}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════ TAB 6: Modules ═══════════════════════ */}
        <TabsContent value="modules">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Modules disponibles</h2>
              <p className="text-sm text-muted-foreground">
                Gérez les fonctionnalités actives de la plateforme AeroAssist.
              </p>
            </div>
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
            </div>

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
                  <Button onClick={saveModuleConfig}>
                    <Save className="h-4 w-4 mr-1.5" />
                    {moduleConfigSaved ? "Sauvegardé !" : "Sauvegarder"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        {/* ═══════════════════════ TAB 7: Flights ═══════════════════════ */}
        <TabsContent value="flights">
          <div className="space-y-4">
            {/* Flight Filters */}
            <Card>
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
            <Card>
              <CardContent className="p-0">
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
                      {filteredFlights.map((flight) => (
                        <TableRow key={flight.id}>
                          <TableCell className="font-mono font-semibold">
                            {flight.vol}
                          </TableCell>
                          <TableCell className="font-medium">
                            {flight.compagnie}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {flight.depart}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {flight.arrivee}
                          </TableCell>
                          <TableCell className="font-mono">
                            {flight.heure}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {flight.porte}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="secondary">{flight.terminal}</Badge>
                          </TableCell>
                          <TableCell>
                            {getFlightStatusBadge(flight.statut)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredFlights.length === 0 && (
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
