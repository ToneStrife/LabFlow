"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RequestStatus } from "@/data/types";
import { SupabaseRequest } from "@/hooks/use-requests";
import { Vendor } from "@/hooks/use-vendors";
import { Profile, getFullName } from "@/hooks/use-profiles";
import { AccountManager } from "@/data/types"; // Importar el tipo AccountManager
import { useAccountManagers } from "@/hooks/use-account-managers"; // Usar el nuevo hook
import { format } from "date-fns";
import RequestListActions from "./RequestListActions";
import { useIsMobile } from "@/hooks/use-mobile"; // Importar hook de móvil

interface RequestListTableProps {
  requests: SupabaseRequest[];
  vendors?: Vendor[];
  profiles?: Profile[];
  isUpdatingStatus: boolean;
  onViewDetails: (id: string) => void;
  onApprove: (request: SupabaseRequest) => void;
  onEnterQuoteDetails: (request: SupabaseRequest) => void;
  onSendPORequest: (request: SupabaseRequest) => void;
  onMarkAsOrdered: (request: SupabaseRequest) => void;
  onMarkAsReceived: (request: SupabaseRequest) => void;
  onDeny: (request: SupabaseRequest) => void;
  onCancel: (request: SupabaseRequest) => void;
}

const getStatusBadgeVariant = (status: RequestStatus) => {
  switch (status) {
    case "Pending":
      return "secondary";
    case "Quote Requested":
    case "PO Requested":
      return "destructive";
    case "Ordered":
      return "default";
    case "Received":
      return "success";
    case "Denied":
    case "Cancelled":
      return "destructive";
    default:
      return "secondary";
  }
};

const RequestListTable: React.FC<RequestListTableProps> = ({
  requests,
  vendors,
  profiles,
  ...actionProps
}) => {
  const { data: accountManagers } = useAccountManagers();
  const isMobile = useIsMobile();

  const getRequesterName = (requesterId: string) => {
    const profile = profiles?.find(p => p.id === requesterId);
    return getFullName(profile);
  };

  const getItemDisplay = (items: SupabaseRequest['items']) => {
    if (!items || items.length === 0) return "N/A";
    
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    
    if (isMobile) {
      return (
        <div className="text-xs text-muted-foreground">
          {items.length} artículos ({totalItems} uds)
        </div>
      );
    }

    // Desktop view
    const displayItems = items.slice(0, 2).map(item => 
      <div key={item.id} className="text-xs text-muted-foreground">
        {item.quantity}x {item.product_name}
      </div>
    );
    
    return (
      <div className="space-y-1">
        {displayItems}
        {items.length > 2 && (
          <div className="text-xs font-medium text-primary">
            (+{items.length - 2} más, {totalItems} unidades)
          </div>
        )}
        {items.length <= 2 && (
          <div className="text-xs font-medium text-primary">
            ({totalItems} unidades)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Solicitud</TableHead>
            {!isMobile && <TableHead>Solicitante</TableHead>}
            <TableHead className="min-w-[120px]">Artículos</TableHead>
            <TableHead>Estado</TableHead>
            {!isMobile && <TableHead>Fecha</TableHead>}
            <TableHead className="text-right min-w-[100px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isMobile ? 4 : 6} className="h-24 text-center text-muted-foreground">
                No se encontraron solicitudes que coincidan con tus criterios.
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => {
              const vendor = vendors?.find(v => v.id === request.vendor_id);
              const requesterName = getRequesterName(request.requester_id);
              const date = format(new Date(request.created_at), 'yyyy-MM-dd');
              const displayRequestNumber = request.request_number || request.id.substring(0, 8);

              return (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">{displayRequestNumber}</span>
                      <span className="text-xs text-muted-foreground">{vendor?.name || "N/A"}</span>
                    </div>
                  </TableCell>
                  {!isMobile && <TableCell>{requesterName}</TableCell>}
                  <TableCell className="max-w-[250px]">
                    {getItemDisplay(request.items)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {request.status === "Pending" && "Pendiente"}
                      {request.status === "Quote Requested" && "Cot. Solicitada"}
                      {request.status === "PO Requested" && "PO Solicitado"}
                      {request.status === "Ordered" && "Pedido"}
                      {request.status === "Received" && "Recibido"}
                      {request.status === "Denied" && "Denegada"}
                      {request.status === "Cancelled" && "Cancelada"}
                    </Badge>
                  </TableCell>
                  {!isMobile && <TableCell>{date}</TableCell>}
                  <TableCell>
                    <RequestListActions request={request} {...actionProps} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default RequestListTable;