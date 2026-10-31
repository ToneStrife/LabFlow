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
  Send,
  type LucideIcon,
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
import { AccionSolicitud, accionesDeSolicitud } from "@/lib/request-actions";

interface RequestActionsProps {
  request: SupabaseRequest;
  isUpdatingStatus: boolean;
  handleUploadQuote: () => void;
  handleUploadPOAndOrder: () => void;
  handleRegisterPo: () => void;
  handleSendPORequest: (request: SupabaseRequest) => void;
  handleMarkAsReceived: () => void;
  handleMarkAsOrderedAndSendEmail: (request: SupabaseRequest) => void;
  openDenyRequestDialog: () => void;
  openCancelRequestDialog: () => void;
  onSendQuoteRequest: (request: SupabaseRequest) => void;
}

const claseRoja =
  "text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50";

const RequestActions: React.FC<RequestActionsProps> = ({
  request,
  isUpdatingStatus,
  handleUploadQuote,
  handleUploadPOAndOrder,
  handleRegisterPo,
  handleSendPORequest,
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

  const acciones = accionesDeSolicitud(request, {
    puedeSeguir: isRequestAuthor(approvalCtx) || daElPo,
    daElPo,
    puedeDenegar: canApprovePendingRequest(approvalCtx),
    puedeRecibir: canReceivePackages(profile?.role, request.status),
  });

  const boton: Record<AccionSolicitud, { icono: LucideIcon; texto: string; onClick: () => void }> = {
    "solicitar-presupuesto": { icono: Mail, texto: "Solicitar presupuesto", onClick: () => onSendQuoteRequest(request) },
    "subir-presupuesto": { icono: FileText, texto: "Subir presupuesto", onClick: handleUploadQuote },
    "solicitar-po": { icono: Send, texto: "Solicitar PO (correo)", onClick: () => handleSendPORequest(request) },
    "registrar-po": { icono: FileText, texto: "Registrar PO recibido", onClick: handleRegisterPo },
    "marcar-pedido": { icono: Package, texto: "Marcar como pedido", onClick: handleUploadPOAndOrder },
    "correo-pedido": {
      icono: Mail,
      texto: request.status === "Ordered" ? "Reenviar correo de pedido" : "Enviar correo de pedido",
      onClick: () => handleMarkAsOrderedAndSendEmail(request),
    },
    "recibir": { icono: Receipt, texto: "Recibir artículos", onClick: handleMarkAsReceived },
    "denegar": { icono: Ban, texto: "Denegar solicitud", onClick: openDenyRequestDialog },
    "cancelar": { icono: XCircle, texto: "Cancelar solicitud", onClick: openCancelRequestDialog },
  };

  if (acciones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No tienes acciones en esta solicitud.
      </p>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      {acciones.map((accion, i) => {
        const { icono: Icono, texto, onClick } = boton[accion];
        const destructiva = accion === "denegar" || accion === "cancelar";
        return (
          <Button
            key={accion}
            variant={i === 0 && !destructiva ? "default" : "outline"}
            onClick={onClick}
            className={destructiva ? `w-full justify-start ${claseRoja}` : "w-full justify-start"}
            disabled={isUpdatingStatus}
          >
            <Icono className="mr-2 h-4 w-4" /> {texto}
          </Button>
        );
      })}
    </div>
  );
};

export default RequestActions;
