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
import { RequestStatus, SupabaseRequest, Vendor, Profile } from "@/data/types";
import { useAccountManagers } from "@/hooks/use-account-managers";
import { format } from "date-fns";
import RequestListActions from "./RequestListActions";
import { useIsMobile } from "@/hooks/use-mobile";
import { getFullName } from "@/hooks/use-profiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  onMerge: (request: SupabaseRequest) => void;
  onSendQuoteRequest: (request: SupabaseRequest) => void;
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

const RequestCard: React.FC<{ request: SupabaseRequest; vendor?: Vendor; requesterName: string; date: string; actionProps: Omit<RequestListTableProps, 'requests' | 'vendors' | 'profiles'> }> = ({
  request,
  vendor,
  requesterName,
  date,
  actionProps,
}) => {
  const totalItems = request.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const displayRequestNumber = request.request_number || request.id.substring(0, 8);

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
        <CardTitle className="text-lg font-bold flex flex-col">
          <span className="text-sm text-primary">Solicitud {displayRequestNumber}</span>
          <span className="text-xs font-medium text-muted-foreground">{vendor?.name || "N/A"}</span>
        </CardTitle>
        <Badge variant={getStatusBadgeVariant(request.status)} className="text-xs">
          {request.status === "Pending" && "Pendiente"}
          {request.status === "Quote Requested" && "Cot. Solicitada"}
          {request.status === "PO Requested" && "PO Solicitado"}
          {request.status === "Ordered" && "Pedido"}
          {request.status === "Received" && "Recibido"}
          {request.status === "Denied" && "Denegada"}
          {request.status === "Cancelled" && "Cancelada"}
        </Badge>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="grid grid-cols-2 text-sm">
          <div>
            <p className="text-muted-foreground">Solicitante</p>
            <p className="font-medium">{requesterName}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Fecha</p>
            <p className="font-medium">{date}</p>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <p className="text-muted-foreground text-sm mb-1">Artículos ({request.items?.length || 0} tipos, {totalItems} uds)</p>
          <ul className="text-xs space-y-0.5 max-h-12 overflow-hidden">
            {request.items?.slice(0, 2).map(item => (
              <li key={item.id} className="truncate">
                {item.quantity}x {item.product_name} ({item.catalog_number})
              </li>
            ))}
            {request.items && request.items.length > 2 && (
              <li className="text-primary font-medium">... y {request.items.length - 2} más</li>
            )}
          </ul>
        </div>
        
        <div className="flex justify-end pt-2">
          <RequestListActions request={request} {...actionProps} />
        </div>
      </CardContent>
    </Card>
  );
};


const RequestListTable: React.FC<RequestListTableProps> = ({
  requests,
  vendors,
  profiles,
  onSendQuoteRequest,
  ...actionProps
}) => {
  const { data: accountManagers } = useAccountManagers();
  const isMobile = useIsMobile();

  const getRequesterName = (requesterId: string) => {
    const profile = profiles?.find(p => p.id === requesterId);
    return getFullName(profile);
  };

  // Renderizado de la tabla para escritorio
  const renderTable = () => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Solicitud</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead className="min-w-[120px]">Artículos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right min-w-[100px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No se encontraron solicitudes que coincidan con tus criterios.
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => {
              const vendor = vendors?.find(v => v.id === request.vendor_id);
              const requesterName = getRequesterName(request.requester_id);
              const date = format(new Date(request.created_at), 'yyyy-MM-dd');
              const displayRequestNumber = request.request_number || request.id.substring(0, 8);
              
              const totalItems = request.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
              const displayItems = request.items?.slice(0, 2).map(item => 
                <div key={item.id} className="text-xs text-muted-foreground">
                  {item.quantity}x {item.product_name}
                </div>
              );

              return (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">{displayRequestNumber}</span>
                      <span className="text-xs text-muted-foreground">{vendor?.name || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{requesterName}</TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="space-y-1">
                      {displayItems}
                      {request.items && request.items.length > 2 && (
                        <div className="text-xs font-medium text-primary">
                          (+{request.items.length - 2} más, {totalItems} unidades)
                        </div>
                      )}
                      {request.items && request.items.length <= 2 && (
                        <div className="text-xs font-medium text-primary">
                          ({totalItems} unidades)
                        </div>
                      )}
                    </div>
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
                  <TableCell>{date}</TableCell>
                  <TableCell>
                    <RequestListActions request={request} onSendQuoteRequest={onSendQuoteRequest} {...actionProps} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  // Renderizado de tarjetas para móvil
  const renderCards = () => (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="h-24 text-center text-muted-foreground flex items-center justify-center border rounded-md">
          No se encontraron solicitudes que coincidan con tus criterios.
        </div>
      ) : (
        requests.map((request) => {
          const vendor = vendors?.find(v => v.id === request.vendor_id);
          const requesterName = getRequesterName(request.requester_id);
          const date = format(new Date(request.created_at), 'yyyy-MM-dd');

          return (
            <RequestCard
              key={request.id}
              request={request}
              vendor={vendor}
              requesterName={requesterName}
              date={date}
              actionProps={{ ...actionProps, onSendQuoteRequest }}
            />
          );
        })
      )}
    </div>
  );

  return isMobile ? renderCards() : renderTable();
};

export default RequestListTable;