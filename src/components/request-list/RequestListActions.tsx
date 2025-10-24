"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, Package, Receipt, Mail, FileText } from "lucide-react";
import { SupabaseRequest } from "@/hooks/use-requests";

interface RequestListActionsProps {
  request: SupabaseRequest;
  isUpdatingStatus: boolean;
  onViewDetails: (id: string) => void;
  onApprove: (request: SupabaseRequest) => void;
  onEnterQuoteDetails: (request: SupabaseRequest) => void;
  onSendPORequest: (request: SupabaseRequest) => void;
  onMarkAsOrdered: (request: SupabaseRequest) => void;
  onMarkAsReceived: (request: SupabaseRequest) => void;
}

const RequestListActions: React.FC<RequestListActionsProps> = ({
  request,
  isUpdatingStatus,
  onViewDetails,
  onApprove,
  onEnterQuoteDetails,
  onSendPORequest,
  onMarkAsOrdered,
  onMarkAsReceived,
}) => {
  return (
    <div className="text-right flex justify-end space-x-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewDetails(request.id)}
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {request.status === "Pending" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onApprove(request)}
          title="Approve Request"
          disabled={isUpdatingStatus}
        >
          <CheckCircle className="h-4 w-4 text-green-600" />
        </Button>
      )}

      {request.status === "Quote Requested" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEnterQuoteDetails(request)}
          title="Enter Quote Details & PO Number"
          disabled={isUpdatingStatus}
        >
          <FileText className="h-4 w-4 text-blue-600" />
        </Button>
      )}

      {request.status === "PO Requested" && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSendPORequest(request)}
            title="Send PO Request to Account Manager"
            disabled={isUpdatingStatus}
          >
            <Mail className="h-4 w-4 text-orange-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMarkAsOrdered(request)}
            title={!request.po_number ? "A PO number is required to mark as ordered" : "Mark as Ordered"}
            disabled={isUpdatingStatus || !request.po_number}
          >
            <Package className="h-4 w-4 text-blue-600" />
          </Button>
        </>
      )}

      {request.status === "Ordered" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMarkAsReceived(request)}
          title="Mark as Received"
          disabled={isUpdatingStatus}
        >
          <Receipt className="h-4 w-4 text-purple-600" />
        </Button>
      )}
    </div>
  );
};

export default RequestListActions;