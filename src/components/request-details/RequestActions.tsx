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
  handleUploadQuote: () => void;
  handleUploadPOAndOrder: (request: SupabaseRequest) => void;
  handleMarkAsReceived: (request: SupabaseRequest) => Promise<void>;
  handleMarkAsOrderedAndSendEmail: (request: SupabaseRequest) => void; // New prop
}

const RequestActions: React.FC<RequestActionsProps> = ({
  request,
  isUpdatingStatus,
  openApproveRequestDialog,
  handleSendPORequest,
  handleUploadQuote,
  handleUploadPOAndOrder,
  handleMarkAsReceived,
  handleMarkAsOrderedAndSendEmail,
}) => {
  return (
    <div className="flex justify-end space-x-2 mt-6">
      {request.status === "Pending" && (
        <Button onClick={() => openApproveRequestDialog(request)} disabled={isUpdatingStatus}>
          <CheckCircle className="mr-2 h-4 w-4" /> Approve Request
        </Button>
      )}

      {/* Quote Requested: Upload Quote file. This action automatically transitions to PO Requested and triggers the PO Request email if successful. */}
      {request.status === "Quote Requested" && !request.quote_url && (
        <Button onClick={handleUploadQuote} disabled={isUpdatingStatus}>
          <Upload className="mr-2 h-4 w-4" /> Upload Quote
        </Button>
      )}
      
      {/* PO Requested: 
          1. Send PO Request Email (if quote is available)
          2. Upload PO file (which marks as Ordered)
      */}
      {request.status === "PO Requested" && (
        <>
          {request.quote_url && (
            <Button onClick={() => handleSendPORequest(request)} disabled={isUpdatingStatus} variant="outline">
              <Mail className="mr-2 h-4 w-4" /> Request PO (Email)
            </Button>
          )}
          <Button
            onClick={() => handleUploadPOAndOrder(request)}
            disabled={isUpdatingStatus}
          >
            <Upload className="mr-2 h-4 w-4" /> Upload PO & Mark as Ordered
          </Button>
        </>
      )}

      {/* Ordered: 
          1. Send Order Confirmation Email (if PO is available)
          2. Mark as Received
      */}
      {request.status === "Ordered" && (
        <>
          {request.po_url && (
            <Button onClick={() => handleMarkAsOrderedAndSendEmail(request)} disabled={isUpdatingStatus} variant="outline">
              <Mail className="mr-2 h-4 w-4" /> Send Order Email
            </Button>
          )}
          <Button onClick={() => handleMarkAsReceived(request)} disabled={isUpdatingStatus}>
            <Receipt className="mr-2 h-4 w-4" /> Mark as Received
          </Button>
        </>
      )}
    </div>
  );
};

export default RequestActions;