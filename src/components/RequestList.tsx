"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { RequestStatus } from "@/data/types";
import { useRequests, useUpdateRequestStatus, SupabaseRequest, useSendEmail } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { useAccountManagers } from "@/hooks/use-account-managers"; // Usar el nuevo hook
import EmailDialog, { EmailFormValues } from "./EmailDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RequestListToolbar from "./request-list/RequestListToolbar";
import RequestListTable from "./request-list/RequestListTable";
import { toast } from "sonner";
import { generateSignedUrl } from "@/utils/supabase-storage";
import { useSession } from "@/components/SessionContextProvider";
import { useProjects } from "@/hooks/use-projects";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { processTextTemplate, processPlainTextTemplate } from "@/utils/email-templating";
import ReceiveItemsDialog from "@/components/ReceiveItemsDialog"; // Importar el diálogo de recepción

// Función auxiliar para obtener el nombre de archivo legible (copiada de RequestFilesCard.tsx)
const getFileNameFromPath = (filePath: string): string => {
  if (!filePath) return "Archivo";
  try {
    const pathParts = filePath.split('/');
    const encodedFileName = pathParts[pathParts.length - 1];
    const decodedFileName = decodeURIComponent(encodedFileName);
    
    // Eliminar el prefijo de timestamp (ej. "1678886400000_")
    const nameWithoutPrefix = decodedFileName.substring(decodedFileName.indexOf('_') + 1);
    return nameWithoutPrefix || decodedFileName || "Archivo"; // Fallback si algo sale mal
  } catch (e) {
    console.error("Could not parse filename from path", e);
    return "Archivo";
  }
};


const RequestList: React.FC = () => {
  const navigate = useNavigate();
  const { session, profile } = useSession();
  const { data: requests, isLoading: isLoadingRequests, error: requestsError } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagers(); // Usar el nuevo hook
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: emailTemplates, isLoading: isLoadingEmailTemplates } = useEmailTemplates();
  const updateStatusMutation = useUpdateRequestStatus();
  const sendEmailMutation = useSendEmail();

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<RequestStatus | "All">("All");

  const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
  const [emailInitialData, setEmailInitialData] = React.useState<Partial<EmailFormValues>>({});
  
  const [isReceiveItemsDialogOpen, setIsReceiveItemsDialogOpen] = React.useState(false); // Nuevo estado
  const [requestToReceive, setRequestToReceive] = React.useState<SupabaseRequest | null>(null); // Nuevo estado
  
  const [isDenyDialogOpen, setIsDenyDialogOpen] = React.useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [requestToModify, setRequestToModify] = React.useState<SupabaseRequest | null>(null);


  const getRequesterName = (requesterId: string) => {
    const profile = profiles?.find(p => p.id === requesterId);
    return getFullName(profile);
  };

  const getAccountManagerName = (managerId: string | null) => {
    if (!managerId) return "N/A";
    const manager = accountManagers?.find(am => am.id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name}` : "N/A";
  };

  const getVendorEmail = (vendorId: string) => {
    return vendors?.find(v => v.id === vendorId)?.email || "";
  };

  const getAccountManagerEmail = (managerId: string | null) => {
    return accountManagers?.find(am => am.id === managerId)?.email || "";
  };

  const handleSendEmail = async (emailData: EmailFormValues) => {
    // Usar los adjuntos de la propiedad 'attachmentsForSend' si existen, si no, usar 'attachments'
    const attachmentsToSend = (emailData as any).attachmentsForSend || emailData.attachments;
    
    await sendEmailMutation.mutateAsync({
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body,
      attachments: attachmentsToSend,
    });
    setIsEmailDialogOpen(false);
  };

  const handleSendPORequest = async (request: SupabaseRequest) => {
    if (!request.account_manager_id) {
      toast.error("No se puede enviar la solicitud de PO.", { description: "No hay un gerente de cuenta asignado a esta solicitud." });
      return;
    }
    if (!request.quote_url) {
      toast.error("No se puede enviar la solicitud de PO.", { description: "El archivo de cotización no está disponible." });
      return;
    }

    const poRequestTemplate = emailTemplates?.find(t => t.template_name === 'PO Request');
    if (!poRequestTemplate) {
      toast.error("Plantilla de correo electrónico 'PO Request' no encontrada. Por favor, crea una en el panel de Admin.");
      return;
    }

    const context = {
      request,
      vendor: vendors?.find(v => v.id === request.vendor_id),
      requesterProfile: profiles?.find(p => p.id === request.requester_id),
      accountManager: accountManagers?.find(am => am.id === request.account_manager_id),
      projects: projects,
      actorProfile: profile,
      // Nota: Las direcciones de envío/facturación no están disponibles en la lista, pero el templating las manejará como N/A si se usan.
    };

    // Preparar adjuntos:
    let attachmentsForDialog = [];
    let attachmentsForSend = [];
    
    if (request.quote_url) {
      const fileName = getFileNameFromPath(request.quote_url);
      
      // 1. Generar URL firmada para el diálogo (visualización)
      const signedUrl = await generateSignedUrl(request.quote_url);
      if (signedUrl) {
        attachmentsForDialog.push({ name: fileName, url: signedUrl });
      } else {
        toast.warning("No se pudo generar la URL firmada para el archivo de cotización. El enlace adjunto en el diálogo podría estar roto.");
      }
      
      // 2. Usar la ruta de almacenamiento original para el envío (Edge Function)
      attachmentsForSend.push({ name: fileName, url: request.quote_url });
    }

    setEmailInitialData({
      to: getAccountManagerEmail(request.account_manager_id),
      subject: processTextTemplate(poRequestTemplate.subject_template, context),
      body: processPlainTextTemplate(poRequestTemplate.body_template, context),
      attachments: attachmentsForDialog,
      attachmentsForSend: attachmentsForSend,
    });
    setIsEmailDialogOpen(true);
  };

  const handleApproveRequest = async (request: SupabaseRequest) => {
    await updateStatusMutation.mutateAsync({ id: request.id, status: "Quote Requested" });
  };

  const openQuoteAndPODetailsDialog = (request: SupabaseRequest) => {
    navigate(`/requests/${request.id}`);
  };

  const openOrderConfirmationDialog = (request: SupabaseRequest) => {
    navigate(`/requests/${request.id}`);
  };

  const handleMarkAsReceived = (request: SupabaseRequest) => {
    if (!request.items || request.items.length === 0) {
      toast.error("No se pueden recibir artículos.", { description: "La solicitud no tiene artículos." });
      return;
    }
    setRequestToReceive(request);
    setIsReceiveItemsDialogOpen(true);
  };
  
  // NUEVOS MANEJADORES
  const handleDenyRequest = (request: SupabaseRequest) => {
    setRequestToModify(request);
    setIsDenyDialogOpen(true);
  };

  const handleCancelRequest = (request: SupabaseRequest) => {
    setRequestToModify(request);
    setIsCancelDialogOpen(true);
  };
  
  const confirmDenyRequest = async () => {
    if (requestToModify) {
      await updateStatusMutation.mutateAsync({ id: requestToModify.id, status: "Denied" });
      setIsDenyDialogOpen(false);
      setRequestToModify(null);
    }
  };

  const confirmCancelRequest = async () => {
    if (requestToModify) {
      await updateStatusMutation.mutateAsync({ id: requestToModify.id, status: "Cancelled" });
      setIsCancelDialogOpen(false);
      setRequestToModify(null);
    }
  };
  // FIN NUEVOS MANEJADORES

  const filteredRequests = (requests || []).filter(request => {
    const vendorName = vendors?.find(v => v.id === request.vendor_id)?.name || "";
    const requesterName = getRequesterName(request.requester_id);
    const accountManagerName = getAccountManagerName(request.account_manager_id);

    const matchesSearchTerm = searchTerm.toLowerCase() === "" ||
      request.items?.some(item =>
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.catalog_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      ) ||
      vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      accountManagerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.quote_url && request.quote_url.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.po_number && request.po_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === "All" || request.status === filterStatus;

    return matchesSearchTerm && matchesStatus;
  });

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando Solicitudes...
      </div>
    );
  }

  if (requestsError) {
    return <div className="text-red-500">Error al cargar solicitudes: {requestsError.message}</div>;
  }

  return (
    <div className="space-y-4">
      <RequestListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
      />
      <RequestListTable
        requests={filteredRequests}
        vendors={vendors}
        profiles={profiles}
        isUpdatingStatus={updateStatusMutation.isPending}
        onViewDetails={(id) => navigate(`/requests/${id}`)}
        onApprove={handleApproveRequest}
        onEnterQuoteDetails={openQuoteAndPODetailsDialog}
        onSendPORequest={handleSendPORequest}
        onMarkAsOrdered={openOrderConfirmationDialog}
        onMarkAsReceived={handleMarkAsReceived}
        onDeny={handleDenyRequest}
        onCancel={handleCancelRequest}
      />

      <EmailDialog
        isOpen={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        initialData={emailInitialData}
        onSend={handleSendEmail}
        isSending={sendEmailMutation.isPending}
      />
      
      {/* Diálogo de Recepción de Ítems */}
      {requestToReceive && requestToReceive.items && (
        <ReceiveItemsDialog
          isOpen={isReceiveItemsDialogOpen}
          onOpenChange={setIsReceiveItemsDialogOpen}
          requestId={requestToReceive.id}
          requestItems={requestToReceive.items}
        />
      )}
      
      {/* Diálogo de Denegación */}
      <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Denegar Solicitud</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas denegar la Solicitud {requestToModify?.request_number || requestToModify?.id.substring(0, 8)}? Esta acción cambiará su estado a "Denegada".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDenyDialogOpen(false)} disabled={updateStatusMutation.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDenyRequest} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar Denegación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Cancelación */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancelar Solicitud</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar la Solicitud {requestToModify?.request_number || requestToModify?.id.substring(0, 8)}? Esta acción cambiará su estado a "Cancelada".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)} disabled={updateStatusMutation.isPending}>
              No, Mantener
            </Button>
            <Button variant="destructive" onClick={confirmCancelRequest} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, Cancelar Solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestList;