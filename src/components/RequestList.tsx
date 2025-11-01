"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { RequestStatus, SupabaseRequest, Vendor, Profile, AccountManager, Project, ShippingAddress, BillingAddress } from "@/data/types";
import { useRequests, useUpdateRequestStatus, useSendEmail } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { useAccountManagers } from "@/hooks/use-account-managers";
import EmailDialog, { EmailFormValues } from "@/components/EmailDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RequestListToolbar from "@/components/request-list/RequestListToolbar";
import RequestListTable from "@/components/request-list/RequestListTable";
import { toast } from "sonner";
import { generateSignedUrl } from "@/utils/supabase-storage";
import { useSession } from "@/components/SessionContextProvider";
import { useProjects } from "@/hooks/use-projects";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { processTextTemplate, processEmailTemplate } from "@/utils/email-templating";
import ReceiveItemsDialog from "@/components/ReceiveItemsDialog";
import MergeRequestsDialog from "@/components/MergeRequestsDialog";
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses";
import ApproveRequestListDialog from "@/components/request-list/ApproveRequestListDialog";


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

// Definir el orden de prioridad de los estados
// Los números más bajos van ARRIBA (mayor prioridad de acción)
const STATUS_ORDER: Record<RequestStatus, number> = {
  "Pending": 1,
  "Quote Requested": 2,
  "PO Requested": 3,
  "Ordered": 4,
  "Received": 90, // Estados finales, muy baja prioridad
  "Denied": 91,
  "Cancelled": 92,
};

const RequestList: React.FC = () => {
  const navigate = useNavigate();
  const { session, profile } = useSession();
  const { data: requests, isLoading: isLoadingRequests, error: requestsError } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagers();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: emailTemplates, isLoading: isLoadingEmailTemplates } = useEmailTemplates();
  const { data: shippingAddresses, isLoading: isLoadingShippingAddresses } = useShippingAddresses();
  const { data: billingAddresses, isLoading: isLoadingBillingAddresses } = useBillingAddresses();

  const updateStatusMutation = useUpdateRequestStatus();
  const sendEmailMutation = useSendEmail();

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<RequestStatus | "All" | "Active">("All"); // Changed default to "All"

  const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
  const [emailInitialData, setEmailInitialData] = React.useState<Partial<EmailFormValues>>({});
  
  const [isReceiveItemsDialogOpen, setIsReceiveItemsDialogOpen] = React.useState(false);
  const [requestToReceive, setRequestToReceive] = React.useState<SupabaseRequest | null>(null);
  
  const [isDenyDialogOpen, setIsDenyDialogOpen] = React.useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [requestToModify, setRequestToModify] = React.useState<SupabaseRequest | null>(null);
  
  const [isMergeDialogOpen, setIsMergeDialogOpen] = React.useState(false);
  const [sourceRequestToMerge, setSourceRequestToMerge] = React.useState<SupabaseRequest | null>(null);

  const [isApproveListDialogOpen, setIsApproveListDialogOpen] = React.useState(false);
  const [requestToApproveFromList, setRequestToApproveFromList] = React.useState<SupabaseRequest | null>(null);


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
    const attachmentsToSend = (emailData as any).attachmentsForSend || emailData.attachments;
    
    await sendEmailMutation.mutateAsync({
      to: emailData.to!,
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
      shippingAddress: shippingAddresses?.find(a => a.id === request.shipping_address_id),
      billingAddress: billingAddresses?.find(a => a.id === request.billing_address_id),
    };

    let attachmentsForDialog = [];
    let attachmentsForSend = [];
    
    if (request.quote_url) {
      const fileName = getFileNameFromPath(request.quote_url);
      
      const signedUrl = await generateSignedUrl(request.quote_url);
      if (signedUrl) {
        attachmentsForDialog.push({ name: fileName, url: signedUrl });
      } else {
        toast.warning("No se pudo generar la URL firmada para el archivo de cotización. El enlace adjunto en el diálogo podría estar roto.");
      }
      
      attachmentsForSend.push({ name: fileName, url: request.quote_url });
    }

    setEmailInitialData({
      to: getAccountManagerEmail(request.account_manager_id),
      subject: processTextTemplate(poRequestTemplate.subject_template, context),
      body: processEmailTemplate(poRequestTemplate.body_template, context),
      attachments: attachmentsForDialog,
      attachmentsForSend: attachmentsForSend,
    });
    setIsEmailDialogOpen(true);
  };

  const handleOpenApproveDialogFromList = (request: SupabaseRequest) => {
    setRequestToApproveFromList(request);
    setIsApproveListDialogOpen(true);
  };

  const handleApproveOnlyFromList = async (request: SupabaseRequest) => {
    const nextStatus = request.quote_url ? "PO Requested" : "Quote Requested";
    await updateStatusMutation.mutateAsync({ id: request.id, status: nextStatus });
    setIsApproveListDialogOpen(false);
  };

  const handleApproveAndSendEmailFromList = async (request: SupabaseRequest) => {
    const nextStatus = request.quote_url ? "PO Requested" : "Quote Requested";
    await updateStatusMutation.mutateAsync({ id: request.id, status: nextStatus });

    if (nextStatus === "Quote Requested") {
      const quoteTemplate = emailTemplates?.find(t => t.template_name === 'Quote Request');
      if (!quoteTemplate) {
        toast.error("Plantilla de correo electrónico 'Quote Request' no encontrada. Por favor, crea una en el panel de Admin.");
        return;
      }

      const context = {
        request: { ...request, status: "Quote Requested" as const },
        vendor: vendors?.find(v => v.id === request.vendor_id),
        requesterProfile: profiles?.find(p => p.id === request.requester_id),
        accountManager: accountManagers?.find(am => am.id === request.account_manager_id),
        projects: projects,
        actorProfile: profile,
        shippingAddress: shippingAddresses?.find(a => a.id === request.shipping_address_id),
        billingAddress: billingAddresses?.find(a => a.id === request.billing_address_id),
      };
      
      setEmailInitialData({
        to: getVendorEmail(request.vendor_id),
        subject: processTextTemplate(quoteTemplate.subject_template, context),
        body: processEmailTemplate(quoteTemplate.body_template, context),
      });
      setIsApproveListDialogOpen(false);
      setIsEmailDialogOpen(true);
    } else {
      setIsApproveListDialogOpen(false);
    }
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
  
  const handleMergeRequest = (request: SupabaseRequest) => {
    setSourceRequestToMerge(request);
    setIsMergeDialogOpen(true);
  };
  
  const mergeableRequests = React.useMemo(() => {
    if (!sourceRequestToMerge || !requests) return [];
    
    return requests.filter(req => 
      req.id !== sourceRequestToMerge.id && 
      req.vendor_id === sourceRequestToMerge.vendor_id &&
      (req.status === "Pending" || req.status === "Quote Requested" || req.status === "PO Requested")
    );
  }, [sourceRequestToMerge, requests]);

  const handleSendQuoteRequestFromList = async (request: SupabaseRequest) => {
    await updateStatusMutation.mutateAsync({ id: request.id, status: "Quote Requested" });

    const quoteTemplate = emailTemplates?.find(t => t.template_name === 'Quote Request');
    if (!quoteTemplate) {
      toast.error("Plantilla de correo electrónico 'Quote Request' no encontrada. Por favor, crea una en el panel de Admin.");
      return;
    }

    const context = {
      request: { ...request, status: "Quote Requested" as const },
      vendor: vendors?.find(v => v.id === request.vendor_id),
      requesterProfile: profiles?.find(p => p.id === request.requester_id),
      accountManager: accountManagers?.find(am => am.id === request.account_manager_id),
      projects: projects,
      actorProfile: profile,
      shippingAddress: shippingAddresses?.find(a => a.id === request.shipping_address_id),
      billingAddress: billingAddresses?.find(a => a.id === request.billing_address_id),
    };
    
    setEmailInitialData({
      to: getVendorEmail(request.vendor_id),
      subject: processTextTemplate(quoteTemplate.subject_template, context),
      body: processEmailTemplate(quoteTemplate.body_template, context),
    });
    setIsEmailDialogOpen(true);
  };


  const filteredAndSortedRequests = React.useMemo(() => {
    if (!requests) return [];

    const filtered = requests.filter(request => {
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

      let matchesStatus = true;
      if (filterStatus === "All") {
        matchesStatus = true;
      } else if (filterStatus === "Active") {
        // Excluir Received, Denied, Cancelled
        matchesStatus = !["Received", "Denied", "Cancelled"].includes(request.status);
      } else {
        matchesStatus = request.status === filterStatus;
      }

      return matchesSearchTerm && matchesStatus;
    });

    // Aplicar ordenación por estado y luego por fecha de creación (más reciente primero)
    return filtered.sort((a, b) => {
      const statusA = STATUS_ORDER[a.status] || 99;
      const statusB = STATUS_ORDER[b.status] || 99;

      if (statusA !== statusB) {
        return statusA - statusB; // Ordenar por prioridad de estado (1, 2, 3... arriba)
      }

      // Si los estados son iguales, ordenar por fecha de creación (más reciente primero)
      // Esto asegura que dentro de un mismo estado, el más reciente aparezca primero.
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [requests, searchTerm, filterStatus, vendors, profiles, accountManagers]);


  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates || isLoadingShippingAddresses || isLoadingBillingAddresses) {
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
        requests={filteredAndSortedRequests}
        vendors={vendors}
        profiles={profiles}
        isUpdatingStatus={updateStatusMutation.isPending}
        onViewDetails={(id) => navigate(`/requests/${id}`)}
        onApprove={handleOpenApproveDialogFromList}
        onEnterQuoteDetails={openQuoteAndPODetailsDialog}
        onSendPORequest={handleSendPORequest}
        onMarkAsOrdered={openOrderConfirmationDialog}
        onMarkAsReceived={handleMarkAsReceived}
        onDeny={handleDenyRequest}
        onCancel={handleCancelRequest}
        onMerge={handleMergeRequest}
        onSendQuoteRequest={handleSendQuoteRequestFromList}
      />

      <EmailDialog
        isOpen={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        initialData={emailInitialData}
        onSend={handleSendEmail}
        isSending={sendEmailMutation.isPending}
      />
      
      {requestToReceive && requestToReceive.items && (
        <ReceiveItemsDialog
          isOpen={isReceiveItemsDialogOpen}
          onOpenChange={setIsReceiveItemsDialogOpen}
          requestId={requestToReceive.id}
          requestItems={requestToReceive.items}
        />
      )}
      
      {sourceRequestToMerge && (
        <MergeRequestsDialog
          isOpen={isMergeDialogOpen}
          onOpenChange={setIsMergeDialogOpen}
          sourceRequest={sourceRequestToMerge}
          mergeableRequests={mergeableRequests}
        />
      )}
      
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

      <ApproveRequestListDialog
        isOpen={isApproveListDialogOpen}
        onOpenChange={setIsApproveListDialogOpen}
        request={requestToApproveFromList}
        onApproveOnly={handleApproveOnlyFromList}
        onApproveAndSendEmail={handleApproveAndSendEmailFromList}
        isSubmitting={updateStatusMutation.isPending || sendEmailMutation.isPending}
      />
    </div>
  );
};

export default RequestList;