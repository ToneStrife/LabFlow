"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { RequestStatus, SupabaseRequest } from "@/data/types";
import {
  usePaginatedRequests,
  useRequests,
  useUpdateRequestStatus,
  useSendEmail,
  REQUESTS_PAGE_SIZE,
} from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles } from "@/hooks/use-profiles";
import { useAccountManagers } from "@/hooks/use-account-managers";
import EmailDialog, { EmailFormValues } from "@/components/EmailDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RequestListToolbar from "@/components/request-list/RequestListToolbar";
import RequestListTable from "@/components/request-list/RequestListTable";
import { toast } from "sonner";
import { buildStorageAttachment, openEmailDialogAfterClose, normalizeAttachments } from "@/utils/email-attachments";
import { useSession } from "@/components/SessionContextProvider";
import { useProjects } from "@/hooks/use-projects";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { processTextTemplate, processEmailTemplate } from "@/utils/email-templating";
import MergeRequestsDialog from "@/components/MergeRequestsDialog";
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses";
import ApproveRequestListDialog from "@/components/request-list/ApproveRequestListDialog";
import { cn } from "@/lib/utils";
import { mobileDialogClass } from "@/lib/layout";
import { useReceiveWizard } from "@/components/ReceiveWizardProvider";
import { useSedeActiva } from "@/components/SedeContextProvider";
import { resolveAddressSedeId } from "@/lib/sedes";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";


interface RequestListProps {
  /** Estado con el que arranca el filtro. Lo usa el panel para que al pulsar
   *  una fase del recorrido la lista aparezca ya filtrada por esa fase. */
  estadoInicial?: RequestStatus | "All" | "Active";
}

const RequestList: React.FC<RequestListProps> = ({ estadoInicial = "All" }) => {
  const navigate = useNavigate();
  const { profile } = useSession();
  const { sedeActiva } = useSedeActiva();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagers();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: emailTemplates, isLoading: isLoadingEmailTemplates } = useEmailTemplates();
  const { data: shippingAddresses, isLoading: isLoadingShippingAddresses } = useShippingAddresses();
  const { data: billingAddresses, isLoading: isLoadingBillingAddresses } = useBillingAddresses();
  // Candidatas a fusionar pueden estar fuera de la página visible
  const { data: allRequestsForMerge } = useRequests();

  const updateStatusMutation = useUpdateRequestStatus();
  const sendEmailMutation = useSendEmail();
  const { openReceive } = useReceiveWizard();

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<RequestStatus | "All" | "Active">(estadoInicial);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // Si el panel pide otra fase, el filtro la recoge sin dejar de ser editable
  // desde la barra de herramientas.
  React.useEffect(() => {
    setFilterStatus(estadoInicial);
  }, [estadoInicial]);

  React.useEffect(() => {
    setPage(1);
  }, [filterStatus, debouncedSearch, sedeActiva]);

  const shippingAddressIds = React.useMemo(() => {
    if (!sedeActiva) return null;
    if (!shippingAddresses) return undefined;
    return shippingAddresses
      .filter((address) => resolveAddressSedeId(address) === sedeActiva)
      .map((address) => address.id);
  }, [sedeActiva, shippingAddresses]);

  const {
    data: pageResult,
    isLoading: isLoadingRequests,
    isFetching: isFetchingPage,
    error: requestsError,
  } = usePaginatedRequests(
    {
      page,
      pageSize: REQUESTS_PAGE_SIZE,
      status: filterStatus,
      search: debouncedSearch || undefined,
      shippingAddressIds: shippingAddressIds ?? null,
    },
    { enabled: shippingAddressIds !== undefined }
  );

  const requests = pageResult?.data ?? [];
  const total = pageResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / REQUESTS_PAGE_SIZE));

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
  const [emailInitialData, setEmailInitialData] = React.useState<Partial<EmailFormValues>>({});
  const [pendingStatusOnEmailSend, setPendingStatusOnEmailSend] = React.useState<{
    requestId: string;
    status: RequestStatus;
  } | null>(null);
  
  const [isDenyDialogOpen, setIsDenyDialogOpen] = React.useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [requestToModify, setRequestToModify] = React.useState<SupabaseRequest | null>(null);
  
  const [isMergeDialogOpen, setIsMergeDialogOpen] = React.useState(false);
  const [sourceRequestToMerge, setSourceRequestToMerge] = React.useState<SupabaseRequest | null>(null);

  const [isApproveListDialogOpen, setIsApproveListDialogOpen] = React.useState(false);
  const [requestToApproveFromList, setRequestToApproveFromList] = React.useState<SupabaseRequest | null>(null);


  const getVendorEmail = (vendorId: string) => {
    return vendors?.find(v => v.id === vendorId)?.email || "";
  };

  const getAccountManagerEmail = (managerId: string | null) => {
    return accountManagers?.find(am => am.id === managerId)?.email || "";
  };

  const handleEmailDialogOpenChange = (open: boolean) => {
    setIsEmailDialogOpen(open);
    if (!open) setPendingStatusOnEmailSend(null);
  };

  const handleSendEmail = async (emailData: EmailFormValues) => {
    await sendEmailMutation.mutateAsync({
      to: emailData.to!,
      subject: emailData.subject,
      body: emailData.body,
      attachments: normalizeAttachments(emailData.attachments),
    });

    if (pendingStatusOnEmailSend) {
      await updateStatusMutation.mutateAsync({
        id: pendingStatusOnEmailSend.requestId,
        status: pendingStatusOnEmailSend.status,
      });
      setPendingStatusOnEmailSend(null);
    }

    setIsEmailDialogOpen(false);
  };

  const buildPORequestEmailInitialData = async (request: SupabaseRequest) => {
    const poRequestTemplate = emailTemplates?.find(t => t.template_name === 'PO Request');
    if (!poRequestTemplate) {
      toast.error("Plantilla de correo electrónico 'PO Request' no encontrada. Por favor, crea una en el panel de Admin.");
      return null;
    }
    if (!request.account_manager_id) {
      toast.error("No se puede enviar la solicitud de PO.", { description: "No hay un gerente de cuenta asignado a esta solicitud." });
      return null;
    }
    if (!request.quote_url) {
      toast.error("No se puede enviar la solicitud de PO.", { description: "El archivo de cotización no está disponible." });
      return null;
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

    const { forDialog, forSend } = await buildStorageAttachment(request.quote_url);
    if (forDialog.length === 0) {
      toast.warning("No se pudo generar la URL firmada para el archivo de cotización. El enlace adjunto en el diálogo podría estar roto.");
    }

    return {
      to: getAccountManagerEmail(request.account_manager_id),
      subject: processTextTemplate(poRequestTemplate.subject_template, context),
      body: processEmailTemplate(poRequestTemplate.body_template, context),
      attachments: forDialog,
      attachmentsForSend: forSend,
    };
  };

  const handleSendPORequest = async (request: SupabaseRequest) => {
    const emailData = await buildPORequestEmailInitialData(request);
    if (!emailData) return;
    setPendingStatusOnEmailSend({ requestId: request.id, status: "PO Requested" });
    setEmailInitialData(emailData);
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

      const emailData = {
        to: getVendorEmail(request.vendor_id),
        subject: processTextTemplate(quoteTemplate.subject_template, context),
        body: processEmailTemplate(quoteTemplate.body_template, context),
      };

      openEmailDialogAfterClose(
        () => setIsApproveListDialogOpen(false),
        () => {
          setEmailInitialData(emailData);
          setIsEmailDialogOpen(true);
        }
      );
    } else {
      const emailData = await buildPORequestEmailInitialData({ ...request, status: "PO Requested" });
      if (!emailData) return;

      openEmailDialogAfterClose(
        () => setIsApproveListDialogOpen(false),
        () => {
          setEmailInitialData(emailData);
          setIsEmailDialogOpen(true);
        }
      );
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
    openReceive(request.id);
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
    if (!sourceRequestToMerge || !allRequestsForMerge) return [];
    
    return allRequestsForMerge.filter(req => 
      req.id !== sourceRequestToMerge.id && 
      req.vendor_id === sourceRequestToMerge.vendor_id &&
      (req.status === "Pending" || req.status === "Quote Requested" || req.status === "PO Requested")
    );
  }, [sourceRequestToMerge, allRequestsForMerge]);

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


  const filteredAndSortedRequests = requests;

  // Esperar direcciones si hay sede activa para no consultar sin el filtro correcto
  const waitingSedeFilter = !!sedeActiva && shippingAddressIds === undefined;

  if (waitingSedeFilter || isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates || isLoadingShippingAddresses || isLoadingBillingAddresses) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando Solicitudes...
      </div>
    );
  }

  if (requestsError) {
    return <div className="text-red-500 dark:text-red-400">Error al cargar solicitudes: {requestsError.message}</div>;
  }

  const fromItem = total === 0 ? 0 : (page - 1) * REQUESTS_PAGE_SIZE + 1;
  const toItem = Math.min(page * REQUESTS_PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <RequestListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
      />
      <div className={cn(isFetchingPage && "opacity-70 transition-opacity")}>
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
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "Sin resultados"
            : `Mostrando ${fromItem}–${toItem} de ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetchingPage}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground min-w-[5.5rem] text-center">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isFetchingPage}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <EmailDialog
        isOpen={isEmailDialogOpen}
        onOpenChange={handleEmailDialogOpenChange}
        initialData={emailInitialData}
        onSend={handleSendEmail}
        isSending={sendEmailMutation.isPending}
      />
      
      {sourceRequestToMerge && (
        <MergeRequestsDialog
          isOpen={isMergeDialogOpen}
          onOpenChange={setIsMergeDialogOpen}
          sourceRequest={sourceRequestToMerge}
          mergeableRequests={mergeableRequests}
        />
      )}
      
      <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
        <DialogContent className={cn(mobileDialogClass, "sm:max-w-[425px]")}>
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
        <DialogContent className={cn(mobileDialogClass, "sm:max-w-[425px]")}>
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