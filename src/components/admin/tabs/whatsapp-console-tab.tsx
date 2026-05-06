"use client";

import React from "react";
import {
  MessageCircle,
  Users,
  Clock,
  AlertTriangle,
  Activity,
  Zap,
  Globe,
  Shield,
  BarChart3,
  FileText,
  Link,
  AlertCircle,
  Eye,
  CheckCircle,
  Lock,
  Radio,
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, LoadingSpinner } from "../helpers";
import type { HealthData, WhatsAppTemplate, WhatsAppContact } from "../types";

interface WhatsAppConsoleTabProps {
  healthData: HealthData | null;
  healthLoading: boolean;
  whatsappTemplates: WhatsAppTemplate[];
  whatsappContacts: WhatsAppContact[];
}

export default function WhatsAppConsoleTab({
  healthData,
  healthLoading,
  whatsappTemplates,
  whatsappContacts,
}: WhatsAppConsoleTabProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* ─── A) Connection Status Panel (4 cards) ───────────────────── */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            État des connexions
          </h3>
          {healthLoading ? (
            <LoadingSpinner text="Chargement de l'état de santé…" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <StatusBadge status={healthData?.services.database.status} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{healthData?.services.database.latencyMs ?? "—"} ms</span>
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
                    Service IA (Groq)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={healthData?.services.ai.status} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{healthData?.services.ai.latencyMs ?? "—"} ms</span>
                  </div>
                  {healthData?.services.ai.details && (
                    <p className="text-xs text-muted-foreground">{healthData.services.ai.details}</p>
                  )}
                  {healthData?.services.ai.error && (
                    <p className="text-xs text-red-500">{healthData.services.ai.error}</p>
                  )}
                </CardContent>
              </Card>

              {/* OpenBSP Bridge Card */}
              <Card className="border-l-4 border-l-violet-500 premium-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-violet-500" />
                    OpenBSP Bridge
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={healthData?.services.openbsp.status} labelConnected="Connecté" labelOffline="Déconnecté" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{healthData?.services.openbsp.latencyMs ?? "—"} ms</span>
                  </div>
                  {healthData?.services.openbsp.details && (
                    <p className="text-xs text-muted-foreground">{healthData.services.openbsp.details}</p>
                  )}
                  {healthData?.services.openbsp.error && (
                    <p className="text-xs text-red-500">{healthData.services.openbsp.error}</p>
                  )}
                </CardContent>
              </Card>

              {/* WhatsApp Provider Card */}
              <Card className="border-l-4 border-l-green-500 premium-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Radio className="h-4 w-4 text-green-500" />
                    WhatsApp Provider
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={healthData?.services.whatsapp.status} labelConnected="Actif" labelOffline="Inactif" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{healthData?.services.whatsapp.latencyMs ?? "—"} ms</span>
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

        {/* ─── B) Webhook Configuration (Meta + OpenBSP) ───────────────── */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link className="h-5 w-5 text-emerald-500" />
              Configuration des Webhooks
            </CardTitle>
            <CardDescription>
              Endpoints de réception des messages WhatsApp (Meta Cloud API & OpenBSP)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OpenBSP Webhook */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800 text-xs">
                    OpenBSP
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 text-xs">
                    Principal
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">URL du Webhook</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value="/api/webhook/openbsp" className="bg-muted font-mono text-xs h-8" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Secret</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={healthData?.services.openbsp.status === "up" ? "••••••••••" : "Non configuré"} className="bg-muted font-mono text-xs h-8" type="password" />
                    <Badge className="text-xs shrink-0" variant={process.env.NODE_ENV === "production" ? "default" : "outline"}>
                      {process.env.NODE_ENV === "production" ? "Configuré" : "Dev"}
                    </Badge>
                  </div>
                </div>
                <div className="rounded bg-muted/30 p-2">
                  <p className="text-xs text-muted-foreground">
                    Port 3001 • Self-hosted • Temps réel • Sessions multiples
                  </p>
                </div>
              </div>
              {/* Meta Webhook */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 text-xs">
                    Meta Cloud
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800 text-xs">
                    Fallback
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">URL du Webhook</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value="/api/webhook/whatsapp" className="bg-muted font-mono text-xs h-8" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Verify Token</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value="aeroassist_verify_2024" className="bg-muted font-mono text-xs h-8" type="password" />
                    <Badge className="text-xs shrink-0" variant="outline">Configuré</Badge>
                  </div>
                </div>
                <div className="rounded bg-muted/30 p-2">
                  <p className="text-xs text-muted-foreground">
                    HMAC-SHA256 • Templates natifs • Production
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── C) WhatsApp Templates Panel ─────────────────────────── */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-500" />
              Templates WhatsApp
            </CardTitle>
            <CardDescription>
              Gestion des templates de messages automatisés ({whatsappTemplates.length} templates)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Nom</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Langue</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whatsappTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Aucun template configuré
                      </TableCell>
                    </TableRow>
                  ) : (
                    whatsappTemplates.map((tpl) => (
                      <TableRow key={tpl.id}>
                        <TableCell className="font-medium text-sm">{tpl.displayName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {tpl.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm uppercase">{tpl.language}</TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${
                              tpl.status === "approved" ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" :
                              tpl.status === "submitted" ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400"
                            }`}
                          >
                            {tpl.status === "approved" ? "✅ Approuvé" : tpl.status === "submitted" ? "⏳ Soumis" : "📝 Brouillon"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ─── D) Contacts Panel ─────────────────────────────────────── */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-500" />
              Contacts WhatsApp
            </CardTitle>
            <CardDescription>
              Gestion des contacts et consentements RGPD ({whatsappContacts.length} contacts)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Langue</TableHead>
                    <TableHead>Opt-in</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whatsappContacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Aucun contact enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    whatsappContacts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{c.pushName || c.phoneNumber}</p>
                            <p className="text-xs text-muted-foreground">{c.phoneNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm uppercase">{c.language}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${c.isOptIn ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400"}`}>
                            {c.isOptIn ? "✅ Oui" : "❌ Non"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.isBlacklisted ? (
                            <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 text-xs">
                              🚫 Bloqué
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                              Actif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">{c.messageCount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ─── E) Edge Cases + Security ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edge Case Handling */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Gestion des cas limites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  { cas: "Message vide", reponse: "Redirection avec exemples", badge: "Redirection", badgeClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800" },
                  { cas: "Média (image/vidéo/audio)", reponse: "Type non supporté", badge: "Non supporté", badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
                  { cas: "Timeout Groq IA", reponse: "Fallback FAQ statique", badge: "Fallback", badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800" },
                  { cas: "Message >4000 car.", reponse: "Demande de raccourcir", badge: "Limitation", badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" },
                  { cas: "Contact blacklisté", reponse: "Message bloqué silencieusement", badge: "Bloqué", badgeClass: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800" },
                  { cas: "Numéro invalide", reponse: "Rejet avec statut invalid_phone", badge: "Validation", badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800" },
                ].map((item) => (
                  <div key={item.cas} className="flex items-center justify-between rounded border p-2">
                    <span className="font-medium text-xs">{item.cas}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:inline">{item.reponse}</span>
                      <Badge variant="outline" className={`text-xs shrink-0 ${item.badgeClass}`}>{item.badge}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security Panel */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" />
                Mesures de sécurité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { icon: Shield, label: "Secret OpenBSP", desc: "Vérification timing-safe du header X-OpenBSP-Secret", color: "text-violet-500" },
                  { icon: AlertCircle, label: "Rate Limiting", desc: "200 req/min webhook, 20 req/min par téléphone", color: "text-amber-500" },
                  { icon: Eye, label: "Filtrage PII", desc: "Numéros de téléphone masqués dans les logs", color: "text-teal-500" },
                  { icon: Lock, label: "E.164 Validation", desc: "Validation des numéros internationaux (8-15 chiffres)", color: "text-red-500" },
                  { icon: CheckCircle, label: "RGPD Compliance", desc: "Opt-in/out, blacklist, consentement tracking", color: "text-emerald-500" },
                  { icon: Globe, label: "Security Headers", desc: "CSP, HSTS, X-Frame-Options sur tous les endpoints", color: "text-blue-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 rounded-lg border p-3">
                    <item.icon className={`h-4 w-4 mt-0.5 shrink-0 ${item.color}`} />
                    <div>
                      <p className="text-xs font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── F) Rate Limiting Monitor ──────────────────────────────── */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              Moniteur de limitation de débit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { value: "200", unit: "req/min", label: "Webhook", color: "text-violet-600" },
                { value: "20", unit: "req/min", label: "Par téléphone", color: "text-red-600" },
                { value: "100", unit: "req/15min", label: "API default", color: "text-teal-600" },
                { value: "20", unit: "req/min", label: "Mode strict", color: "text-amber-600" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border p-3 text-center space-y-1">
                  <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                  <p className="text-xs font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
