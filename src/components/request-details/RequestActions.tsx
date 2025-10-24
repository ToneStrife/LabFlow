"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Mail, Package, Receipt } from "lucide-react";
import { SupabaseRequest } from "@/data/types";
import { UseMutationResult } from "@tanstack/react-query";

interface RequestActionsProps {
  request: SupabaseRequest;
  isUpdatingStatus: boolean;
  openApproveRequestDialog: (request: SupabaseRequest) => void;
  handleOpenQuoteAndPODetailsDialog: (request: SupabaseRequest) => void;
  handleSendPORequest: (request: SupabaseRequest) => void;
  openOrderConfirmationDialog: (request: SupabaseRequest) => void;
  handleMarkAsReceived: (request: SupabaseRequest) => Promise<void>;
}

const RequestActions: React.FC<RequestActionsProps> = ({
  request,
  isUpdatingStatus,
  openApproveRequestDialog,
  handleOpenQuoteAndPODetailsDialog,
  handleSendPORequest,
  openOrderConfirmationDialog,
  handleMarkAsReceived,
}) => {
  return (
    <div className="flex justify-end space-x-2 mt-6">
      {request.status === "Pending" && (
        <Button
          onClick={() => openApproveRequestDialog(request)}
          disabled={isUpdatingStatus}
        >
          <CheckCircle className="mr-2 h-4 w-4" /> Approve Request
        </Button>
      )}

      {request.status === "Quote Requested" && (
        <Button
          onClick={() => handleOpenQuoteAndPODetailsDialog(request)}
          disabled={isUpdatingStatus}
        >
          <FileText className="mr-2 h-4 w-4" /> Enter Quote Details & PO Number
        </Button>
      )}

      {request.status === "PO Requested" && (
        <Button
          onClick={() => handleSendPORequest(request)}
          disabled={isUpdatingStatus}
        >
          <Mail className="mr-2 h-4 w-4" /> Send PO Request to Account Manager
        </Button>
      )}

      {(request.status === "PO Requested" && request.po_number) && (
        <Button
          onClick={() => openOrderConfirmationDialog(request)}
          disabled={isUpdatingStatus}
        >
          <Package className="mr-2 h-4 w-4" /> Mark as Ordered
        </Button>
      )}

      {request.status === "Ordered" && (
        <Button
          onClick={() => handleMarkAsReceived(request)}
          disabled={isUpdatingStatus}
        >
          <Receipt className="mr-2 h-4 w-4" /> Mark as Received
        </Button>
      )}
    </div>
  );
};

export default RequestActions;