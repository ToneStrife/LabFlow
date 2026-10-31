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
  const boton: Record<AccionSolicitud, { icono: LucideIcon; texto: string; color: string; onClick: () => void }> = {
    "solicitar-presupuesto": { icono: Mail, texto: "Solicitar presupuesto", color: "text-blue-500 dark:text-blue-400", onClick: () => onSendQuoteRequest(request) },
    "subir-presupuesto": { icono: FileText, texto: "Subir presupuesto", color: "text-blue-600 dark:text-blue-400", onClick: () => onEnterQuoteDetails(request) },
    "solicitar-po": { icono: Send, texto: "Solicitar PO (correo)", color: "text-indigo-600 dark:text-indigo-400", onClick: () => onSendPORequest(request) },
    "registrar-po": { icono: FileText, texto: "Registrar PO recibido", color: "text-orange-600 dark:text-orange-400", onClick: () => onEnterQuoteDetails(request) },
    "marcar-pedido": { icono: Package, texto: "Marcar como pedido", color: "text-green-700 dark:text-green-400", onClick: () => onMarkAsOrdered(request) },
    "correo-pedido": {
      icono: Mail,
      texto: request.status === "Ordered" ? "Reenviar correo de pedido" : "Enviar correo de pedido",
      color: "text-violet-600 dark:text-violet-400",
      onClick: () => onMarkAsOrdered(request),
    },
    "recibir": { icono: Receipt, texto: "Recibir artículos", color: "text-purple-600 dark:text-purple-400", onClick: () => onMarkAsReceived(request) },
    "denegar": { icono: Ban, texto: "Denegar solicitud", color: "text-red-600 dark:text-red-400", onClick: () => onDeny(request) },
    "cancelar": { icono: XCircle, texto: "Cancelar solicitud", color: "text-red-600 dark:text-red-400", onClick: () => onCancel(request) },
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
                <Combine className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" /> Fusionar solicitud
              </DropdownMenuItem>
            )}
            {acciones.map((accion) => {
              const { icono: Icono, texto, color, onClick } = boton[accion];
              const destructiva = accion === "denegar" || accion === "cancelar";
              return (
                <DropdownMenuItem
                  key={accion}
                  onClick={onClick}
                  disabled={isUpdatingStatus}
                  className={destructiva ? "text-red-600 dark:text-red-400" : undefined}
                >
                  <Icono className={cn("mr-2 h-4 w-4", !destructiva && color)} /> {texto}
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
        title="Ver Detalles"
        className="shrink-0"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {canMerge && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMerge(request)}
          title="Fusionar con otra solicitud"
          disabled={isUpdatingStatus}
          className="shrink-0"
        >
          <Combine className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </Button>
      )}

      {acciones.map((accion) => {
        const { icono: Icono, texto, color, onClick } = boton[accion];
        return (
          <Button
            key={accion}
            variant="ghost"
            size="icon"
            onClick={onClick}
            title={texto}
            disabled={isUpdatingStatus}
            className="shrink-0"
          >
            <Icono className={cn("h-4 w-4", color)} />
          </Button>
        );
      })}
    </div>
  );
};

export default RequestListActions;
