"use client";

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
import { processEmailTemplate, processTextTemplate } from "@/utils/email-templating";
import EmailDialog, { EmailFormValues } from "@/components/EmailDialog";
import ReceiveItemsDialog from "@/components/ReceiveItemsDialog";
import InvoiceItemsDialog from "@/components/request-details/InvoiceItemsDialog";

import RequestSummaryCard from "@/components/request-details/RequestSummaryCard";
import RequestItemsTable from "@/components/request-details/RequestItemsTable";
import RequestActions from "@/components/request-details/RequestActions";
import RequestFilesCard from "@/components/request-details/RequestFilesCard";
import FileUploadDialog from "@/components/request-details/FileUploadDialog";
import RequestFullEditForm, { FullEditFormValues } from "@/components/request-details/RequestFullEditForm";
import PackingSlipsList from "@/components/request-details/PackingSlipsList";
import InvoicesList from "@/components/request-details/InvoicesList";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { generateSignedUrl } from "@/utils/supabase-storage";
import { RequestStatus as RequestStatusType, Vendor, Profile, AccountManager, Project, ShippingAddress, BillingAddress } from "@/data/types";
import { pageContainerClass, mobileDialogClass, dialogFooterMobileClass } from "@/lib/layout";

const getFileNameFromPath = (filePath: string): string => {
  if (!filePath) return "Archivo";
  try {
    const pathParts = filePath.split('/');
    const encodedFileName = pathParts[pathParts.length - 1];
    const decodedFileName = decodeURIComponent(encodedFileName);
    const parts = decodedFileName.split('_');
    if (parts.length > 1 && !isNaN(Number(parts[0]))) {
      return parts.slice(1).join('_');
    }
    return decodedFileName.substring(decodedFileName.indexOf('_') + 1) || decodedFileName || "Archivo";
  } catch (e) {
    return "Archivo";
  }
};

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useSession();
  const isAdmin = profile?.role === 'Admin';
  
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
  
  const [isApproveRequestDialogOpen, setIsApproveRequestDialogOpen] = React.useState(false);
  const [requestToApprove, setRequestToApprove] = React.useState<SupabaseRequest | null>(null);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [fileTypeToUpload, setFileTypeToUpload] = React.useState<FileType>("quote");

  const [isEditMetadataDialogOpen, setIsEditMetadataDialogOpen] = React.useState(false);
  const [isStatusOverrideDialogOpen, setIsStatusOverrideDialogOpen] = React.useState(false);
  const [isReceiveItemsDialogOpen, setIsReceiveItemsDialogOpen] = React.useState(false);
  const [isInvoiceItemsDialogOpen, setIsInvoiceItemsDialogOpen] = React.useState(false);
  const [isRevertReceptionDialogOpen, setIsRevertReceptionDialogOpen] = React.useState(false);
  
  const [isDenyDialogOpen, setIsDenyDialogOpen] = React.useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  const [newStatus, setNewStatus] = React.useState<RequestStatusType>(request?.status || "Pending");

  const getVendorEmail = (vendorId: string) => vendors?.find(v => v.id === vendorId)?.email || "";
  
  const getAccountManagerEmail = (managerId: string | null) => {
    if (!managerId) return "";
    const manager = accountManagers?.find(am => am.id === managerId);
    return manager?.email || "";
  };

  const handleSendEmail = async (emailData: EmailFormValues) => {
    const attachmentsToSend = (emailData.attachmentsForSend || emailData.attachments || []) as { name: string; url: string }[];
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
      toast.error("No hay un gerente de cuenta asignado.");
      return;
    }
    const poRequestTemplate = emailTemplates?.find(t => t.template_name === 'PO Request');
    if (!poRequestTemplate) return;

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

    let attachmentsForDialog: { name: string; url: string }[] = [];
    let attachmentsForSend: { name: string; url: string }[] = [];
    
    if (request.quote_url) {
      const fileName = getFileNameFromPath(request.quote_url);
      const signedUrl = await generateSignedUrl(request.quote_url);
      if (signedUrl) attachmentsForDialog.push({ name: fileName, url: signedUrl });
      attachmentsForSend.push({ name: fileName, url: request.quote_url });
    }

    setEmailInitialData({
      to: getAccountManagerEmail(request.account_manager_id),
      subject: processTextTemplate(poRequestTemplate.subject_template, context as any),
      body: processEmailTemplate(poRequestTemplate.body_template, context as any),
      attachments: attachmentsForDialog,
      attachmentsForSend: attachmentsForSend,
    });

    setIsEmailDialogOpen(true);
  };

  const openApproveRequestDialog = (request: SupabaseRequest) => {
    setRequestToApprove(request);
    setIsApproveRequestDialogOpen(true);
  };

  const handleApproveOnly = async () => {
    if (requestToApprove) {
      const nextStatus = requestToApprove.quote_url ? "PO Requested" : "Quote Requested";
      await updateStatusMutation.mutateAsync({ id: requestToApprove.id, status: nextStatus });
      setIsApproveRequestDialogOpen(false);
    }
  };

  const handleApproveAndRequestQuoteEmail = async () => {
    if (requestToApprove) {
      const nextStatus = requestToApprove.quote_url ? "PO Requested" : "Quote Requested";
      await updateStatusMutation.mutateAsync({ id: requestToApprove.id, status: nextStatus });
      
      if (nextStatus === "Quote Requested") {
        const quoteTemplate = emailTemplates?.find(t => t.template_name === 'Quote Request');
        if (!quoteTemplate) return;

        const context = {
          request: requestToApprove,
          vendor: vendors?.find(v => v.id === requestToApprove.vendor_id),
          requesterProfile: profiles?.find(p => p.id === requestToApprove.requester_id),
          accountManager: accountManagers?.find(am => am.id === requestToApprove.account_manager_id),
          projects: projects,
          actorProfile: profile,
          shippingAddress: shippingAddresses?.find(a => a.id === requestToApprove.shipping_address_id),
          billingAddress: billingAddresses?.find(a => a.id === requestToApprove.billing_address_id),
        };
        
        setEmailInitialData({
          to: getVendorEmail(requestToApprove.vendor_id),
          subject: processTextTemplate(quoteTemplate.subject_template, context as any),
          body: processEmailTemplate(quoteTemplate.body_template, context as any),
        });
        setIsApproveRequestDialogOpen(false);
        setIsEmailDialogOpen(true);
      } else {
        setIsApproveRequestDialogOpen(false);
      }
    }
  };

  const handleOpenReceiveItemsDialog = () => {
    if (request?.items && request.items.length > 0) setIsReceiveItemsDialogOpen(true);
  };

  const handleUploadClick = (fileType: FileType) => {
    setFileTypeToUpload(fileType);
    setIsUploadDialogOpen(true);
  };

  const handleUploadQuote = () => handleUploadClick("quote");
  const handleUploadPOAndOrder = () => handleUploadClick("po");

  const handleFileUpload = async (file: File | null, poNumber?: string) => {
    if (!request) return;
    const { poNumber: returnedPoNumber } = await updateFileMutation.mutateAsync({
      id: request.id,
      fileType: fileTypeToUpload,
      file: file,
      poNumber: poNumber,
    });
    if (fileTypeToUpload === "po" && returnedPoNumber && request.status === "PO Requested") {
        await updateStatusMutation.mutateAsync({ id: request.id, status: "Ordered", poNumber: returnedPoNumber, quoteUrl: request.quote_url });
    }
    setIsUploadDialogOpen(false);
  };

  const handleMarkAsOrderedAndSendEmail = async (request: SupabaseRequest) => {
    const orderConfirmationTemplate = emailTemplates?.find(t => t.template_name === 'Order Confirmation');
    if (!orderConfirmationTemplate) return;

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
    
    let attachmentsForDialog: { name: string; url: string }[] = [];
    let attachmentsForSend: { name: string; url: string }[] = [];
    
    if (request.quote_url) {
      const fileName = getFileNameFromPath(request.quote_url);
      const signedUrl = await generateSignedUrl(request.quote_url);
      if (signedUrl) attachmentsForDialog.push({ name: fileName, url: signedUrl });
      attachmentsForSend.push({ name: fileName, url: request.quote_url });
    }
    
    if (request.po_url) {
      const fileName = getFileNameFromPath(request.po_url);
      const signedUrl = await generateSignedUrl(request.po_url);
      if (signedUrl) attachmentsForDialog.push({ name: fileName, url: signedUrl });
      attachmentsForSend.push({ name: fileName, url: request.po_url });
    }

    setEmailInitialData({
      to: getVendorEmail(request.vendor_id),
      subject: processTextTemplate(orderConfirmationTemplate.subject_template, context as any),
      body: processEmailTemplate(orderConfirmationTemplate.body_template, context as any),
      attachments: attachmentsForDialog,
      attachmentsForSend: attachmentsForSend,
    });
    setIsEmailDialogOpen(true);
  };

  const handleUpdateFullRequest = async (data: FullEditFormValues) => {
    if (!request) return;
    await updateFullRequestMutation.mutateAsync({
      id: request.id,
      data: {
        vendorId: data.vendorId,
        shippingAddressId: data.shippingAddressId,
        billingAddressId: data.billingAddressId,
        accountManagerId: data.accountManagerId === 'unassigned' ? null : data.accountManagerId,
        notes: data.notes,
        projectCodes: data.projectCodes,
      }
    });
    setIsEditMetadataDialogOpen(false);
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
    await updateStatusMutation.mutateAsync({ id: request.id, status: "Quote Requested" });
    const quoteTemplate = emailTemplates?.find(t => t.template_name === 'Quote Request');
    if (!quoteTemplate) return;

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
      subject: processTextTemplate(quoteTemplate.subject_template, context as any),
      body: processEmailTemplate(quoteTemplate.body_template, context as any),
    });
    setIsEmailDialogOpen(true);
  };

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates || isLoadingShippingAddresses || isLoadingBillingAddresses) {
    return <div className="p-4 sm:p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Detalles...</div>;
  }

  if (!request) return null;
  
  const isEditableByRole = profile?.role === "Admin" || profile?.role === "Account Manager";
  const vendor = vendors?.find(v => v.id === request.vendor_id);
  const displayRequestNumber = request.request_number || `#${request.id.substring(0, 8)}`;

  return (
    <div className={pageContainerClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-fit shrink-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel
        </Button>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 truncate min-w-0">
            Solicitud {displayRequestNumber}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={updateStatusMutation.isPending || deleteRequestMutation.isPending}><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isEditableByRole && <DropdownMenuItem onClick={() => { setNewStatus(request.status); setIsStatusOverrideDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Cambiar Estado Manualmente</DropdownMenuItem>}
              {isEditableByRole && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Eliminar Solicitud</DropdownMenuItem></>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RequestSummaryCard request={request} vendor={vendor} profiles={profiles} onEditDetails={() => setIsEditMetadataDialogOpen(true)} isEditable={isEditableByRole} />
          <RequestItemsTable items={request.items} isEditable={true} />
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <div className="p-4 border rounded-lg bg-card shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Acciones</h3>
            <RequestActions
              request={request}
              isUpdatingStatus={updateStatusMutation.isPending || updateFileMutation.isPending || revertReceptionMutation.isPending}
              openApproveRequestDialog={openApproveRequestDialog}
              handleSendPORequest={handleSendPORequest}
              handleUploadQuote={handleUploadQuote}
              handleUploadPOAndOrder={handleUploadPOAndOrder}
              handleMarkAsReceived={handleOpenReceiveItemsDialog}
              handleMarkAsOrderedAndSendEmail={handleMarkAsOrderedAndSendEmail}
              openDenyRequestDialog={() => setIsDenyDialogOpen(true)}
              openCancelRequestDialog={() => setIsCancelDialogOpen(true)}
              onSendQuoteRequest={handleSendQuoteRequest}
            />
            {isAdmin && (
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
          <PackingSlipsList requestId={request.id} onOpenReceiveItemsDialog={handleOpenReceiveItemsDialog} requestNumber={displayRequestNumber} />
          
          {/* CRÍTICO: Envolver InvoicesList en check de isAdmin */}
          {isAdmin && <InvoicesList requestId={request.id} onOpenInvoiceDialog={() => setIsInvoiceItemsDialogOpen(true)} />}
        </div>
      </div>
      
      {/* ... (resto de diálogos sin cambios) */}
      <Dialog open={isEditMetadataDialogOpen} onOpenChange={setIsEditMetadataDialogOpen}>
        <DialogContent className={cn(mobileDialogClass, "sm:max-w-[600px]")}>
          <DialogHeader><DialogTitle>Editar Detalles</DialogTitle></DialogHeader>
          {request && isEditableByRole && <RequestFullEditForm request={request} profiles={profiles || []} onSubmit={handleUpdateFullRequest} isSubmitting={updateFullRequestMutation.isPending} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isApproveRequestDialogOpen} onOpenChange={setIsApproveRequestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aprobar Solicitud</DialogTitle></DialogHeader>
          <DialogFooter className={dialogFooterMobileClass}>
            <Button variant="outline" onClick={handleApproveOnly} disabled={updateStatusMutation.isPending}>Aprobar Solamente</Button>
            <Button onClick={handleApproveAndRequestQuoteEmail} disabled={updateStatusMutation.isPending}>Aprobar y Solicitar Cotización</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusOverrideDialogOpen} onOpenChange={setIsStatusOverrideDialogOpen}>
        <DialogContent className={cn(mobileDialogClass, "sm:max-w-[425px]")}>
          <DialogHeader><DialogTitle>Anular Estado</DialogTitle></DialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as RequestStatusType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Pending", "Quote Requested", "PO Requested", "Ordered", "Received", "Denied", "Cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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

      <EmailDialog isOpen={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen} initialData={emailInitialData} onSend={handleSendEmail} isSending={sendEmailMutation.isPending} />
      <FileUploadDialog isOpen={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen} onUpload={handleFileUpload} isUploading={updateFileMutation.isPending} fileType={fileTypeToUpload} />
      {request && request.items && <ReceiveItemsDialog isOpen={isReceiveItemsDialogOpen} onOpenChange={setIsReceiveItemsDialogOpen} requestId={request.id} requestItems={request.items} />}
      {request && request.items && <InvoiceItemsDialog isOpen={isInvoiceItemsDialogOpen} onOpenChange={setIsInvoiceItemsDialogOpen} requestId={request.id} requestItems={request.items} />}
    </div>
  );
};

export default RequestDetails;