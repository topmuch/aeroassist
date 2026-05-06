"use client";

import React, { useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
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
import { getRoleBadge, LoadingSpinner } from "../helpers";
import type { ApiUser, PaginationInfo } from "../types";

interface UsersTabProps {
  users: ApiUser[];
  loading: boolean;
  pagination: PaginationInfo;
  search: string;
  setSearch: (v: string) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
  onFetchUsers: () => void;
  onSetUsers: React.Dispatch<React.SetStateAction<ApiUser[]>>;
}

export default function UsersTab({
  users,
  loading,
  pagination,
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  page,
  setPage,
  onFetchUsers,
  onSetUsers,
}: UsersTabProps) {
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserRole, setNewUserRole] = useState("traveler");
  const [userCreating, setUserCreating] = useState(false);

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
                  placeholder="Rechercher par nom ou email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v);
                  setPage(1);
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
                  <Button onClick={() => {
                    setNewUserName("");
                    setNewUserEmail("");
                    setNewUserPhone("");
                    setNewUserRole("traveler");
                  }}>
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
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Ex: Jean Dupont"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-email">Email</Label>
                      <Input
                        id="user-email"
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="Ex: jean.dupont@email.fr"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-phone">Téléphone</Label>
                      <Input
                        id="user-phone"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        placeholder="Ex: +33 6 12 34 56 78"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Rôle</Label>
                        <Select value={newUserRole} onValueChange={setNewUserRole}>
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
                    <Button disabled={userCreating} onClick={async () => {
                      if (!newUserName || !newUserEmail) return;
                      setUserCreating(true);
                      try {
                        const res = await fetch("/api/users", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name: newUserName, email: newUserEmail, phone: newUserPhone || null, role: newUserRole, language: "fr" }),
                        });
                        if (res.ok) {
                          setUserDialogOpen(false);
                          setNewUserName("");
                          setNewUserEmail("");
                          setNewUserPhone("");
                          setNewUserRole("traveler");
                          onFetchUsers();
                        }
                      } catch { /* silent */ } finally { setUserCreating(false); }
                    }}>
                      {userCreating ? "Création..." : "Créer l&apos;utilisateur"}
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
            {loading ? (
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
                              onSetUsers((prev) =>
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
                                onSetUsers((prev) =>
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
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => alert("Fonctionnalité de modification en cours de développement")}>
                              <Edit className="h-3.5 w-3.5" />
                              <span className="sr-only">Modifier</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              onClick={() => {
                                if (confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
                                  fetch("/api/users", {
                                    method: "DELETE",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: user.id }),
                                  }).then((res) => { if (res.ok) onFetchUsers(); });
                                }
                              }}
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
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {pagination.total} utilisateur(s) &middot; Page{" "}
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
                    Math.min(
                      page - 2,
                      pagination.totalPages - 4
                    )
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
