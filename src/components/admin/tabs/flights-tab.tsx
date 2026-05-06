"use client";

import React from "react";
import {
  Search,
  Plane,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFlightStatusBadge, formatTime, LoadingSpinner } from "../helpers";
import type { ApiFlight } from "../types";

interface FlightsTabProps {
  flights: ApiFlight[];
  loading: boolean;
  filter: string;
  setFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}

export default function FlightsTab({
  flights,
  loading,
  filter,
  setFilter,
  search,
  setSearch,
}: FlightsTabProps) {
  return (
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                <Button
                  variant={filter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  Tous
                </Button>
                <Button
                  variant={filter === "depart" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("depart")}
                >
                  <Plane className="h-3.5 w-3.5 mr-1 rotate-[25deg]" />
                  Départs
                </Button>
                <Button
                  variant={filter === "arrivee" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("arrivee")}
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
            {loading ? (
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
  );
}
