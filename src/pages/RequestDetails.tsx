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

import { useRequests, SupabaseRequest, useUpdateRequestStatus, useSendEmail, useUpdateRequestFile, useUpdateRequestMetadata, useUpdateFullRequest, useRevertRequestReception, useDeleteRequest, FileType } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { useAccountManagers } from "@/hooks/use-account-managers";
import { useProjects } from "@/hooks/use-projects";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses";
import { processNamedEmailTemplate } from "@/utils/email-templating";
import EmailDialog, { EmailFormValues } from "@/components/EmailDialog";
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
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";
import { gestionaPedidos, canEditRequestDetails, canDeleteRequest, canOverrideStatus } from "@/lib/permissions";
import { useCan } from "@/hooks/use-permissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { buildStorageAttachment, normalizeAttachments } from "@/utils/email-attachments";
import { RequestStatus as RequestStatusType, Vendor, Profile, AccountManager, Project, ShippingAddress, BillingAddress } from "@/data/types";
import { cn } from "@/lib/utils";
import { pageContainerClass, mobileDialogClass } from "@/lib/layout";
import { camposCorreoConGestor, correoSiGestorLab } from "@/lib/farmacia";
import { pickEmailTemplate } from "@/lib/email-templates";
import { useLabsCatalog } from "@/components/LabsCatalogProvider";
import { getRequestStatusLabelLong, REQUEST_STATUS_ORDER } from "@/lib/request-status";

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, session } = useSession();
  const { can } = useCan();
  const { openReceive } = useReceiveWizard();
  const { memberships } = useLabsCatalog();
  const userIsAdmin = gestionaPedidos(profile?.role);
  
  const { data: requests, isLoading: isLoadingRequests } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagers();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: emailTemplates, isLoading: isLoadingEmailTemplates } = useEmailTemplates();
  const { data: shippingAddresses, isLoading: isLoadingShippingAddresses } = useShippingAddresses();
  const { data: billingAddresses, isLoading: isLoadingBillingAddresses } = useBillingAddresses();
  
  const updateStatusMutation = useUpdateRequestStatus();
  const updateFileMutation = useUpdateRequestFile();
  const updateFullRequestMutation = useUpdateFullRequest();
  const revertReceptionMutation = useRevertRequestReception();
  const deleteRequestMutation = useDeleteRequest();
  const sendEmailMutation = useSendEmail();

  const request = requests?.find(req => req.id === id);

  const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
  const [emailInitialData, setEmailInitialData] = React.useState<Partial<EmailFormValues>>({});
  const [pendingStatusOnEmailSend, setPendingStatusOnEmailSend] = React.useState<{
    requestId: string;
    status: RequestStatusType;
  } | null>(null);

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

  const getVendorQuoteEmail = (vendorId: string) => {
    const vendor = vendors?.find((v) => v.id === vendorId);
    return (vendor?.email_presupuesto || vendor?.email || "").trim();
  };
  const getVendorOrderEmail = (vendorId: string) => {
    const vendor = vendors?.find((v) => v.id === vendorId);
    return (vendor?.email_pedido || vendor?.email || "").trim();
  };
  
  const getAccountManagerEmail = (managerId: string | null) => {
    if (!managerId) return "";
    const manager = accountManagers?.find(am => am.id === managerId);
    return manager?.email || "";
  };

  const correoGestor = (request: SupabaseRequest) =>
    correoSiGestorLab({
      shippingAddressId: request.shipping_address_id,
      addresses: shippingAddresses,
      requesterId: request.requester_id,
      actorId: profile?.id,
      personas: profiles,
      labId: request.lab_id,
      requestSedeId: request.sede_id,
      memberships,
    });

  const handleEmailDialogOpenChange = (open: boolean) => {
    setIsEmailDialogOpen(open);
    if (!open) setPendingStatusOnEmailSend(null);
  };

  const handleSendEmail = async (emailData: EmailFormValues) => {
    await sendEmailMutation.mutateAsync({
      to: emailData.to!,
      subject: emailData.subject,
      body: emailData.body,
      fromName: emailData.fromName,
      from: emailData.from || undefined,
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

  const handleSendPORequest = async (request: SupabaseRequest) => {
    const especial = correoGestor(request);
    if (especial?.error) {
      toast.error(especial.error);
      return;
    }
    if (!especial && !request.account_manager_id) {
      toast.error("No hay un gerente de cuenta asignado.");
      return;
    }
    const poRequestTemplate = pickEmailTemplate(emailTemplates, 'PO Request', request.lab_id);
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
      profiles: profiles,
      actorProfile: profile,
      shippingAddress: shippingAddresses?.find(a => a.id === request.shipping_address_id),
      billingAddress: billingAddresses?.find(a => a.id === request.billing_address_id),
    };

    const { forDialog, forSend } = request.quote_url
      ? await buildStorageAttachment(request.quote_url)
      : { forDialog: [], forSend: [] };

    const { subject, body } = processNamedEmailTemplate(
      "PO Request",
      poRequestTemplate.subject_template,
      poRequestTemplate.body_template,
      context
    );

    setPendingStatusOnEmailSend({ requestId: request.id, status: "PO Requested" });
    setEmailInitialData({
      ...camposCorreoConGestor(especial, getAccountManagerEmail(request.account_manager_id)),
      subject,
      body,
      attachments: forDialog,
      attachmentsForSend: forSend,
    });

    setIsEmailDialogOpen(true);
  };

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
      await handleMarkAsOrderedAndSendEmail({
        ...request,
        po_number: resolvedPoNumber,
        po_url: filePath || request.po_url,
      });
    }
  };

  const handleMarkAsOrderedAndSendEmail = async (request: SupabaseRequest) => {
    const orderConfirmationTemplate = pickEmailTemplate(emailTemplates, 'Order Confirmation', request.lab_id);
    if (!orderConfirmationTemplate) {
      toast.error("Plantilla de correo electrónico 'Order Confirmation' no encontrada. Por favor, crea una en el panel de Admin.");
      return;
    }

    const context = {
      request,
      vendor: vendors?.find(v => v.id === request.vendor_id),
      requesterProfile: profiles?.find(p => p.id === request.requester_id),
      accountManager: accountManagers?.find(am => am.id === request.account_manager_id),
      projects: projects,
      profiles: profiles,
      actorProfile: profile,
      shippingAddress: shippingAddresses?.find(a => a.id === request.shipping_address_id),
      billingAddress: billingAddresses?.find(a => a.id === request.billing_address_id),
    };
    
    const attachmentsForDialog: { name: string; url: string }[] = [];
    const attachmentsForSend: { name: string; url: string }[] = [];

    if (request.quote_url) {
      const quoteAttachment = await buildStorageAttachment(request.quote_url);
      attachmentsForDialog.push(...quoteAttachment.forDialog);
      attachmentsForSend.push(...quoteAttachment.forSend);
    }

    if (request.po_url) {
      const poAttachment = await buildStorageAttachment(request.po_url);
      attachmentsForDialog.push(...poAttachment.forDialog);
      attachmentsForSend.push(...poAttachment.forSend);
    }

    const { subject, body } = processNamedEmailTemplate(
      "Order Confirmation",
      orderConfirmationTemplate.subject_template,
      orderConfirmationTemplate.body_template,
      context as any
    );

    if (request.status !== "Ordered") {
      setPendingStatusOnEmailSend({ requestId: request.id, status: "Ordered" });
    }

    setEmailInitialData({
      to: getVendorOrderEmail(request.vendor_id),
      subject,
      body,
      attachments: attachmentsForDialog,
      attachmentsForSend: attachmentsForSend,
    });
    setIsEmailDialogOpen(true);
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
    await updateStatusMutation.mutateAsync({ id: request.id, status: newStatus as RequestStatusType });
    setIsStatusOverrideDialogOpen(false);
  };
  
  const handleRevertReception = async () => {
    if (!request) return;
    await revertReceptionMutation.mutateAsync(request.id);
    setIsRevertReceptionDialogOpen(false);
  };
  
  const confirmDenyRequest = async () => {
    if (!request) return;
    await updateStatusMutation.mutateAsync({ id: request.id, status: "Denied" });
    setIsDenyDialogOpen(false);
  };

  const confirmCancelRequest = async () => {
    if (!request) return;
    await updateStatusMutation.mutateAsync({ id: request.id, status: "Cancelled" });
    setIsCancelDialogOpen(false);
  };
  
  const confirmDeleteRequest = async () => {
    if (!request) return;
    await deleteRequestMutation.mutateAsync(request.id);
    setIsDeleteDialogOpen(false);
    navigate("/dashboard");
  };

  const handleSendQuoteRequest = async (request: SupabaseRequest) => {
    const especial = correoGestor(request);
    if (especial?.error) {
      toast.error(especial.error);
      return;
    }
    const quoteTemplate = pickEmailTemplate(emailTemplates, 'Quote Request', request.lab_id);
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
      profiles: profiles,
      actorProfile: profile,
      shippingAddress: shippingAddresses?.find(a => a.id === request.shipping_address_id),
      billingAddress: billingAddresses?.find(a => a.id === request.billing_address_id),
    };

    try {
      const { subject, body } = processNamedEmailTemplate(
        "Quote Request",
        quoteTemplate.subject_template,
        quoteTemplate.body_template,
        context
      );

      // El estado avanza solo cuando el correo se envía de verdad. Si se cierra el
      // diálogo o algo falla antes, la solicitud sigue pendiente.
      setPendingStatusOnEmailSend({ requestId: request.id, status: "Quote Requested" });
      setEmailInitialData({
        ...camposCorreoConGestor(especial, getVendorQuoteEmail(request.vendor_id)),
        subject,
        body,
      });
      setIsEmailDialogOpen(true);
    } catch (error) {
      toast.error("No se pudo preparar el correo de presupuesto.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates || isLoadingShippingAddresses || isLoadingBillingAddresses) {
    return <div className="p-4 sm:p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Detalles...</div>;
  }

  if (!request) {
    return (
      <div className={pageContainerClass}>
        <p className="text-muted-foreground">No se encontró la solicitud.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")} className="mt-4 w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel
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
              <Button variant="outline" size="icon" disabled={updateStatusMutation.isPending || deleteRequestMutation.isPending}><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canOverrideStatus(profile?.role) && <DropdownMenuItem onClick={() => { setNewStatus(request.status); setIsStatusOverrideDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Cambiar Estado Manualmente</DropdownMenuItem>}
              {canDelete && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600 dark:text-red-400"><Trash2 className="mr-2 h-4 w-4" /> Eliminar Solicitud</DropdownMenuItem></>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RequestSummaryCard request={request} vendor={vendor} profiles={profiles} onEditDetails={() => setIsEditMetadataDialogOpen(true)} isEditable={isEditableByRole} />
          <RequestItemsTable items={request.items} isEditable={isEditableByRole} />
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <div className="p-4 border rounded-lg bg-card shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Acciones</h3>
            <RequestActions
              request={request}
              isUpdatingStatus={updateStatusMutation.isPending || updateFileMutation.isPending || revertReceptionMutation.isPending}
              handleUploadQuote={handleUploadQuote}
              handleUploadPOAndOrder={handleUploadPOAndOrder}
              handleRegisterPo={handleRegisterPo}
              handleMarkAsReceived={handleOpenReceiveItemsDialog}
              handleMarkAsOrderedAndSendEmail={handleMarkAsOrderedAndSendEmail}
              openDenyRequestDialog={() => setIsDenyDialogOpen(true)}
              openCancelRequestDialog={() => setIsCancelDialogOpen(true)}
              onSendQuoteRequest={handleSendQuoteRequest}
            />
            {userIsAdmin && (
                <Button 
                    variant="secondary" 
                    className="w-full mt-2 justify-start" 
                    onClick={() => setIsInvoiceItemsDialogOpen(true)}
                >
                    <CreditCard className="mr-2 h-4 w-4" /> Registrar Facturación
                </Button>
            )}
          </div>
          
          <RequestFilesCard request={request} onUploadClick={handleUploadClick} onSimpleFileUpload={() => Promise.resolve()} />
          <RequestActivityCard requestId={request.id} />
          <PackingSlipsList requestId={request.id} onOpenReceiveItemsDialog={handleOpenReceiveItemsDialog} requestNumber={displayRequestNumber} />
          
          {/* CRÍTICO: Envolver InvoicesList en check de isAdmin */}
          {userIsAdmin && <InvoicesList requestId={request.id} onOpenInvoiceDialog={() => setIsInvoiceItemsDialogOpen(true)} />}
        </div>
      </div>
      
      {/* ... (resto de diálogos sin cambios) */}
      <Dialog open={isEditMetadataDialogOpen} onOpenChange={setIsEditMetadataDialogOpen}>
        <DialogContent className={cn(mobileDialogClass, "sm:max-w-[600px] gap-0 overflow-hidden p-0")}>
          <div className="shrink-0 space-y-1.5 border-b px-6 py-4 pr-12">
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle>Editar Detalles</DialogTitle>
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
          <DialogHeader><DialogTitle>Anular Estado</DialogTitle></DialogHeader>
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
      
      <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Denegar Solicitud</DialogTitle></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsDenyDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={confirmDenyRequest}>Confirmar</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Cancelar Solicitud</DialogTitle></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>No</Button><Button variant="destructive" onClick={confirmCancelRequest}>Sí, Cancelar</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Eliminar Solicitud</DialogTitle></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={confirmDeleteRequest}>Eliminar</Button></DialogFooter></DialogContent>
      </Dialog>
      
      <Dialog open={isRevertReceptionDialogOpen} onOpenChange={setIsRevertReceptionDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Revertir Recepción</DialogTitle></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsRevertReceptionDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleRevertReception}>Confirmar</Button></DialogFooter></DialogContent>
      </Dialog>

      <EmailDialog isOpen={isEmailDialogOpen} onOpenChange={handleEmailDialogOpenChange} initialData={emailInitialData} onSend={handleSendEmail} isSending={sendEmailMutation.isPending} />
      <FileUploadDialog isOpen={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen} onUpload={handleFileUpload} isUploading={updateFileMutation.isPending || updateStatusMutation.isPending} fileType={fileTypeToUpload} markAsOrdered={fileTypeToUpload === "po" && poMode === "finish"} hasExistingPoFile={Boolean(request?.po_url || request?.po_number)} />
      {request && request.items && <InvoiceItemsDialog isOpen={isInvoiceItemsDialogOpen} onOpenChange={setIsInvoiceItemsDialogOpen} requestId={request.id} requestItems={request.items} />}
    </div>
  );
};

export default RequestDetails;