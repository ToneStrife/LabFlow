"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, Package, Receipt, Upload, XCircle, Ban } from "lucide-react";
import { SupabaseRequest } from "@/data/types";

interface RequestActionsProps {
  request: SupabaseRequest;
  isUpdatingStatus: boolean;
  openApproveRequestDialog: (request: SupabaseRequest) => void;
  handleSendPORequest: (request: SupabaseRequest) => void;
  handleUploadQuote: () => void;
  handleUploadPOAndOrder: (request: SupabaseRequest) => void;
  handleMarkAsReceived: (request: SupabaseRequest) => void;
  handleMarkAsOrderedAndSendEmail: (request: SupabaseRequest) => void;
  // Nuevas acciones
  openDenyRequestDialog: (request: SupabaseRequest) => void;
  openCancelRequestDialog: (request: SupabaseRequest) => void;
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
}) => {
  return (
    <div className="flex flex-col space-y-2"> {/* Cambiado a columna vertical */}
      {request.status === "Pending" && (
        <>
          <Button onClick={() => openApproveRequestDialog(request)} disabled={isUpdatingStatus}>
            <CheckCircle className="mr-2 h-4 w-4" /> Aprobar Solicitud
          </Button>
          <Button onClick={() => openDenyRequestDialog(request)} disabled={isUpdatingStatus} variant="destructive">
            <Ban className="mr-2 h-4 w-4" /> Denegar Solicitud
          </Button>
        </>
      )}

      {/* Quote Requested: Upload Quote file OR Send PO Request Email */}
      {request.status === "Quote Requested" && (
        <>
          {!request.quote_url ? (
            <Button onClick={handleUploadQuote} disabled={isUpdatingStatus}>
              <Upload className="mr-2 h-4 w-4" /> Subir Cotización
            </Button>
          ) : (
            <Button onClick={() => handleSendPORequest(request)} disabled={isUpdatingStatus} variant="outline">
              <Mail className="mr-2 h-4 w-4" /> Solicitar PO (Correo)
            </Button>
          )}
          <Button onClick={() => openDenyRequestDialog(request)} disabled={isUpdatingStatus} variant="destructive">
            <Ban className="mr-2 h-4 w-4" /> Denegar Solicitud
          </Button>
        </>
      )}
      
      {/* PO Requested: Upload PO file (which marks as Ordered) */}
      {request.status === "PO Requested" && (
        <>
          <Button
            onClick={() => handleUploadPOAndOrder(request)}
            disabled={isUpdatingStatus}
          >
            <Upload className="mr-2 h-4 w-4" /> Subir PO y Marcar como Pedido
          </Button>
          <Button onClick={() => openCancelRequestDialog(request)} disabled={isUpdatingStatus} variant="destructive">
            <XCircle className="mr-2 h-4 w-4" /> Cancelar Solicitud
          </Button>
        </>
      )}

      {/* Ordered: Send Order Confirmation Email OR Receive Items */}
      {request.status === "Ordered" && (
        <>
          {request.po_url && (
            <Button onClick={() => handleMarkAsOrderedAndSendEmail(request)} disabled={isUpdatingStatus} variant="outline">
              <Mail className="mr-2 h-4 w-4" /> Enviar Correo de Pedido
            </Button>
          )}
          <Button onClick={() => handleMarkAsReceived(request)} disabled={isUpdatingStatus}>
            <Receipt className="mr-2 h-4 w-4" /> Recibir Artículos
          </Button>
          <Button onClick={() => openCancelRequestDialog(request)} disabled={isUpdatingStatus} variant="destructive">
            <XCircle className="mr-2 h-4 w-4" /> Cancelar Solicitud
          </Button>
        </>
      )}
    </div>
  );
};

export default RequestActions;