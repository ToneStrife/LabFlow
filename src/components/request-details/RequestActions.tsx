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
import { useCan } from "@/hooks/use-permissions";
import { useProjects } from "@/hooks/use-projects";
import {
  canApprovePendingRequest,
  canPerformWorkflowAction,
  canReceivePackages,
} from "@/lib/permissions";
interface RequestActionsProps {
  request: SupabaseRequest;
  isUpdatingStatus: boolean;
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
  handleSendPORequest,
  handleUploadQuote,
  handleUploadPOAndOrder,
  handleMarkAsReceived,
  handleMarkAsOrderedAndSendEmail,
  openDenyRequestDialog,
  openCancelRequestDialog,
  onSendQuoteRequest,
}) => {
  const { profile, session } = useSession();
  const { can } = useCan();
  const { data: projects } = useProjects();
  const approvalCtx = {
    role: profile?.role,
    userId: session?.user?.id,
    can,
    projectCodes: request.project_codes,
    projects,
  };
  const canApprove = canApprovePendingRequest(approvalCtx);
  const canWorkflow = canPerformWorkflowAction(approvalCtx, request.status);
  const canReceive = canReceivePackages(profile?.role, request.status);

  if (request.status === "Pending" && !canApprove) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Pendiente de presupuesto. Lo revisa el IP del proyecto o un administrador.
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
      {/* PENDING: pedir presupuesto (o enviar el Cómprame si ya hay presupuesto) */}
      {request.status === "Pending" && canApprove && (
        <>
          {request.quote_url ? (
            <Button 
              onClick={() => handleSendPORequest(request)} 
              className="w-full justify-start" 
              disabled={isUpdatingStatus}
            >
              <Send className="mr-2 h-4 w-4" /> Solicitar PO (Cómprame)
            </Button>
          ) : (
            <Button 
              onClick={() => onSendQuoteRequest(request)} 
              className="w-full justify-start" 
              disabled={isUpdatingStatus}
            >
              <Mail className="mr-2 h-4 w-4" /> Solicitar presupuesto
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

      {/* QUOTE REQUESTED: Upload Quote or Send PO Request */}
      {request.status === "Quote Requested" && canWorkflow && (
        <>
          {!request.quote_url ? (
            <Button 
              onClick={handleUploadQuote} 
              className="w-full justify-start" 
              disabled={isUpdatingStatus}
            >
              <FileText className="mr-2 h-4 w-4" /> Subir presupuesto
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
