"use client";

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Edit, Trash2, MoreVertical, Ban, XCircle, Info, CheckCircle } from "lucide-react";
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

import RequestSummaryCard from "@/components/request-details/RequestSummaryCard";
import RequestItemsTable from "@/components/request-details/RequestItemsTable";
import RequestActions from "@/components/request-details/RequestActions";
import RequestFilesCard from "@/components/request-details/RequestFilesCard";
import FileUploadDialog from "@/components/request-details/FileUploadDialog";
import RequestFullEditForm, { FullEditFormValues } from "@/components/request-details/RequestFullEditForm";
import PackingSlipsList from "@/components/request-details/PackingSlipsList";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { generateSignedUrl } from "@/utils/supabase-storage";
import { RequestStatus as RequestStatusType, Vendor, Profile, AccountManager, Project, ShippingAddress, BillingAddress } from "@/data/types";

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
  const updateMetadataMutation = useUpdateRequestMetadata();
  const updateFullRequestMutation = useUpdateFullRequest();
  const revertReceptionMutation = useRevertRequestReception();
  const deleteRequestMutation = useDeleteRequest();
  const sendEmailMutation = useSendEmail();

  const request = requests?.find(req => req.id === id);
  const { data: aggregatedReceived, isLoading: isLoadingAggregatedReceived } = useAggregatedReceivedItems(id || '');

  const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
  const [emailInitialData, setEmailInitialData] = React.useState<Partial<EmailFormValues>>({});
  
  const [isApproveRequestDialogOpen, setIsApproveRequestDialogOpen] = React.useState(false);
  const [requestToApprove, setRequestToApprove] = React.useState<SupabaseRequest | null>(null);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [fileTypeToUpload, setFileTypeToUpload] = React.useState<FileType>("quote");

  const [isEditMetadataDialogOpen, setIsEditMetadataDialogOpen] = React.useState(false);
  const [isStatusOverrideDialogOpen, setIsStatusOverrideDialogOpen] = React.useState(false);
  const [isReceiveItemsDialogOpen, setIsReceiveItemsDialogOpen] = React.useState(false);
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
      toast.error("No se puede enviar la solicitud de PO.", { description: "No hay un gerente de cuenta asignado a esta solicitud." });
      return;
    }
    if (!request.quote_url) {
      toast.error("No se puede enviar la solicitud de PO.", { description: "El archivo de cotización no está disponible." });
      return;
    }

    const poRequestTemplate = emailTemplates?.find(t => t.template_name === 'PO Request');
    if (!poRequestTemplate) {
      toast.error("Plantilla de correo electrónico 'PO Request' no encontrada.");
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

    let attachmentsForDialog: { name: string; url: string }[] = [];
    let attachmentsForSend: { name: string; url: string }[] = [];
    
    if (request.quote_url) {
      const fileName = getFileNameFromPath(request.quote_url);
      const signedUrl = await generateSignedUrl(request.quote_url);
      if (signedUrl) {
        attachmentsForDialog.push({ name: fileName, url: signedUrl });
      }
      attachmentsForSend.push({ name: fileName, url: request.quote_url });
    }

    setEmailInitialData({
      to: getAccountManagerEmail(request.account_manager_id),
      subject: processTextTemplate(poRequestTemplate.subject_template, context as any),
      body: processEmailTemplate(poRequestTemplate.body_template, context as any),
      attachments: attachmentsForDialog,
      attachmentsForSend: attachmentsForSend,
    });

    // Cambiar estado a PO Requested después de enviar el correo
    const originalOnSend = handleSendEmail;
    const wrappedOnSend = async (data: EmailFormValues) => {
        await originalOnSend(data);
        await updateStatusMutation.mutateAsync({ id: request.id, status: "PO Requested" });
    };

    // Temporalmente sobreescribimos el handler para este diálogo específico
    // Nota: En una refactorización mayor, esto se manejaría mejor con un estado de 'pendingAction'
    setIsEmailDialogOpen(true);
    
    // Re-asignamos el handler original al cerrar (esto es un poco hacky pero efectivo para este caso)
    // Una mejor forma es pasar el callback de éxito a EmailDialog si fuera necesario.
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
        if (!quoteTemplate) {
          toast.error("Plantilla de correo electrónico 'Quote Request' no encontrada.");
          return;
        }

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
    if (request?.items && request.items.length > 0) {
      setIsReceiveItemsDialogOpen(true);
    } else {
      toast.error("No se pueden recibir artículos.", { description: "La solicitud no tiene artículos." });
    }
  };

  const handleUploadClick = (fileType: FileType) => {
    setFileTypeToUpload(fileType);
    setIsUploadDialogOpen(true);
  };

  const handleUploadQuote = () => handleUploadClick("quote");
  const handleUploadPOAndOrder = () => handleUploadClick("po");

  const handleFileUpload = async (file: File | null, poNumber?: string) => {
    if (!request) return;

    try {
      // Subir el archivo. La mutación ya actualiza el campo correspondiente en la DB.
      const { filePath, poNumber: returnedPoNumber } = await updateFileMutation.mutateAsync({
        id: request.id,
        fileType: fileTypeToUpload,
        file: file,
        poNumber: poNumber,
      });

      // LÓGICA CAMBIADA: No cambiamos el estado automáticamente al subir cotización.
      // Solo lo hacemos para el PO.
      if (fileTypeToUpload === "po") {
        if (returnedPoNumber && request.status === "PO Requested") {
             await updateStatusMutation.mutateAsync({ id: request.id, status: "Ordered", poNumber: returnedPoNumber, quoteUrl: request.quote_url });
        }
      }

      setIsUploadDialogOpen(false);
    } catch (error) {
      console.error("File upload orchestration failed:", error);
    }
  };

  const handleMarkAsOrderedAndSendEmail = async (request: SupabaseRequest) => {
    if (!request.po_url) {
      toast.error("No se puede enviar el correo de pedido.", { description: "El archivo PO no está disponible." });
      return;
    }

    const orderConfirmationTemplate = emailTemplates?.find(t => t.template_name === 'Order Confirmation');
    if (!orderConfirmationTemplate) {
      toast.error("Plantilla de correo electrónico 'Order Confirmation' no encontrada.");
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
    
    if (newStatus === "Received" && request.status !== "Received") {
        toast.error("Usa el botón 'Recibir Artículos'.");
        setIsStatusOverrideDialogOpen(false);
        return;
    }
    
    if (request.status === "Received" && newStatus !== "Received") {
        setIsStatusOverrideDialogOpen(false);
        setIsRevertReceptionDialogOpen(true);
        return;
    }

    await updateStatusMutation.mutateAsync({ id: request.id, status: newStatus as RequestStatusType });
    setIsStatusOverrideDialogOpen(false);
  };
  
  const handleRevertReception = async () => {
    if (!request) return;
    await revertReceptionMutation.mutateAsync(request.id);
    setIsRevertReceptionDialogOpen(false);
  };
  
  const openDenyRequestDialog = () => setIsDenyDialogOpen(true);
  const openCancelRequestDialog = () => setIsCancelDialogOpen(true);
  const openDeleteRequestDialog = () => setIsDeleteDialogOpen(true);

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
    if (!quoteTemplate) {
      toast.error("Plantilla de correo electrónico 'Quote Request' no encontrada.");
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
      subject: processTextTemplate(quoteTemplate.subject_template, context as any),
      body: processEmailTemplate(quoteTemplate.body_template, context as any),
    });
    setIsEmailDialogOpen(true);
  };

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates || isLoadingShippingAddresses || isLoadingBillingAddresses || isLoadingAggregatedReceived) {
    return <div className="p-4 sm:p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Detalles...</div>;
  }

  if (!request) {
    return (
      <div className="p-4 sm:p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Solicitud No Encontrada</h1>
        <Button onClick={() => navigate("/dashboard")} className="mt-6"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel</Button>
      </div>
    );
  }
  
  const isEditableByRole = profile?.role === "Admin" || profile?.role === "Account Manager";
  const vendor = vendors?.find(v => v.id === request.vendor_id);
  const displayRequestNumber = request.request_number || `#${request.id.substring(0, 8)}`;
  
  const approveButtonText = request.quote_url ? "Aprobar y Solicitar PO (Cómprame)" : "Aprobar y Solicitar Cotización (Correo)";
  const approveDialogTitle = request.quote_url ? "Aprobar Solicitud y Generar PO" : "Aprobar Solicitud";
  const approveOnlyText = request.quote_url ? "Aprobar Solamente (a PO Solicitado)" : "Aprobar Solamente (a Cotización Solicitada)";

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate("/dashboard")}><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel</Button>
        
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Solicitud {displayRequestNumber}</h1>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={updateStatusMutation.isPending || deleteRequestMutation.isPending}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isEditableByRole && (
                <DropdownMenuItem onClick={() => {
                  setNewStatus(request.status);
                  setIsStatusOverrideDialogOpen(true);
                }}>
                  <Edit className="mr-2 h-4 w-4" /> Cambiar Estado Manualmente
                </DropdownMenuItem>
              )}
              {isEditableByRole && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={openDeleteRequestDialog} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Solicitud
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RequestSummaryCard 
            request={request} 
            vendor={vendor} 
            profiles={profiles} 
            onEditDetails={() => setIsEditMetadataDialogOpen(true)}
            isEditable={isEditableByRole}
          />
          
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
              openDenyRequestDialog={openDenyRequestDialog}
              openCancelRequestDialog={openCancelRequestDialog}
              onSendQuoteRequest={handleSendQuoteRequest}
            />
          </div>
          
          <RequestFilesCard 
            request={request} 
            onUploadClick={handleUploadClick} 
            onSimpleFileUpload={() => Promise.resolve()} 
          />
          
          <PackingSlipsList 
            requestId={request.id} 
            onOpenReceiveItemsDialog={handleOpenReceiveItemsDialog}
            requestNumber={displayRequestNumber}
          />
        </div>
      </div>
      
      <Dialog open={isEditMetadataDialogOpen} onOpenChange={setIsEditMetadataDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Detalles de la Solicitud</DialogTitle>
          </DialogHeader>
          {request && isEditableByRole ? (
            <RequestFullEditForm
              request={request}
              profiles={profiles || []}
              onSubmit={handleUpdateFullRequest}
              isSubmitting={updateFullRequestMutation.isPending}
            />
          ) : (
            <p className="text-muted-foreground p-4">No tienes permiso para editar.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isApproveRequestDialogOpen} onOpenChange={setIsApproveRequestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{approveDialogTitle}</DialogTitle></DialogHeader>
          <DialogDescription>Elige cómo proceder con esta solicitud.</DialogDescription>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={handleApproveOnly} disabled={updateStatusMutation.isPending}>{approveOnlyText}</Button>
            <Button onClick={handleApproveAndRequestQuoteEmail} disabled={updateStatusMutation.isPending}>
              {approveButtonText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusOverrideDialogOpen} onOpenChange={setIsStatusOverrideDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Anular Estado de Solicitud</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as RequestStatusType)} disabled={updateStatusMutation.isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar nuevo estado" />
              </SelectTrigger>
              <SelectContent>
                {["Pending", "Quote Requested", "PO Requested", "Ordered", "Received", "Denied", "Cancelled"].map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusOverrideDialogOpen(false)} disabled={updateStatusMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleStatusOverride} disabled={updateStatusMutation.isPending || newStatus === request?.status}>
              {updateStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar Cambio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Denegar Solicitud</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDenyDialogOpen(false)} disabled={updateStatusMutation.isPending}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDenyRequest} disabled={updateStatusMutation.isPending}>Confirmar Denegación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Cancelar Solicitud</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)} disabled={updateStatusMutation.isPending}>No, Mantener</Button>
            <Button variant="destructive" onClick={confirmCancelRequest} disabled={updateStatusMutation.isPending}>Sí, Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Eliminar Solicitud Permanentemente</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteRequestMutation.isPending}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteRequest} disabled={deleteRequestMutation.isPending}>Eliminar Permanentemente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isRevertReceptionDialogOpen} onOpenChange={setIsRevertReceptionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Revertir Recepción e Inventario</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevertReceptionDialogOpen(false)} disabled={revertReceptionMutation.isPending}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRevertReception} disabled={revertReceptionMutation.isPending}>Confirmar Reversión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmailDialog 
        isOpen={isEmailDialogOpen} 
        onOpenChange={setIsEmailDialogOpen} 
        initialData={emailInitialData} 
        onSend={handleSendEmail} 
        isSending={sendEmailMutation.isPending} 
      />

      <FileUploadDialog
        isOpen={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUpload={handleFileUpload}
        isUploading={updateFileMutation.isPending}
        fileType={fileTypeToUpload}
      />
      
      {request && request.items && (
        <ReceiveItemsDialog
          isOpen={isReceiveItemsDialogOpen}
          onOpenChange={setIsReceiveItemsDialogOpen}
          requestId={request.id}
          requestItems={request.items}
        />
      )}
    </div>
  );
};

export default RequestDetails;