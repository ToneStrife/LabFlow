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
  handleMarkAsReceived: (request: SupabaseRequest) => void; // Cambiado a void para abrir el diálogo
  handleMarkAsOrderedAndSendEmail: (request: SupabaseRequest) => void; 
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
    <div className="flex flex-col space-y-2"> {/* Cambiado a columna vertical */}
      {request.status === "Pending" && (
        <Button onClick={() => openApproveRequestDialog(request)} disabled={isUpdatingStatus}>
          <CheckCircle className="mr-2 h-4 w-4" /> Aprobar Solicitud
        </Button>
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
        </>
      )}
      
      {/* PO Requested: Upload PO file (which marks as Ordered) */}
      {request.status === "PO Requested" && (
        <Button
          onClick={() => handleUploadPOAndOrder(request)}
          disabled={isUpdatingStatus}
        >
          <Upload className="mr-2 h-4 w-4" /> Subir PO y Marcar como Pedido
        </Button>
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
        </>
      )}
    </div>
  );
};

export default RequestActions;