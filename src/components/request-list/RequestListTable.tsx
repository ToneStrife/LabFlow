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
}

const getStatusBadgeVariant = (status: RequestStatus) => {
  switch (status) {
    case "Pending":
      return "secondary";
    case "Quote Requested":
      return "outline";
    case "PO Requested":
      return "destructive";
    case "Ordered":
    case "Received":
      return "default";
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
  const { data: accountManagers } = useAccountManagers(); // Usar el nuevo hook

  const getRequesterName = (requesterId: string) => {
    const profile = profiles?.find(p => p.id === requesterId);
    return getFullName(profile);
  };

  const getItemDisplay = (items: SupabaseRequest['items']) => {
    if (!items || items.length === 0) return "N/A";
    
    // Mostrar hasta 2 ítems y el total
    const displayItems = items.slice(0, 2).map(item => 
      <div key={item.id} className="text-xs text-muted-foreground">
        {item.quantity}x {item.product_name}
      </div>
    );
    
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request #</TableHead> {/* Nueva columna */}
            <TableHead>Vendor</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No requests found matching your criteria.
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
                  <TableCell className="font-medium">{displayRequestNumber}</TableCell> {/* Mostrar Request # */}
                  <TableCell className="font-medium">{vendor?.name || "N/A"}</TableCell>
                  <TableCell>{requesterName}</TableCell>
                  <TableCell className="max-w-[250px]">
                    {getItemDisplay(request.items)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{date}</TableCell>
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