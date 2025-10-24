"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, Package, Receipt } from "lucide-react";
import { SupabaseRequest } from "@/data/types";

interface RequestActionsProps {
  request: SupabaseRequest;
  isUpdatingStatus: boolean;
  openApproveRequestDialog: (request: SupabaseRequest) => void;
  handleSendPORequest: (request: SupabaseRequest) => void;
  openOrderConfirmationDialog: (request: SupabaseRequest) => void;
  handleMarkAsReceived: (request: SupabaseRequest) => Promise<void>;
}

const RequestActions: React.FC<RequestActionsProps> = ({
  request,
  isUpdatingStatus,
  openApproveRequestDialog,
  handleSendPORequest,
  openOrderConfirmationDialog,
  handleMarkAsReceived,
}) => {
  return (
    <div className="flex justify-end space-x-2 mt-6">
      {request.status === "Pending" && (
        <Button onClick={() => openApproveRequestDialog(request)} disabled={isUpdatingStatus}>
          <CheckCircle className="mr-2 h-4 w-4" /> Approve Request
        </Button>
      )}

      {request.status === "Quote Requested" && request.quote_url && (
        <Button onClick={() => handleSendPORequest(request)} disabled={isUpdatingStatus}>
          <Mail className="mr-2 h-4 w-4" /> Request PO from Manager
        </Button>
      )}

      {request.status === "PO Requested" && (
        <Button
          onClick={() => openOrderConfirmationDialog(request)}
          disabled={isUpdatingStatus || !request.po_url}
          title={!request.po_url ? "A PO file is required to mark as ordered" : "Mark as Ordered"}
        >
          <Package className="mr-2 h-4 w-4" /> Mark as Ordered
        </Button>
      )}

      {request.status === "Ordered" && (
        <Button onClick={() => handleMarkAsReceived(request)} disabled={isUpdatingStatus}>
          <Receipt className="mr-2 h-4 w-4" /> Mark as Received
        </Button>
      )}
    </div>
  );
};

export default RequestActions;