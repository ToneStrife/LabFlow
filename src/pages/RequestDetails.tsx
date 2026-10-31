import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Edit, Trash2, MoreVertical, Ban, XCircle, Info, CheckCircle, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useRequests, SupabaseRequest, useUpdateRequestStatus, useUpdateRequestFile, useUpdateRequestMetadata, useUpdateFullRequest, useRevertRequestReception, useDeleteRequest, FileType } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { useAccountManagers } from "@/hooks/use-account-managers";
import { useProjects } from "@/hooks/use-projects";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses";
import { useRequestEmails } from "@/hooks/use-request-emails";
import EmailDialog from "@/components/EmailDialog";
import InvoiceItemsDialog from "@/components/request-details/InvoiceItemsDialog";
import { useReceiveWizard } from "@/components/ReceiveWizardProvider";

import RequestSummaryCard from "@/components/request-details/RequestSummaryCard";
import RequestItemsTable from "@/components/request-details/RequestItemsTable";
import RequestActions from "@/components/request-details/RequestActions";
import RequestFilesCard from "@/components/request-details/RequestFilesCard";
import FileUploadDialog from "@/components/request-details/FileUploadDialog";
import RequestFullEditForm, { FullEditFormValues } from "@/components/request-details/RequestFullEditForm";
import PackingSlipsList from "@/components/request-details/PackingSlipsList";
import InvoicesList from "@/components/request-details/InvoicesList";
import RequestActivityCard from "@/components/request-details/RequestActivityCard";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";
import { gestionaPedidos, canEditRequestDetails, canDeleteRequest, canOverrideStatus } from "@/lib/permissions";
import { useCan } from "@/hooks/use-permissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { RequestStatus as RequestStatusType, Vendor, Profile, AccountManager, Project, ShippingAddress, BillingAddress } from "@/data/types";
import { cn } from "@/lib/utils";
import { pageContainerClass, mobileDialogClass } from "@/lib/layout";
import { getRequestStatusLabelLong, REQUEST_STATUS_ORDER } from "@/lib/request-status";

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, session } = useSession();
  const { can } = useCan();
  const { openReceive } = useReceiveWizard();
  const userIsAdmin = gestionaPedidos(profile?.role);
  
  const { data: requests, isLoading: isLoadingRequests } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagers();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { isLoading: isLoadingEmailTemplates } = useEmailTemplates();
  const { data: shippingAddresses, isLoading: isLoadingShippingAddresses } = useShippingAddresses();
  const { isLoading: isLoadingBillingAddresses } = useBillingAddresses();
  
  const updateStatusMutation = useUpdateRequestStatus();
  const updateFileMutation = useUpdateRequestFile();
  const updateFullRequestMutation = useUpdateFullRequest();
  const revertReceptionMutation = useRevertRequestReception();
  const deleteRequestMutation = useDeleteRequest();
  const correos = useRequestEmails();

  const request = requests?.find(req => req.id === id);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [fileTypeToUpload, setFileTypeToUpload] = React.useState<FileType>("quote");

  const [isEditMetadataDialogOpen, setIsEditMetadataDialogOpen] = React.useState(false);
  const [isStatusOverrideDialogOpen, setIsStatusOverrideDialogOpen] = React.useState(false);
  const [isInvoiceItemsDialogOpen, setIsInvoiceItemsDialogOpen] = React.useState(false);
  const [isRevertReceptionDialogOpen, setIsRevertReceptionDialogOpen] = React.useState(false);
  
  const [isDenyDialogOpen, setIsDenyDialogOpen] = React.useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  const [newStatus, setNewStatus] = React.useState<RequestStatusType>(request?.status || "Pending");

  const handleOpenReceiveItemsDialog = () => {
    if (request?.items && request.items.length > 0) openReceive(request.id);
  };

  const handleUploadClick = (fileType: FileType) => {
    setFileTypeToUpload(fileType);
    setIsUploadDialogOpen(true);
  };

  const [poMode, setPoMode] = React.useState<"register" | "finish">("finish");
  const handleUploadQuote = () => handleUploadClick("quote");
  const handleRegisterPo = () => {
    setPoMode("register");
    handleUploadClick("po");
  };
  const handleUploadPOAndOrder = () => {
    setPoMode("finish");
    handleUploadClick("po");
  };

  const handleFileUpload = async (
    file: File | null,
    poNumber: string | undefined,
    intent: "save" | "order" | "email"
  ) => {
    if (!request) return;
    const debeGuardar = Boolean(file) || (fileTypeToUpload === "po" && Boolean(poNumber?.trim()));
    let returnedPoNumber = poNumber?.trim() || null;
    let filePath: string | null = null;

    if (debeGuardar) {
      const result = await updateFileMutation.mutateAsync({
        id: request.id,
        fileType: fileTypeToUpload,
        file: file,
        poNumber: poNumber,
      });
      returnedPoNumber = result.poNumber?.trim() || poNumber?.trim() || request.po_number || null;
      filePath = result.filePath;
    }

    const resolvedPoNumber = returnedPoNumber || request.po_number || null;
    const savedPoFile = Boolean(file || filePath || request.po_url);
    const hayPo = Boolean(resolvedPoNumber || savedPoFile);

    if (fileTypeToUpload === "po" && hayPo && intent === "save") {
      if (request.status === "Pending" || request.status === "Quote Requested") {
        await updateStatusMutation.mutateAsync({
          id: request.id,
          status: "PO Requested",
          poNumber: resolvedPoNumber,
          quoteUrl: request.quote_url,
        });
      }
    }

    if (fileTypeToUpload === "po" && hayPo && intent === "order" && request.status !== "Ordered") {
      await updateStatusMutation.mutateAsync({
        id: request.id,
        status: "Ordered",
        poNumber: resolvedPoNumber,
        quoteUrl: request.quote_url,
      });
    }

    setIsUploadDialogOpen(false);

    if (fileTypeToUpload === "po" && intent === "email") {
      await correos.enviarPedido({
        ...request,
        po_number: resolvedPoNumber,
        po_url: filePath || request.po_url,
      });
    }
  };

  const handleUpdateFullRequest = async (data: FullEditFormValues) => {
    if (!request) return;
    const accountManagerId =
      !data.accountManagerId || data.accountManagerId === "unassigned"
        ? null
        : data.accountManagerId;
    try {
      await updateFullRequestMutation.mutateAsync({
        id: request.id,
        data: {
          vendorId: data.vendorId,
          shippingAddressId: data.shippingAddressId,
          billingAddressId: data.billingAddressId,
          accountManagerId,
          notes: data.notes ?? null,
          projectCodes: data.projectCodes ?? [],
        }
      });
      setIsEditMetadataDialogOpen(false);
    } catch {
      // El toast lo emite la mutación; el diálogo permanece abierto.
    }
  };

  const handleStatusOverride = async () => {
    if (!request || !newStatus) return;
    try {
      await updateStatusMutation.mutateAsync({ id: request.id, status: newStatus as RequestStatusType });
    } catch {
      return; // la mutación ya avisa del error
    }
    setIsStatusOverrideDialogOpen(false);
  };
  
  const handleRevertReception = async () => {
    if (!request) return;
    try {
      await revertReceptionMutation.mutateAsync(request.id);
    } catch {
      return; // la mutación ya avisa del error
    }
    setIsRevertReceptionDialogOpen(false);
  };
  
  const confirmDenyRequest = async () => {
    if (!request) return;
    try {
      await updateStatusMutation.mutateAsync({ id: request.id, status: "Denied" });
    } catch {
      return; // la mutación ya avisa del error
    }
    setIsDenyDialogOpen(false);
  };

  const confirmCancelRequest = async () => {
    if (!request) return;
    try {
      await updateStatusMutation.mutateAsync({ id: request.id, status: "Cancelled" });
    } catch {
      return; // la mutación ya avisa del error
    }
    setIsCancelDialogOpen(false);
  };
  
  const confirmDeleteRequest = async () => {
    if (!request) return;
    try {
      await deleteRequestMutation.mutateAsync(request.id);
    } catch {
      return; // la mutación ya avisa del error
    }
    setIsDeleteDialogOpen(false);
    navigate("/dashboard");
  };

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates || isLoadingShippingAddresses || isLoadingBillingAddresses) {
    return <div className="p-4 sm:p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando detalles…</div>;
  }

  if (!request) {
    return (
      <div className={pageContainerClass}>
        <p className="text-muted-foreground">No se encontró la solicitud.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")} className="mt-4 w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al panel
        </Button>
      </div>
    );
  }
  
  const isEditableByRole = canEditRequestDetails(
    {
      role: profile?.role,
      userId: session?.user?.id,
      can,
      projectCodes: request.project_codes,
      projects,
      requesterId: request.requester_id,
    },
    request.status
  );
  const canDelete = canDeleteRequest(profile?.role, session?.user?.id, request.requester_id);
  const vendor = vendors?.find(v => v.id === request.vendor_id);
  const displayRequestNumber = request.request_number || `#${request.id.substring(0, 8)}`;

  return (
    <div className={pageContainerClass}>
      {/* El titulo iba a la derecha del todo, separado del boton de volver.
          Ahora el enlace de vuelta hace de miga de pan encima y el titulo
          empieza a la izquierda, donde se lee primero. */}
      <div className="mb-4 sm:mb-6 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="w-fit -ml-2 h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver al panel
        </Button>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate min-w-0">
            Solicitud {displayRequestNumber}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Más acciones" title="Más acciones" disabled={updateStatusMutation.isPending || deleteRequestMutation.isPending}><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canOverrideStatus(profile?.role) && <DropdownMenuItem onClick={() => { setNewStatus(request.status); setIsStatusOverrideDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Cambiar estado manualmente</DropdownMenuItem>}
              {canDelete && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600 dark:text-red-400"><Trash2 className="mr-2 h-4 w-4" /> Eliminar solicitud</DropdownMenuItem></>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* En el móvil las acciones van primero: es lo que se viene a hacer.
          En escritorio siguen en la columna derecha, arriba. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:grid-rows-[auto_1fr] lg:items-start">
        <section aria-labelledby="titulo-acciones" className="p-4 border rounded-lg bg-card shadow-sm lg:col-start-3 lg:row-start-1">
          <h2 id="titulo-acciones" className="text-lg font-semibold mb-2">Siguiente paso</h2>
          <RequestActions
            request={request}
            isUpdatingStatus={updateStatusMutation.isPending || updateFileMutation.isPending || revertReceptionMutation.isPending}
            handleUploadQuote={handleUploadQuote}
            handleUploadPOAndOrder={handleUploadPOAndOrder}
            handleRegisterPo={handleRegisterPo}
            handleSendPORequest={correos.solicitarPo}
            handleMarkAsReceived={handleOpenReceiveItemsDialog}
            handleMarkAsOrderedAndSendEmail={correos.enviarPedido}
            openDenyRequestDialog={() => setIsDenyDialogOpen(true)}
            openCancelRequestDialog={() => setIsCancelDialogOpen(true)}
            onSendQuoteRequest={correos.solicitarPresupuesto}
          />
          {userIsAdmin && (request.status === "Ordered" || request.status === "Received") && (
            <Button
              variant="outline"
              className="w-full mt-2 justify-start"
              onClick={() => setIsInvoiceItemsDialogOpen(true)}
            >
              <CreditCard className="mr-2 h-4 w-4" /> Registrar facturación
            </Button>
          )}
        </section>

        <div className="space-y-6 min-w-0 lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <RequestSummaryCard request={request} vendor={vendor} profiles={profiles} onEditDetails={() => setIsEditMetadataDialogOpen(true)} isEditable={isEditableByRole} />
          <RequestItemsTable items={request.items} isEditable={isEditableByRole} />
        </div>

        <div className="space-y-6 min-w-0 lg:col-start-3 lg:row-start-2">
          <RequestFilesCard request={request} onUploadClick={handleUploadClick} onSimpleFileUpload={() => Promise.resolve()} />
          <RequestActivityCard requestId={request.id} />
          <PackingSlipsList requestId={request.id} onOpenReceiveItemsDialog={handleOpenReceiveItemsDialog} requestNumber={displayRequestNumber} />
          {userIsAdmin && <InvoicesList requestId={request.id} onOpenInvoiceDialog={() => setIsInvoiceItemsDialogOpen(true)} />}
        </div>
      </div>

      <Dialog open={isEditMetadataDialogOpen} onOpenChange={setIsEditMetadataDialogOpen}>
        <DialogContent className={cn(mobileDialogClass, "sm:max-w-[600px] gap-0 overflow-hidden p-0")}>
          <div className="shrink-0 space-y-1.5 border-b px-6 py-4 pr-12">
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle>Editar detalles</DialogTitle>
              <DialogDescription>
                Gerente de cuenta y proyectos son opcionales. Puedes guardar el reorden tal cual.
              </DialogDescription>
            </DialogHeader>
          </div>
          {isEditMetadataDialogOpen && request && isEditableByRole && (
            <RequestFullEditForm
              key={request.id}
              request={request}
              profiles={profiles || []}
              onSubmit={handleUpdateFullRequest}
              isSubmitting={updateFullRequestMutation.isPending}
              onCancel={() => setIsEditMetadataDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusOverrideDialogOpen} onOpenChange={setIsStatusOverrideDialogOpen}>
        <DialogContent className={cn(mobileDialogClass, "sm:max-w-[425px]")}>
          <DialogHeader>
            <DialogTitle>Cambiar estado manualmente</DialogTitle>
            <DialogDescription>Solo para corregir errores. No envía correos ni avisos.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as RequestStatusType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REQUEST_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{getRequestStatusLabelLong(s)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusOverrideDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleStatusOverride} disabled={updateStatusMutation.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog
        open={isDenyDialogOpen}
        onOpenChange={setIsDenyDialogOpen}
        title={`Denegar la solicitud ${displayRequestNumber}`}
        description="Quedará como denegada y ya no se podrá pedir."
        confirmLabel="Denegar"
        onConfirm={confirmDenyRequest}
        isPending={updateStatusMutation.isPending}
      />
      <ConfirmDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        title={`Cancelar la solicitud ${displayRequestNumber}`}
        description={
          request.status === "Ordered"
            ? "Ya está pedida: avisa tú al proveedor para anular el pedido. LabFlow no le manda ningún correo."
            : "Quedará como cancelada y saldrá de las solicitudes activas."
        }
        cancelLabel="No, mantener"
        confirmLabel="Sí, cancelar"
        onConfirm={confirmCancelRequest}
        isPending={updateStatusMutation.isPending}
      />
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={`Eliminar la solicitud ${displayRequestNumber}`}
        description="Se borran la solicitud, sus artículos y sus documentos. No se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={confirmDeleteRequest}
        isPending={deleteRequestMutation.isPending}
      />
      <ConfirmDialog
        open={isRevertReceptionDialogOpen}
        onOpenChange={setIsRevertReceptionDialogOpen}
        title="Revertir la recepción"
        description="Se quitan del inventario los artículos recibidos y la solicitud vuelve a «Pedido realizado»."
        confirmLabel="Revertir"
        onConfirm={handleRevertReception}
        isPending={revertReceptionMutation.isPending}
      />

      <EmailDialog {...correos.dialogProps} />
      <FileUploadDialog isOpen={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen} onUpload={handleFileUpload} isUploading={updateFileMutation.isPending || updateStatusMutation.isPending} fileType={fileTypeToUpload} markAsOrdered={fileTypeToUpload === "po" && poMode === "finish"} hasExistingPoFile={Boolean(request?.po_url || request?.po_number)} />
      {request && request.items && <InvoiceItemsDialog isOpen={isInvoiceItemsDialogOpen} onOpenChange={setIsInvoiceItemsDialogOpen} requestId={request.id} requestItems={request.items} />}
    </div>
  );
};

export default RequestDetails;