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
  
  const isManager = profile?.role === "Admin" || profile?.role === "Account Manager";

  if (!isManager) {
    return <p className="text-sm text-muted-foreground italic">No tienes permisos para realizar acciones en esta solicitud.</p>;
  }

  return (
    <div className="flex flex-col space-y-2">
      {/* PENDING: Approve or Request Quote */}
      {request.status === "Pending" && (
        <>
          <Button 
            onClick={() => onSendQuoteRequest(request)} 
            className="w-full justify-start bg-blue-600 hover:bg-blue-700" 
            disabled={isUpdatingStatus}
          >
            <Mail className="mr-2 h-4 w-4" /> Solicitar Cotización (Correo)
          </Button>
          <Button 
            onClick={() => openApproveRequestDialog(request)} 
            className="w-full justify-start bg-green-600 hover:bg-green-700" 
            disabled={isUpdatingStatus}
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Aprobar Solicitud
          </Button>
          <Button 
            variant="outline" 
            onClick={openDenyRequestDialog} 
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50" 
            disabled={isUpdatingStatus}
          >
            <Ban className="mr-2 h-4 w-4" /> Denegar Solicitud
          </Button>
        </>
      )}

      {/* QUOTE REQUESTED: Upload Quote or Send PO Request */}
      {request.status === "Quote Requested" && (
        <>
          {!request.quote_url ? (
            <Button 
              onClick={handleUploadQuote} 
              className="w-full justify-start bg-blue-600 hover:bg-blue-700" 
              disabled={isUpdatingStatus}
            >
              <FileText className="mr-2 h-4 w-4" /> Subir Cotización
            </Button>
          ) : (
            <Button 
              onClick={() => handleSendPORequest(request)} 
              className="w-full justify-start bg-orange-600 hover:bg-orange-700" 
              disabled={isUpdatingStatus}
            >
              <Send className="mr-2 h-4 w-4" /> Solicitar PO (Cómprame)
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={openDenyRequestDialog} 
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50" 
            disabled={isUpdatingStatus}
          >
            <Ban className="mr-2 h-4 w-4" /> Denegar Solicitud
          </Button>
        </>
      )}

      {/* PO REQUESTED: Mark as Ordered */}
      {request.status === "PO Requested" && (
        <>
          <Button 
            onClick={handleUploadPOAndOrder} 
            className="w-full justify-start bg-green-700 hover:bg-green-800" 
            disabled={isUpdatingStatus}
          >
            <Package className="mr-2 h-4 w-4" /> Marcar como Pedido
          </Button>
          <Button 
            variant="outline" 
            onClick={openCancelRequestDialog} 
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50" 
            disabled={isUpdatingStatus}
          >
            <XCircle className="mr-2 h-4 w-4" /> Cancelar Solicitud
          </Button>
        </>
      )}

      {/* ORDERED: Mark as Received or Send Confirmation */}
      {request.status === "Ordered" && (
        <>
          <Button 
            onClick={handleMarkAsReceived} 
            className="w-full justify-start bg-purple-600 hover:bg-purple-700" 
            disabled={isUpdatingStatus}
          >
            <Receipt className="mr-2 h-4 w-4" /> Recibir Artículos
          </Button>
          {request.po_url && (
            <Button 
              variant="outline" 
              onClick={() => handleMarkAsOrderedAndSendEmail(request)} 
              className="w-full justify-start" 
              disabled={isUpdatingStatus}
            >
              <Mail className="mr-2 h-4 w-4" /> Reenviar Confirmación Pedido
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={openCancelRequestDialog} 
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50" 
            disabled={isUpdatingStatus}
          >
            <XCircle className="mr-2 h-4 w-4" /> Cancelar Solicitud
          </Button>
        </>
      )}

      {/* RECEIVED: No actions usually needed here */}
      {request.status === "Received" && (
        <p className="text-sm text-green-600 font-medium flex items-center">
          <CheckCircle className="mr-2 h-4 w-4" /> Solicitud completada y recibida.
        </p>
      )}
    </div>
  );
};

export default RequestActions;