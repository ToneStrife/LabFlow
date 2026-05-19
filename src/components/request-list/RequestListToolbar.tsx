"use client";

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestStatus } from "@/data/types";

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
            : "Buscar solicitudes (producto, catálogo, marca, proveedor, solicitante, gerente, cotización, PO)..."
        }
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1"
      />
      <Select value={filterStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filtrar por Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">Todos los Estados</SelectItem>
          <SelectItem value="Active">Activas (Excl. Recibidas)</SelectItem> {/* Nuevo filtro */}
          <SelectItem value="Pending">Pendiente</SelectItem>
          <SelectItem value="Quote Requested">Cotización Solicitada</SelectItem>
          <SelectItem value="PO Requested">PO Solicitado (Cómprame)</SelectItem>
          <SelectItem value="Ordered">Pedido</SelectItem>
          <SelectItem value="Received">Recibido</SelectItem>
          <SelectItem value="Denied">Denegada</SelectItem>
          <SelectItem value="Cancelled">Cancelada</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default RequestListToolbar;