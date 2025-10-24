"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, Package, Receipt, Upload } from "lucide-react";
import { SupabaseRequest } from "@/data/types";

interface RequestActionsProps {
  request: SupabaseRequest;
  isUpdatingStatus: boolean;
  openApproveRequestDialog: (request: SupabaseRequest) => void;
  handleSendPORequest: (request: SupabaseRequest) => void;
  handleUploadQuote: () => void; // New prop
  handleUploadPOAndOrder: (request: SupabaseRequest) => void;
  handleMarkAsReceived: (request: SupabaseRequest) => Promise<void>;
}

const RequestActions: React.FC<RequestActionsProps> = ({
  request,
  isUpdatingStatus,
  openApproveRequestDialog,
  handleSendPORequest,
  handleUploadQuote,
  handleUploadPOAndOrder,
  handleMarkAsReceived,
}) => {
  return (
    <div className="flex justify-end space-x-2 mt-6">
      {request.status === "Pending" && (
        <Button onClick={() => openApproveRequestDialog(request)} disabled={isUpdatingStatus}>
          <CheckCircle className="mr-2 h-4 w-4" /> Approve Request
        </Button>
      )}

      {/* If Quote Requested, allow uploading the Quote file */}
      {request.status === "Quote Requested" && !request.quote_url && (
        <Button onClick={handleUploadQuote} disabled={isUpdatingStatus}>
          <Upload className="mr-2 h-4 w-4" /> Upload Quote & Request PO
        </Button>
      )}
      
      {/* If Quote is uploaded, allow requesting PO from Manager (Email) */}
      {request.status === "Quote Requested" && request.quote_url && (
        <Button onClick={() => handleSendPORequest(request)} disabled={isUpdatingStatus}>
          <Mail className="mr-2 h-4 w-4" /> Request PO from Manager
        </Button>
      )}

      {/* If PO Requested, allow uploading the PO file and marking as Ordered */}
      {request.status === "PO Requested" && (
        <Button
          onClick={() => handleUploadPOAndOrder(request)}
          disabled={isUpdatingStatus}
        >
          <Upload className="mr-2 h-4 w-4" /> Upload PO & Mark as Ordered
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