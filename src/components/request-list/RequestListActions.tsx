"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  CheckCircle,
  Package,
  Receipt,
  Mail,
  FileText,
  Ban,
  XCircle,
  Combine,
  MoreHorizontal,
} from "lucide-react";
import { SupabaseRequest } from "@/data/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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
  onMerge: (request: SupabaseRequest) => void;
  onSendQuoteRequest: (request: SupabaseRequest) => void;
  className?: string;
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
  onMerge,
  onSendQuoteRequest,
  className,
}) => {
  const isMobile = useIsMobile();
  const isMergeAllowed = request.status === "Pending";

  const iconButtons = (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewDetails(request.id)}
        title="Ver Detalles"
        className="shrink-0"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {isMergeAllowed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMerge(request)}
          title="Fusionar con otra solicitud"
          disabled={isUpdatingStatus}
          className="shrink-0"
        >
          <Combine className="h-4 w-4 text-purple-600" />
        </Button>
      )}

      {request.status === "Pending" && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSendQuoteRequest(request)}
            title="Solicitar Cotización (Correo)"
            disabled={isUpdatingStatus}
            className="shrink-0"
          >
            <Mail className="h-4 w-4 text-blue-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onApprove(request)}
            title="Aprobar Solicitud"
            disabled={isUpdatingStatus}
            className="shrink-0"
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeny(request)}
            title="Denegar Solicitud"
            disabled={isUpdatingStatus}
            className="shrink-0"
          >
            <Ban className="h-4 w-4 text-red-600" />
          </Button>
        </>
      )}

      {request.status === "Quote Requested" && !request.quote_url && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEnterQuoteDetails(request)}
            title="Subir Archivo de Cotización"
            disabled={isUpdatingStatus}
            className="shrink-0"
          >
            <FileText className="h-4 w-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeny(request)}
            title="Denegar Solicitud"
            disabled={isUpdatingStatus}
            className="shrink-0"
          >
            <Ban className="h-4 w-4 text-red-600" />
          </Button>
        </>
      )}

      {request.status === "Quote Requested" && request.quote_url && request.account_manager_id && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSendPORequest(request)}
          title="Enviar Solicitud de PO al Gerente de Cuenta"
          disabled={isUpdatingStatus}
          className="shrink-0"
        >
          <Mail className="h-4 w-4 text-orange-600" />
        </Button>
      )}

      {request.status === "PO Requested" && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMarkAsOrdered(request)}
            title="Subir PO y Marcar como Pedido"
            disabled={isUpdatingStatus}
            className="shrink-0"
          >
            <Package className="h-4 w-4 text-green-700" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCancel(request)}
            title="Cancelar Solicitud"
            disabled={isUpdatingStatus}
            className="shrink-0"
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
            onClick={() => onMarkAsReceived(request)}
            title="Marcar como Recibido"
            disabled={isUpdatingStatus}
            className="shrink-0"
          >
            <Receipt className="h-4 w-4 text-purple-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCancel(request)}
            title="Cancelar Solicitud"
            disabled={isUpdatingStatus}
            className="shrink-0"
          >
            <XCircle className="h-4 w-4 text-red-600" />
          </Button>
        </>
      )}
    </>
  );

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
            {isMergeAllowed && (
              <DropdownMenuItem onClick={() => onMerge(request)} disabled={isUpdatingStatus}>
                <Combine className="mr-2 h-4 w-4 text-purple-600" /> Fusionar solicitud
              </DropdownMenuItem>
            )}
            {request.status === "Pending" && (
              <>
                {isMergeAllowed && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => onSendQuoteRequest(request)} disabled={isUpdatingStatus}>
                  <Mail className="mr-2 h-4 w-4 text-blue-500" /> Solicitar cotización
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onApprove(request)} disabled={isUpdatingStatus}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Aprobar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDeny(request)} disabled={isUpdatingStatus} className="text-red-600">
                  <Ban className="mr-2 h-4 w-4" /> Denegar
                </DropdownMenuItem>
              </>
            )}
            {request.status === "Quote Requested" && !request.quote_url && (
              <>
                <DropdownMenuItem onClick={() => onEnterQuoteDetails(request)} disabled={isUpdatingStatus}>
                  <FileText className="mr-2 h-4 w-4 text-blue-600" /> Subir cotización
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDeny(request)} disabled={isUpdatingStatus} className="text-red-600">
                  <Ban className="mr-2 h-4 w-4" /> Denegar
                </DropdownMenuItem>
              </>
            )}
            {request.status === "Quote Requested" && request.quote_url && request.account_manager_id && (
              <DropdownMenuItem onClick={() => onSendPORequest(request)} disabled={isUpdatingStatus}>
                <Mail className="mr-2 h-4 w-4 text-orange-600" /> Solicitar PO
              </DropdownMenuItem>
            )}
            {request.status === "PO Requested" && (
              <>
                <DropdownMenuItem onClick={() => onMarkAsOrdered(request)} disabled={isUpdatingStatus}>
                  <Package className="mr-2 h-4 w-4 text-green-700" /> Marcar como pedido
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCancel(request)} disabled={isUpdatingStatus} className="text-red-600">
                  <XCircle className="mr-2 h-4 w-4" /> Cancelar
                </DropdownMenuItem>
              </>
            )}
            {request.status === "Ordered" && (
              <>
                <DropdownMenuItem onClick={() => onMarkAsReceived(request)} disabled={isUpdatingStatus}>
                  <Receipt className="mr-2 h-4 w-4 text-purple-600" /> Recibir artículos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCancel(request)} disabled={isUpdatingStatus} className="text-red-600">
                  <XCircle className="mr-2 h-4 w-4" /> Cancelar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap justify-end gap-1", className)}>
      {iconButtons}
    </div>
  );
};

export default RequestListActions;
