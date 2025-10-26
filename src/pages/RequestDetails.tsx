"use client";

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { useRequests, SupabaseRequest, useUpdateRequestStatus, useSendEmail, useUpdateRequestFile, useUpdateRequestMetadata, useUpdateFullRequest, FileType } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { useAccountManagers } from "@/hooks/use-account-managers";
import { useProjects } from "@/hooks/use-projects";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses";
import { processEmailTemplate, processTextTemplate, processPlainTextTemplate } from "@/utils/email-templating"; // Importar processPlainTextTemplate
import EmailDialog, { EmailFormValues } from "@/components/EmailDialog";
import ReceiveItemsDialog from "@/components/ReceiveItemsDialog"; // Importar nuevo componente

// Import new modular components
import RequestSummaryCard from "@/components/request-details/RequestSummaryCard";
import RequestItemsTable from "@/components/request-details/RequestItemsTable";
import RequestActions from "@/components/request-details/RequestActions";
import RequestFilesCard from "@/components/request-details/RequestFilesCard";
import FileUploadDialog from "@/components/request-details/FileUploadDialog";
import RequestMetadataForm from "@/components/request-details/RequestMetadataForm";
import RequestFullEditForm, { FullEditFormValues } from "@/components/request-details/RequestFullEditForm";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Importar Select
import { useAggregatedReceivedItems } from "@/hooks/use-packing-slips"; // Importar hook de recepción
import { generateSignedUrl } from "@/utils/supabase-storage"; // Importar utilidad de URL firmada

// Función auxiliar para obtener el nombre de archivo legible (copiada de RequestFilesCard.tsx)
const getFileNameFromPath = (filePath: string): string => {
  if (!filePath) return "File";
  try {
    const pathParts = filePath.split('/');
    const encodedFileName = pathParts[pathParts.length - 1];
    const decodedFileName = decodeURIComponent(encodedFileName);
    
    // Eliminar el prefijo de timestamp (ej. "1678886400000_")
    const nameWithoutPrefix = decodedFileName.substring(decodedFileName.indexOf('_') + 1);
    return nameWithoutPrefix || decodedFileName || "File"; // Fallback si algo sale mal
  } catch (e) {
    console.error("Could not parse filename from path", e);
    return "File";
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
  const [newStatus, setNewStatus] = React.useState<string>(request?.status || "Pending");


  const getVendorEmail = (vendorId: string) => vendors?.find(v => v.id === vendorId)?.email || "";
  
  const getAccountManagerEmail = (managerId: string | null) => {
    if (!managerId) return "";
    const manager = accountManagers?.find(am => am.id === managerId);
    return manager?.email || "";
  };

  const handleSendEmail = async (emailData: EmailFormValues) => {
    await sendEmailMutation.mutateAsync(emailData);
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

    // Generar URL firmada para el adjunto (SOLO para mostrar en el diálogo)
    let attachmentsForDialog = [];
    let attachmentsForSend = [];
    
    if (request.quote_url) {
      const fileName = getFileNameFromPath(request.quote_url); // Usar el nombre de archivo real
      
      // 1. Generar URL firmada para el diálogo (visualización)
      const signedUrl = await generateSignedUrl(request.quote_url);
      if (signedUrl) {
        attachmentsForDialog.push({ name: fileName, url: signedUrl });
      } else {
        toast.warning("Could not generate signed URL for quote file. Attachment link in dialog may be broken.");
      }
      
      // 2. Usar la ruta de almacenamiento original para el envío (Edge Function)
      attachmentsForSend.push({ name: fileName, url: request.quote_url });
    }

    setEmailInitialData({
      to: getAccountManagerEmail(request.account_manager_id),
      subject: processTextTemplate(poRequestTemplate.subject_template, context),
      body: processPlainTextTemplate(poRequestTemplate.body_template, context), // Usar PlainText para el cuerpo editable
      attachments: attachmentsForDialog, // Usar URL firmada para el diálogo
      attachmentsForSend: attachmentsForSend, // Guardar la ruta original para el envío real
    });
    setIsEmailDialogOpen(true);
  };

  const openApproveRequestDialog = (request: SupabaseRequest) => {
    setRequestToApprove(request);
    setIsApproveRequestDialogOpen(true);
  };

  const handleApproveOnly = async () => {
    if (requestToApprove) {
      await updateStatusMutation.mutateAsync({ id: requestToApprove.id, status: "Quote Requested" });
      setIsApproveRequestDialogOpen(false);
    }
  };

  const handleApproveAndRequestQuoteEmail = async () => {
    if (requestToApprove) {
      await updateStatusMutation.mutateAsync({ id: requestToApprove.id, status: "Quote Requested" });
      
      const quoteTemplate = emailTemplates?.find(t => t.template_name === 'Quote Request');
      if (!quoteTemplate) {
        toast.error("Plantilla de correo electrónico 'Quote Request' no encontrada. Por favor, crea una en el panel de Admin.");
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

      // No hay adjuntos en este correo, solo se envía al vendor.
      
      setEmailInitialData({
        to: getVendorEmail(requestToApprove.vendor_id),
        subject: processTextTemplate(quoteTemplate.subject_template, context),
        body: processPlainTextTemplate(quoteTemplate.body_template, context), // Usar PlainText para el cuerpo editable
      });
      setIsApproveRequestDialogOpen(false);
      setIsEmailDialogOpen(true);
    }
  };

  // NUEVO: Abrir diálogo de recepción
  const handleOpenReceiveItemsDialog = () => {
    if (request?.items && request.items.length > 0) {
      setIsReceiveItemsDialogOpen(true);
    } else {
      toast.error("Cannot receive items.", { description: "The request has no items." });
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
      // Step 1: Upload the file/Save PO Number via Edge Function
      const { filePath, poNumber: returnedPoNumber } = await updateFileMutation.mutateAsync({
        id: request.id,
        fileType: fileTypeToUpload,
        file: file,
        poNumber: poNumber,
      });

      // Step 2: Update the request status based on file type
      if (fileTypeToUpload === "po") {
        // If PO Number was successfully saved, mark as Ordered
        if (returnedPoNumber && request.status === "PO Requested") {
             await updateStatusMutation.mutateAsync({ id: request.id, status: "Ordered", poNumber: returnedPoNumber, quoteUrl: request.quote_url });
        }
      } else if (fileTypeToUpload === "quote" && filePath) {
        // Quote upload is mandatory and changes status to PO Requested
        await updateStatusMutation.mutateAsync({ id: request.id, status: "PO Requested", quoteUrl: filePath });
        
        // Crear una versión actualizada de la solicitud para el contexto del correo electrónico
        const updatedRequestWithQuote = { ...request, quote_url: filePath, status: "PO Requested" as const };
        
        // Si hay un gerente de cuenta asignado, enviar el correo de solicitud de PO
        if (updatedRequestWithQuote.account_manager_id) {
          // Llamar a handleSendPORequest con la solicitud actualizada
          handleSendPORequest(updatedRequestWithQuote);
        } else {
          toast.info("Cotización subida. Por favor, asigna un Gerente de Cuenta para solicitar un PO.");
        }
      }
      // Note: 'slip' file type does not change status.

      setIsUploadDialogOpen(false);
    } catch (error) {
      console.error("File upload orchestration failed:", error);
    }
  };

  const handleMarkAsOrderedAndSendEmail = async (request: SupabaseRequest) => {
    if (!request.po_url) {
      toast.error("No se puede enviar el correo de pedido.", { description: "El archivo PO no está disponible. Por favor, sube el archivo PO primero." });
      return;
    }

    const orderConfirmationTemplate = emailTemplates?.find(t => t.template_name === 'Order Confirmation');
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
      actorProfile: profile,
      shippingAddress: shippingAddresses?.find(a => a.id === request.shipping_address_id),
      billingAddress: billingAddresses?.find(a => a.id === request.billing_address_id),
    };
    
    let attachmentsForDialog = [];
    let attachmentsForSend = [];
    
    // Generar URL firmada para Quote (para el diálogo)
    if (request.quote_url) {
      const fileName = getFileNameFromPath(request.quote_url);
      const signedUrl = await generateSignedUrl(request.quote_url);
      if (signedUrl) attachmentsForDialog.push({ name: fileName, url: signedUrl });
      attachmentsForSend.push({ name: fileName, url: request.quote_url });
    }
    
    // Generar URL firmada para PO (para el diálogo)
    if (request.po_url) {
      const fileName = getFileNameFromPath(request.po_url);
      const signedUrl = await generateSignedUrl(request.po_url);
      if (signedUrl) attachmentsForDialog.push({ name: fileName, url: signedUrl });
      attachmentsForSend.push({ name: fileName, url: request.po_url });
    }

    setEmailInitialData({
      to: getVendorEmail(request.vendor_id),
      subject: processTextTemplate(orderConfirmationTemplate.subject_template, context),
      body: processPlainTextTemplate(orderConfirmationTemplate.body_template, context), // Usar PlainText para el cuerpo editable
      attachments: attachmentsForDialog,
      attachmentsForSend: attachmentsForSend, // Guardar la ruta original para el envío real
    });
    setIsEmailDialogOpen(true);
  };

  // Handler para la edición completa (solo Pending y PO Requested)
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

  // Handler para la edición de metadatos (Quote Requested)
  const handleUpdateMetadata = async (data: { accountManagerId?: string | null; notes?: string | null; projectCodes?: string[] | null; }) => {
    if (!request) return;
    
    await updateMetadataMutation.mutateAsync({
      id: request.id,
      data: {
        accountManagerId: data.accountManagerId === 'unassigned' ? null : data.accountManagerId,
        notes: data.notes,
        projectCodes: data.projectCodes,
      }
    });
    setIsEditMetadataDialogOpen(false);
  };

  // Handler para el cambio de estado manual
  const handleStatusOverride = async () => {
    if (!request || !newStatus) return;
    
    // Validar que el nuevo estado sea uno de los permitidos
    const validStatuses: RequestStatus[] = ["Pending", "Quote Requested", "PO Requested", "Ordered", "Received"];
    if (!validStatuses.includes(newStatus as RequestStatus)) {
        toast.error("Invalid status selected.");
        return;
    }

    await updateStatusMutation.mutateAsync({ id: request.id, status: newStatus as RequestStatus });
    setIsStatusOverrideDialogOpen(false);
  };

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates || isLoadingShippingAddresses || isLoadingBillingAddresses || isLoadingAggregatedReceived) {
    return <div className="container mx-auto py-8 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Detalles de la Solicitud...</div>;
  }

  if (!request) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Solicitud No Encontrada</h1>
        <Button onClick={() => navigate("/dashboard")} className="mt-6"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel de Control</Button>
      </div>
    );
  }
  
  // Permitir la edición de ítems en todos los estados
  const isItemEditable = true; 
  
  // La edición de metadatos (manager, notes, projects) está permitida en Pending y Quote Requested.
  const isMetadataEditable = request.status === "Pending" || request.status === "Quote Requested";
  // La edición completa (Vendor, Addresses) ahora está permitida en Pending y PO Requested.
  const isFullEditAllowed = request.status === "Pending" || request.status === "PO Requested";
  
  // Permitir el cambio de estado manual solo a Admins/Account Managers
  const canOverrideStatus = profile?.role === "Admin" || profile?.role === "Account Manager";

  const vendor = vendors?.find(v => v.id === request.vendor_id);
  const displayRequestNumber = request.request_number || `#${request.id.substring(0, 8)}`;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate("/dashboard")}><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel de Control</Button>
        <h1 className="text-3xl font-bold text-gray-800">Request {displayRequestNumber}</h1>
        
        {canOverrideStatus && (
          <Button variant="secondary" onClick={() => {
            setNewStatus(request.status);
            setIsStatusOverrideDialogOpen(true);
          }}>
            <Edit className="mr-2 h-4 w-4" /> Change Status
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RequestSummaryCard 
            request={request} 
            vendor={vendor} 
            profiles={profiles} 
            onEditDetails={() => setIsEditMetadataDialogOpen(true)}
            isEditable={isMetadataEditable || isFullEditAllowed} // Permitir abrir el diálogo si se permite la edición completa o de metadatos
          />
          
          <RequestItemsTable items={request.items} isEditable={isItemEditable} />
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <RequestFilesCard request={request} onUploadClick={handleUploadClick} />
          
          {/* RequestActions ahora está fuera del flujo normal de contenido para evitar solapamientos */}
          <div className="p-4 border rounded-lg bg-card shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Actions</h3>
            <RequestActions
              request={request}
              isUpdatingStatus={updateStatusMutation.isPending || updateFileMutation.isPending}
              openApproveRequestDialog={openApproveRequestDialog}
              handleSendPORequest={handleSendPORequest}
              handleUploadQuote={handleUploadQuote}
              handleUploadPOAndOrder={handleUploadPOAndOrder}
              handleMarkAsReceived={handleOpenReceiveItemsDialog} // Usar el nuevo manejador
              handleMarkAsOrderedAndSendEmail={handleMarkAsOrderedAndSendEmail}
            />
          </div>
        </div>
      </div>
      
      {/* Diálogo de Edición de Metadatos/Completa */}
      <Dialog open={isEditMetadataDialogOpen} onOpenChange={setIsEditMetadataDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isFullEditAllowed ? "Edit Full Request Details" : "Edit Request Metadata"}</DialogTitle>
            <DialogDescription>
              {isFullEditAllowed 
                ? "Update vendor, addresses, manager, projects, and notes. (Available in Pending and PO Requested status)"
                : "Update the assigned manager, project codes, and general notes. (Available in Quote Requested status)"
              }
            </DialogDescription>
          </DialogHeader>
          {request && isFullEditAllowed ? (
            <RequestFullEditForm
              request={request}
              profiles={profiles || []}
              onSubmit={handleUpdateFullRequest}
              isSubmitting={updateFullRequestMutation.isPending}
            />
          ) : request && isMetadataEditable ? (
            <RequestMetadataForm
              request={request}
              profiles={profiles || []}
              onSubmit={handleUpdateMetadata}
              isSubmitting={updateMetadataMutation.isPending}
            />
          ) : (
            <p className="text-muted-foreground p-4">Editing is only allowed in 'Pending', 'Quote Requested', or 'PO Requested' status.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Aprobación (existente) */}
      <Dialog open={isApproveRequestDialogOpen} onOpenChange={setIsApproveRequestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aprobar Solicitud</DialogTitle></DialogHeader>
          <DialogDescription>Elige cómo proceder con esta solicitud.</DialogDescription>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={handleApproveOnly} disabled={updateStatusMutation.isPending}>Aprobar Solamente</Button>
            <Button onClick={handleApproveAndRequestQuoteEmail} disabled={updateStatusMutation.isPending}>Aprobar y Solicitar Cotización (Correo)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Cambio de Estado Manual (Override) */}
      <Dialog open={isStatusOverrideDialogOpen} onOpenChange={setIsStatusOverrideDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Override Request Status</DialogTitle>
            <DialogDescription>
              Manually change the status of Request {displayRequestNumber}. Use with caution.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={newStatus} onValueChange={setNewStatus} disabled={updateStatusMutation.isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {["Pending", "Quote Requested", "PO Requested", "Ordered", "Received"].map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusOverrideDialogOpen(false)} disabled={updateStatusMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleStatusOverride} disabled={updateStatusMutation.isPending || newStatus === request?.status}>
              {updateStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Change"}
            </Button>
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
      
      {/* Diálogo de Recepción de Ítems */}
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