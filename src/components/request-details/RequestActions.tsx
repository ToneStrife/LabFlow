"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Package, 
  Receipt, 
  Mail, 
  FileText, 
  Ban, 
  XCircle,
  Send
} from "lucide-react";
import { SupabaseRequest } from "@/data/types";
import { useSession } from "@/components/SessionContextProvider";
import { canApprovePendingRequest, canPerformWorkflowAction, canReceivePackages } from "@/lib/permissions";

interface RequestActionsProps {
  request: SupabaseRequest;
  isUpdatingStatus: boolean;
  openApproveRequestDialog: (request: SupabaseRequest) => void;
  handleSendPORequest: (request: SupabaseRequest) => void;
  handleUploadQuote: () => void;
  handleUploadPOAndOrder: () => void;
  handleMarkAsReceived: () => void;
  handleMarkAsOrderedAndSendEmail: (request: SupabaseRequest) => void;
  openDenyRequestDialog: () => void;
  openCancelRequestDialog: () => void;
  onSendQuoteRequest: (request: SupabaseRequest) => void;
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
  openDenyRequestDialog,
  openCancelRequestDialog,
  onSendQuoteRequest,
}) => {
  const { profile } = useSession();
  const role = profile?.role;
  const canApprove = canApprovePendingRequest(role);
  const canWorkflow = canPerformWorkflowAction(role, request.status);
  const canReceive = canReceivePackages(role, request.status);

  if (request.status === "Pending" && !canApprove) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Pendiente de aprobación por un administrador.
      </p>
    );
  }

  if (!canWorkflow && request.status !== "Received") {
    return (
      <p className="text-sm text-muted-foreground italic">
        No tienes permisos para realizar acciones en esta solicitud.
      </p>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      {/* PENDING: Approve or Request Quote — Admin only */}
      {request.status === "Pending" && canApprove && (
        <>
          <Button 
            onClick={() => onSendQuoteRequest(request)} 
            className="w-full justify-start" 
            disabled={isUpdatingStatus}
          >
            <Mail className="mr-2 h-4 w-4" /> Solicitar Cotización (Correo)
          </Button>
          <Button 
            onClick={() => openApproveRequestDialog(request)} 
            className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600" 
            disabled={isUpdatingStatus}
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Aprobar Solicitud
          </Button>
          <Button 
            variant="outline" 
            onClick={openDenyRequestDialog} 
            className="w-full justify-start text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50" 
            disabled={isUpdatingStatus}
          >
            <Ban className="mr-2 h-4 w-4" /> Denegar Solicitud
          </Button>
        </>
      )}

      {/* QUOTE REQUESTED: Upload Quote or Send PO Request */}
      {request.status === "Quote Requested" && canWorkflow && (
        <>
          {!request.quote_url ? (
            <Button 
              onClick={handleUploadQuote} 
              className="w-full justify-start" 
              disabled={isUpdatingStatus}
            >
              <FileText className="mr-2 h-4 w-4" /> Subir Cotización
            </Button>
          ) : (
            <Button 
              onClick={() => handleSendPORequest(request)} 
              className="w-full justify-start" 
              disabled={isUpdatingStatus}
            >
              <Send className="mr-2 h-4 w-4" /> Solicitar PO (Cómprame)
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={openDenyRequestDialog} 
            className="w-full justify-start text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50" 
            disabled={isUpdatingStatus}
          >
            <Ban className="mr-2 h-4 w-4" /> Denegar Solicitud
          </Button>
        </>
      )}

      {/* PO REQUESTED: Mark as Ordered */}
      {request.status === "PO Requested" && canWorkflow && (
        <>
          <Button 
            onClick={handleUploadPOAndOrder} 
            className="w-full justify-start" 
            disabled={isUpdatingStatus}
          >
            <Package className="mr-2 h-4 w-4" /> Marcar como Pedido
          </Button>
          <Button 
            variant="outline" 
            onClick={openCancelRequestDialog} 
            className="w-full justify-start text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50" 
            disabled={isUpdatingStatus}
          >
            <XCircle className="mr-2 h-4 w-4" /> Cancelar Solicitud
          </Button>
        </>
      )}

      {/* ORDERED: Mark as Received or Send Confirmation */}
      {request.status === "Ordered" && canReceive && (
        <>
          <Button 
            onClick={handleMarkAsReceived} 
            className="w-full justify-start" 
            disabled={isUpdatingStatus}
          >
            <Receipt className="mr-2 h-4 w-4" /> Recibir Artículos
          </Button>
          {request.po_url && canWorkflow && (
            <Button 
              variant="outline" 
              onClick={() => handleMarkAsOrderedAndSendEmail(request)} 
              className="w-full justify-start" 
              disabled={isUpdatingStatus}
            >
              <Mail className="mr-2 h-4 w-4" /> Reenviar Confirmación Pedido
            </Button>
          )}
          {canWorkflow && (
            <Button 
              variant="outline" 
              onClick={openCancelRequestDialog} 
              className="w-full justify-start text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50" 
              disabled={isUpdatingStatus}
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancelar Solicitud
            </Button>
          )}
        </>
      )}

      {/* RECEIVED: No actions usually needed here */}
      {request.status === "Received" && (
        <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center">
          <CheckCircle className="mr-2 h-4 w-4" /> Solicitud completada y recibida.
        </p>
      )}
    </div>
  );
};

export default RequestActions;
