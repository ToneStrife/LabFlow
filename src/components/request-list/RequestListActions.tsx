"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, Package, Receipt, Mail, FileText, Ban, XCircle, Combine } from "lucide-react";
import { SupabaseRequest } from "@/data/types"; // Corrected import

interface RequestListActionsProps {
  request: SupabaseRequest;
  isUpdatingStatus: boolean;
  onViewDetails: (id: string) => void;
  onApprove: (request: SupabaseRequest) => void;
  onEnterQuoteDetails: (request: SupabaseRequest) => void;
  onSendPORequest: (request: SupabaseRequest) => void;
  onMarkAsOrdered: (request: SupabaseRequest) => void;
  onMarkAsReceived: (request: SupabaseRequest) => void;
  onDeny: (request: SupabaseRequest) => void;
  onCancel: (request: SupabaseRequest) => void;
  onMerge: (request: SupabaseRequest) => void; // Nueva acción
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
  onDeny,
  onCancel,
  onMerge, // Desestructurar la nueva acción
}) => {
  // Permitir fusión solo en estado Pendiente
  const isMergeAllowed = request.status === "Pending";

  return (
    <div className="text-right flex justify-end space-x-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewDetails(request.id)}
        title="Ver Detalles"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {/* Merge Action (Disponible solo en Pending) */}
      {isMergeAllowed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMerge(request)}
          title="Fusionar con otra solicitud"
          disabled={isUpdatingStatus}
        >
          <Combine className="h-4 w-4 text-purple-600" />
        </Button>
      )}

      {request.status === "Pending" && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onApprove(request)}
            title="Aprobar Solicitud"
            disabled={isUpdatingStatus}
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeny(request)}
            title="Denegar Solicitud"
            disabled={isUpdatingStatus}
          >
            <Ban className="h-4 w-4 text-red-600" />
          </Button>
        </>
      )}

      {/* Quote Requested: Upload Quote file, ONLY if quote is missing */}
      {request.status === "Quote Requested" && !request.quote_url && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEnterQuoteDetails(request)}
            title="Subir Archivo de Cotización"
            disabled={isUpdatingStatus}
          >
            <FileText className="h-4 w-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeny(request)}
            title="Denegar Solicitud"
            disabled={isUpdatingStatus}
          >
            <Ban className="h-4 w-4 text-red-600" />
          </Button>
        </>
      )}
      
      {/* Quote Requested: If quote is present, show action to send PO Request (if manager is assigned) */}
      {request.status === "Quote Requested" && request.quote_url && request.account_manager_id && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSendPORequest(request)}
          title="Enviar Solicitud de PO al Gerente de Cuenta"
          disabled={isUpdatingStatus}
        >
          <Mail className="h-4 w-4 text-orange-600" />
        </Button>
      )}

      {request.status === "PO Requested" && (
        <>
          {/* Mark as Ordered: Redirect to details to upload PO file */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMarkAsOrdered(request)}
            title="Subir PO y Marcar como Pedido"
            disabled={isUpdatingStatus}
          >
            <Package className="h-4 w-4 text-green-700" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCancel(request)}
            title="Cancelar Solicitud"
            disabled={isUpdatingStatus}
          >
            <XCircle className="h-4 w-4 text-red-600" />
          </Button>
        </>
      )}

      {request.status === "Ordered" && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMarkAsReceived(request)} // Pasa el request completo
            title="Marcar como Recibido"
            disabled={isUpdatingStatus}
          >
            <Receipt className="h-4 w-4 text-purple-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCancel(request)}
            title="Cancelar Solicitud"
            disabled={isUpdatingStatus}
          >
            <XCircle className="h-4 w-4 text-red-600" />
          </Button>
        </>
      )}
    </div>
  );
};

export default RequestListActions;