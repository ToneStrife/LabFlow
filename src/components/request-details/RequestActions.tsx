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
  canGivePurchaseOrder,
  canReceivePackages,
  isRequestAuthor,
} from "@/lib/permissions";
interface RequestActionsProps {
  request: SupabaseRequest;
  isUpdatingStatus: boolean;
  handleUploadQuote: () => void;
  handleUploadPOAndOrder: () => void;
  handleRegisterPo: () => void;
  handleMarkAsReceived: () => void;
  handleMarkAsOrderedAndSendEmail: (request: SupabaseRequest) => void;
  openDenyRequestDialog: () => void;
  openCancelRequestDialog: () => void;
  onSendQuoteRequest: (request: SupabaseRequest) => void;
}

const RequestActions: React.FC<RequestActionsProps> = ({
  request,
  isUpdatingStatus,
  handleUploadQuote,
  handleUploadPOAndOrder,
  handleRegisterPo,
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
    requesterId: request.requester_id,
  };
  const daElPo = canGivePurchaseOrder(approvalCtx);
  const esAutor = isRequestAuthor(approvalCtx);
  const puedeSeguir = esAutor || daElPo;
  const puedeDenegar = canApprovePendingRequest(approvalCtx);
  const canReceive = canReceivePackages(profile?.role, request.status);
  const tienePresupuesto = Boolean(request.quote_url);
  const tienePo = Boolean(request.po_url || request.po_number);
  const antesDelPedido =
    request.status === "Pending" ||
    request.status === "Quote Requested" ||
    request.status === "PO Requested";

  const cerrar = (
    <Button
      variant="outline"
      onClick={request.status === "Pending" || request.status === "Quote Requested" ? openDenyRequestDialog : openCancelRequestDialog}
      className="w-full justify-start text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50"
      disabled={isUpdatingStatus}
    >
      {request.status === "Pending" || request.status === "Quote Requested" ? (
        <><Ban className="mr-2 h-4 w-4" /> Denegar solicitud</>
      ) : (
        <><XCircle className="mr-2 h-4 w-4" /> Cancelar solicitud</>
      )}
    </Button>
  );

  if (request.status === "Received") {
    return (
      <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center">
        <CheckCircle className="mr-2 h-4 w-4" /> Solicitud completada y recibida.
      </p>
    );
  }

  if (request.status === "Denied" || request.status === "Cancelled") {
    return null;
  }

  return (
    <div className="flex flex-col space-y-2">
      {!tienePresupuesto && puedeSeguir && (request.status === "Pending" || request.status === "Quote Requested") && (
        <>
          <Button onClick={() => onSendQuoteRequest(request)} className="w-full justify-start" disabled={isUpdatingStatus}>
            <Mail className="mr-2 h-4 w-4" /> Solicitar presupuesto
          </Button>
          <Button variant="outline" onClick={handleUploadQuote} className="w-full justify-start" disabled={isUpdatingStatus}>
            <FileText className="mr-2 h-4 w-4" /> Subir presupuesto
          </Button>
        </>
      )}

      {tienePresupuesto && !tienePo && daElPo && antesDelPedido && (
        <Button onClick={handleRegisterPo} className="w-full justify-start" disabled={isUpdatingStatus}>
          <Send className="mr-2 h-4 w-4" /> Registrar PO
        </Button>
      )}

      {tienePresupuesto && !tienePo && esAutor && !daElPo && antesDelPedido && (
        <p className="text-sm text-muted-foreground">
          El presupuesto ya está. El PO lo registra el administrador o el IP del proyecto.
        </p>
      )}

      {tienePo && puedeSeguir && antesDelPedido && (
        <>
          <Button onClick={handleUploadPOAndOrder} className="w-full justify-start" disabled={isUpdatingStatus}>
            <Package className="mr-2 h-4 w-4" /> Marcar como pedido
          </Button>
          <Button variant="outline" onClick={() => handleMarkAsOrderedAndSendEmail(request)} className="w-full justify-start" disabled={isUpdatingStatus}>
            <Mail className="mr-2 h-4 w-4" /> Enviar correo de pedido
          </Button>
        </>
      )}

      {request.status === "Ordered" && canReceive && (
        <Button onClick={handleMarkAsReceived} className="w-full justify-start" disabled={isUpdatingStatus}>
          <Receipt className="mr-2 h-4 w-4" /> Recibir artículos
        </Button>
      )}

      {request.status === "Ordered" && puedeSeguir && (
        <Button variant="outline" onClick={() => handleMarkAsOrderedAndSendEmail(request)} className="w-full justify-start" disabled={isUpdatingStatus}>
          <Mail className="mr-2 h-4 w-4" /> Enviar correo de pedido
        </Button>
      )}

      {puedeDenegar && (request.status === "Pending" || request.status === "Quote Requested") && cerrar}
      {puedeSeguir && (request.status === "PO Requested" || request.status === "Ordered") && (
        <Button
          variant="outline"
          onClick={openCancelRequestDialog}
          className="w-full justify-start text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50"
          disabled={isUpdatingStatus}
        >
          <XCircle className="mr-2 h-4 w-4" /> Cancelar solicitud
        </Button>
      )}

      {!puedeSeguir && !canReceive && request.status !== "Ordered" && (
        <p className="text-sm text-muted-foreground italic">
          No tienes acciones en esta solicitud.
        </p>
      )}
    </div>
  );
};

export default RequestActions;
