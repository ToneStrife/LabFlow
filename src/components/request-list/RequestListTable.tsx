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
      return "default";
    case "Received":
      return "success";
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

  const getAccountManagerName = (managerId: string | null) => {
    if (!managerId) return "N/A";
    const manager = accountManagers?.find(am => am.id === managerId); // Buscar en la nueva lista de Account Managers
    return manager ? `${manager.first_name} ${manager.last_name}` : "N/A";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Account Manager</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No requests found matching your criteria.
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => {
              const vendor = vendors?.find(v => v.id === request.vendor_id);
              const requesterName = getRequesterName(request.requester_id);
              const accountManagerName = getAccountManagerName(request.account_manager_id);
              const date = format(new Date(request.created_at), 'yyyy-MM-dd');

              return (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{vendor?.name || "N/A"}</TableCell>
                  <TableCell>{requesterName}</TableCell>
                  <TableCell>{accountManagerName}</TableCell>
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