"use client";

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestStatus } from "@/data/types";
import { getRequestStatusLabelLong, REQUEST_STATUS_ORDER } from "@/lib/request-status";

interface RequestListToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterStatus: RequestStatus | "All" | "Active"; // Added "Active"
  onStatusChange: (status: RequestStatus | "All" | "Active") => void; // Added "Active"
}

const RequestListToolbar: React.FC<RequestListToolbarProps> = ({
  searchTerm,
  onSearchChange,
  filterStatus,
  onStatusChange,
}) => {
  const isMobile = useIsMobile();
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Input
        placeholder={
          isMobile
            ? "Buscar solicitudes..."
            : "Buscar solicitudes (producto, catálogo, marca, proveedor, solicitante, gerente, presupuesto, PO)..."
        }
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1"
      />
      <Select value={filterStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[260px]">
          <SelectValue placeholder="Filtrar por Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">Todos los Estados</SelectItem>
          <SelectItem value="Active">Activas (Excl. Recibidas)</SelectItem> {/* Nuevo filtro */}
          {REQUEST_STATUS_ORDER.map((status) => (
            <SelectItem key={status} value={status}>{getRequestStatusLabelLong(status)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default RequestListToolbar;