"use client";

import React from "react";
import {
  MessageCircle,
  Eye,
  Check,
  Loader2,
  Zap,
  Save,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { intentLabelMap } from "../helpers";
import type { AiLog } from "../types";

interface AiConfigTabProps {
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  confidenceThreshold: number;
  setConfidenceThreshold: (v: number) => void;
  selectedLanguages: string[];
  setSelectedLanguages: React.Dispatch<React.SetStateAction<string[]>>;
  fallbackEnabled: boolean;
  setFallbackEnabled: (v: boolean) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  aiConfigSaved: boolean;
  onSaveAiConfig: () => void;
  aiConfigLoading: boolean;
  // AI Logs
  aiLogs: AiLog[];
  aiLogsLoading: boolean;
  aiLogsTotal: number;
  aiLogsPage: number;
  aiLogsPerPage: number;
  setAiLogsPage: (v: number) => void;
  fetchAiLogs: (page?: number) => void;
}

export default function AiConfigTab({
  systemPrompt,
  setSystemPrompt,
  confidenceThreshold,
  setConfidenceThreshold,
  selectedLanguages,
  setSelectedLanguages,
  fallbackEnabled,
  setFallbackEnabled,
  selectedModel,
  setSelectedModel,
  aiConfigSaved,
  onSaveAiConfig,
  aiConfigLoading,
  aiLogs,
  aiLogsLoading,
  aiLogsTotal,
  aiLogsPage,
  aiLogsPerPage,
  setAiLogsPage,
  fetchAiLogs,
}: AiConfigTabProps) {
  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  return (
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

              <Button className="w-full" onClick={onSaveAiConfig}>
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
                        onClick={() => { setAiLogsPage(aiLogsPage - 1); fetchAiLogs(aiLogsPage - 1); }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">{aiLogsPage} / {Math.ceil(aiLogsTotal / aiLogsPerPage)}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={aiLogsPage >= Math.ceil(aiLogsTotal / aiLogsPerPage)}
                        onClick={() => { setAiLogsPage(aiLogsPage + 1); fetchAiLogs(aiLogsPage + 1); }}
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
  );
}
