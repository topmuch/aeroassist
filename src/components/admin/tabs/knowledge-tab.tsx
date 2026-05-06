"use client";

import React, { useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Filter,
  ChevronLeft,
  ChevronRight,
  Archive,
  Check,
  Loader2,
  Settings,
  Scissors,
  Zap,
  Upload,
  Link,
  FileUp,
  AlertCircle,
  FileText,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getCategoryBadge, getKnowledgeStatusBadge, formatDate, LoadingSpinner } from "../helpers";
import type { ApiKnowledge, PaginationInfo } from "../types";

interface KnowledgeTabProps {
  knowledge: ApiKnowledge[];
  loading: boolean;
  pagination: PaginationInfo;
  search: string;
  setSearch: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
  onFetchKnowledge: () => void;
  authHeaders: Record<string, string>;
}

export default function KnowledgeTab({
  knowledge,
  loading,
  pagination,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  page,
  setPage,
  onFetchKnowledge,
  authHeaders,
}: KnowledgeTabProps) {
  // Add article dialog state
  const [kbDialogOpen, setKbDialogOpen] = useState(false);
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbCategory, setNewKbCategory] = useState("general");
  const [newKbStatus, setNewKbStatus] = useState("draft");
  const [newKbContent, setNewKbContent] = useState("");
  const [kbCreating, setKbCreating] = useState(false);

  // URL import dialog state
  const [kbImportUrlOpen, setKbImportUrlOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importUrlCategory, setImportUrlCategory] = useState("general");
  const [importUrlStatus, setImportUrlStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [importResultInfo, setImportResultInfo] = useState("");

  // PDF import dialog state
  const [kbImportPdfOpen, setKbImportPdfOpen] = useState(false);
  const [importPdfStatus, setImportPdfStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [importPdfName, setImportPdfName] = useState("");
  const [editKbEntry, setEditKbEntry] = useState<{ id: string; title: string } | null>(null);
  const [editKbTitle, setEditKbTitle] = useState("");
  const [editKbContent, setEditKbContent] = useState("");
  const [kbSaving, setKbSaving] = useState(false);

  const handleCreateKbArticle = async () => {
    if (!newKbTitle.trim() || !newKbContent.trim()) return;
    setKbCreating(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
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
        onFetchKnowledge();
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
        headers: { ...authHeaders, "Content-Type": "application/json" },
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
        onFetchKnowledge();
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
        headers: { ...authHeaders },
        body: formData,
      });
      const result = await res.json();
      if (res.ok && result.success) {
        const d = result.data;
        setImportResultInfo(
          `${d.pages || 0} pages, ${d.chunkCount || 0} chunks créés`
        );
        setImportPdfStatus("success");
        onFetchKnowledge();
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

  return (
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
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={categoryFilter}
                onValueChange={(v) => {
                  setCategoryFilter(v);
                  setPage(1);
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
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
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
                        <Check className="h-4 w-4" />
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
                            <Check className="h-6 w-6" />
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
            {loading ? (
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
                              onClick={() => {
                                setEditKbEntry(entry);
                                setEditKbTitle(entry.title);
                                setEditKbContent("");
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span className="sr-only">Modifier</span>
                            </Button>
                            {entry.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-blue-500"
                                onClick={async () => {
                                  try {
                                    const res = await fetch("/api/knowledge", {
                                      method: "PUT",
                                      headers: { ...authHeaders, "Content-Type": "application/json" },
                                      body: JSON.stringify({ id: entry.id, status: "validated" }),
                                    });
                                    if (res.ok) onFetchKnowledge();
                                  } catch { /* silent */ }
                                }}
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span className="sr-only">Valider</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground"
                              onClick={async () => {
                                if (confirm("Archiver cet article ?")) {
                                  try {
                                    const res = await fetch("/api/knowledge?id=" + entry.id, { method: "DELETE", headers: authHeaders });
                                    if (res.ok) onFetchKnowledge();
                                  } catch { /* silent */ }
                                }
                              }}
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
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {pagination.total} article(s) &middot; Page{" "}
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

      {/* Edit KB Article Dialog */}
      <Dialog open={!!editKbEntry} onOpenChange={(open) => { if (!open) setEditKbEntry(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;article</DialogTitle>
            <DialogDescription>Modifiez le titre ou le contenu de l&apos;article.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-kb-title">Titre</Label>
              <Input id="edit-kb-title" value={editKbTitle} onChange={(e) => setEditKbTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-kb-content">Nouveau contenu (ajout)</Label>
              <Textarea id="edit-kb-content" value={editKbContent} onChange={(e) => setEditKbContent(e.target.value)} placeholder="Contenu à ajouter à l'article..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditKbEntry(null)}>Annuler</Button>
            <Button disabled={kbSaving} onClick={async () => {
              if (!editKbEntry || !editKbTitle) return;
              setKbSaving(true);
              try {
                const body: Record<string, string> = { id: editKbEntry.id, title: editKbTitle };
                if (editKbContent.trim()) body.content = editKbContent;
                const res = await fetch("/api/knowledge", {
                  method: "PUT",
                  headers: { ...authHeaders, "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                if (res.ok) { setEditKbEntry(null); onFetchKnowledge(); }
              } catch { /* silent */ } finally { setKbSaving(false); }
            }}>
              {kbSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
