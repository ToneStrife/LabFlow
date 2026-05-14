import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  Send, 
  FileText, 
  PackageCheck,
  Ban,
  Clock,
  ArrowRight
} from "lucide-react";
import { SupabaseRequest, RequestStatus } from "@/data/types";
import { useRequests } from "@/hooks/use-requests";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface RequestActionsProps {
  request: SupabaseRequest;
}

export const RequestActions: React.FC<RequestActionsProps> = ({ request }) => {
  const { updateStatus } = useRequests();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = profile?.role === 'Admin';
  const isManager = profile?.role === 'Account Manager';
  const canManage = isAdmin || isManager;

  const handleStatusChange = async (newStatus: RequestStatus) => {
    setIsSubmitting(true);
    try {
      await updateStatus.mutateAsync({ id: request.id, status: newStatus });
      toast({
        title: "Estado actualizado",
        description: `La solicitud ha pasado a: ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (request.status === 'Received' || request.status === 'Cancelled' || request.status === 'Denied') {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 mt-6 p-4 bg-muted/30 rounded-lg border border-dashed">
      {/* FLUJO PRINCIPAL */}
      
      {/* 1. De Pendiente a Quote Requested (Aprobar) */}
      {request.status === 'Pending' && canManage && (
        <Button 
          onClick={() => handleStatusChange('Quote Requested')}
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Aprobar y Pedir Cotización
        </Button>
      )}

      {/* 2. De Quote Requested a PO Requested (Solicitar PO) - ESTO ES LO QUE FALTABA */}
      {request.status === 'Quote Requested' && canManage && (
        <Button 
          onClick={() => handleStatusChange('PO Requested')}
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <FileText className="w-4 h-4 mr-2" />
          Solicitar PO (Orden de Compra)
        </Button>
      )}

      {/* 3. De PO Requested a Ordered (Marcar como Pedido) */}
      {request.status === 'PO Requested' && canManage && (
        <Button 
          onClick={() => handleStatusChange('Ordered')}
          disabled={isSubmitting}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Send className="w-4 h-4 mr-2" />
          Marcar como Pedido
        </Button>
      )}

      {/* 4. De Ordered a Received (Recibir) */}
      {request.status === 'Ordered' && canManage && (
        <Button 
          onClick={() => handleStatusChange('Received')}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          <PackageCheck className="w-4 h-4 mr-2" />
          Marcar como Recibido
        </Button>
      )}

      {/* ACCIONES DE CANCELACIÓN / DENEGACIÓN */}
      <div className="flex-1" /> {/* Espaciador */}

      {request.status === 'Pending' && canManage && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
              <Ban className="w-4 h-4 mr-2" />
              Denegar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Denegar solicitud?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El solicitante será notificado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleStatusChange('Denied')}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Denegar Solicitud
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {(request.status === 'Quote Requested' || request.status === 'PO Requested' || request.status === 'Ordered') && canManage && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => handleStatusChange('Cancelled')}
          disabled={isSubmitting}
          className="text-muted-foreground"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Anular
        </Button>
      )}
    </div>
  );
};