import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Package,
  Receipt,
  Mail,
  FileText,
  Ban,
  XCircle,
  Combine,
  MoreHorizontal,
  Send,
  type LucideIcon,
} from "lucide-react";
import { SupabaseRequest } from "@/data/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/SessionContextProvider";
import { useCan } from "@/hooks/use-permissions";
import { useProjects } from "@/hooks/use-projects";
import {
  canApprovePendingRequest,
  canGivePurchaseOrder,
  canMergeRequest,
  canReceivePackages,
  isRequestAuthor,
} from "@/lib/permissions";
import { AccionSolicitud, accionesDeSolicitud } from "@/lib/request-actions";
const esDestructiva = (accion: AccionSolicitud) => accion === "denegar" || accion === "cancelar";

interface RequestListActionsProps {
  request: SupabaseRequest;
  isUpdatingStatus: boolean;
  onViewDetails: (id: string) => void;
  onEnterQuoteDetails: (request: SupabaseRequest) => void;
  onSendPORequest: (request: SupabaseRequest) => void;
  onMarkAsOrdered: (request: SupabaseRequest) => void;
  onMarkAsReceived: (request: SupabaseRequest) => void;
  onDeny: (request: SupabaseRequest) => void;
  onCancel: (request: SupabaseRequest) => void;
  onMerge: (request: SupabaseRequest) => void;
  onSendQuoteRequest: (request: SupabaseRequest) => void;
  className?: string;
}

const RequestListActions: React.FC<RequestListActionsProps> = ({
  request,
  isUpdatingStatus,
  onViewDetails,
  onEnterQuoteDetails,
  onSendPORequest,
  onMarkAsOrdered,
  onMarkAsReceived,
  onDeny,
  onCancel,
  onMerge,
  onSendQuoteRequest,
  className,
}) => {
  const isMobile = useIsMobile();
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
  const canMerge = canMergeRequest(profile?.role) && request.status === "Pending";
  const acciones = accionesDeSolicitud(request, {
    puedeSeguir: isRequestAuthor(approvalCtx) || daElPo,
    daElPo,
    puedeDenegar: canApprovePendingRequest(approvalCtx),
    puedeRecibir: canReceivePackages(profile?.role, request.status),
  });

  // Subir documentos, marcar como pedido y el correo al proveedor se hacen en la hoja de la solicitud.
  const boton: Record<AccionSolicitud, { icono: LucideIcon; texto: string; onClick: () => void }> = {
    "solicitar-presupuesto": { icono: Mail, texto: "Solicitar presupuesto", onClick: () => onSendQuoteRequest(request) },
    "subir-presupuesto": { icono: FileText, texto: "Subir presupuesto", onClick: () => onEnterQuoteDetails(request) },
    "solicitar-po": { icono: Send, texto: "Solicitar PO (correo)", onClick: () => onSendPORequest(request) },
    "registrar-po": { icono: FileText, texto: "Registrar PO recibido", onClick: () => onEnterQuoteDetails(request) },
    "marcar-pedido": { icono: Package, texto: "Marcar como pedido", onClick: () => onMarkAsOrdered(request) },
    "correo-pedido": {
      icono: Mail,
      texto: request.status === "Ordered" ? "Reenviar correo de pedido" : "Enviar correo de pedido",
      onClick: () => onMarkAsOrdered(request),
    },
    "recibir": { icono: Receipt, texto: "Recibir artículos", onClick: () => onMarkAsReceived(request) },
    "denegar": { icono: Ban, texto: "Denegar solicitud", onClick: () => onDeny(request) },
    "cancelar": { icono: XCircle, texto: "Cancelar solicitud", onClick: () => onCancel(request) },
  };

  if (isMobile) {
    return (
      <div className={cn("flex w-full gap-2", className)}>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onViewDetails(request.id)}
        >
          <Eye className="h-4 w-4 mr-2" /> Ver
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isUpdatingStatus} className="shrink-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {canMerge && (
              <DropdownMenuItem onClick={() => onMerge(request)} disabled={isUpdatingStatus}>
                <Combine className="mr-2 h-4 w-4" /> Fusionar solicitud
              </DropdownMenuItem>
            )}
            {acciones.map((accion) => {
              const { icono: Icono, texto, onClick } = boton[accion];
              const destructiva = esDestructiva(accion);
              return (
                <DropdownMenuItem
                  key={accion}
                  onClick={onClick}
                  disabled={isUpdatingStatus}
                  className={destructiva ? "text-red-600 dark:text-red-400" : undefined}
                >
                  <Icono className="mr-2 h-4 w-4" /> {texto}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap justify-end gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewDetails(request.id)}
        title="Ver detalles"
        aria-label="Ver detalles"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {canMerge && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMerge(request)}
          title="Fusionar con otra solicitud"
          aria-label="Fusionar con otra solicitud"
          disabled={isUpdatingStatus}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Combine className="h-4 w-4" />
        </Button>
      )}

      {acciones.map((accion, i) => {
        const { icono: Icono, texto, onClick } = boton[accion];
        const destructiva = esDestructiva(accion);
        return (
          <Button
            key={accion}
            variant="ghost"
            size="icon"
            onClick={onClick}
            title={texto}
            aria-label={texto}
            disabled={isUpdatingStatus}
            className={cn(
              "shrink-0",
              destructiva
                ? "text-red-600 hover:text-red-700 dark:text-red-400"
                : i === 0
                  ? "text-primary hover:text-primary"
                  : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icono className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
};

export default RequestListActions;
