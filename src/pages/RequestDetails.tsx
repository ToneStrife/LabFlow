"use client";

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Edit, Trash2, MoreVertical, Ban, XCircle } from "lucide-react";
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
import { processEmailTemplate, processTextTemplate } from "@/utils/email-templating"; // Changed import
import EmailDialog, { EmailFormValues } from "@/components/EmailDialog";
import ReceiveItemsDialog from "@/components/ReceiveItemsDialog";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { generateSignedUrl } from "@/utils/supabase-storage";
import { RequestStatus as RequestStatusType, Vendor, Profile, AccountManager, Project, ShippingAddress, BillingAddress } from "@/data/types"; // Corrected import

// Función auxiliar para obtener el nombre de archivo legible (copiada de RequestFilesCard.tsx)
const getFileNameFromPath = (filePath: string): string => {
  if (!filePath) return "Archivo";
  try {
    // 1. Obtener el nombre de archivo codificado (última parte de la ruta)
    const pathParts = filePath.split('/');
    const encodedFileName = pathParts[pathParts.length - 1];
    const decodedFileName = decodeURIComponent(encodedFileName);
    
    // 2. Eliminar el prefijo de timestamp (ej. 1721937600000_my_file.pdf)
    const parts = decodedFileName.split('_');
    if (parts.length > 1 && !isNaN(Number(parts[0]))) {
      // Si la primera parte es un número (timestamp), devolver el resto
      return parts.slice(1).join('_');
    }
    
    // Fallback si el formato no coincide o si es el formato antiguo
    return decodedFileName.substring(decodedFileName.indexOf('_') + 1) || decodedFileName || "Archivo";
  } catch (e) {
    console.error("Could not parse filename from path", e);
    return "Archivo";
  }
};


const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, session } = useSession(); // Added session to useSession
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
  const revertReceptionMutation = useRevertRequestReception(); // Nuevo hook
  const deleteRequestMutation = useDeleteRequest(); // Nuevo hook
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
  
  // Nuevos estados para Denegar/Cancelar/Eliminar
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
    // Asegurar que attachmentsForSend y attachments tengan el tipo correcto
    const attachmentsToSend = (emailData.attachmentsForSend || emailData.attachments || []) as { name: string; url: string }[];
    
    await sendEmailMutation.mutateAsync({
      to: emailData.to!, // Ensure 'to' is not undefined
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

    // Preparar adjuntos:
    let attachmentsForDialog: { name: string; url: string }[] = [];
    let attachmentsForSend: { name: string; url: string }[] = [];
    
    if (request.quote_url) {
      const fileName = getFileNameFromPath(request.quote_url); // Usar el nombre de archivo real
      
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
      subject: processTextTemplate(poRequestTemplate.subject_template, context as any), // Cast to any to bypass deep type checking
      body: processEmailTemplate(poRequestTemplate.body_template, context as any), // Use processEmailTemplate
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
      // If already has quote, approving means moving to PO Requested (Buy Me)
      const nextStatus = requestToApprove.quote_url ? "PO Requested" : "Quote Requested";
      await updateStatusMutation.mutateAsync({ id: requestToApprove.id, status: nextStatus });
      setIsApproveRequestDialogOpen(false);
    }
  };

  const handleApproveAndRequestQuoteEmail = async () => {
    if (requestToApprove) {
      // If already has quote, approving means moving to PO Requested (Buy Me)
      const nextStatus = requestToApprove.quote_url ? "PO Requested" : "Quote Requested";
      await updateStatusMutation.mutateAsync({ id: requestToApprove.id, status: nextStatus });
      
      // If the status is Quote Requested, send the email to the vendor.
      if (nextStatus === "Quote Requested") {
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
        
        setEmailInitialData({
          to: getVendorEmail(requestToApprove.vendor_id),
          subject: processTextTemplate(quoteTemplate.subject_template, context as any), // Cast to any
          body: processEmailTemplate(quoteTemplate.body_template, context as any), // Use processEmailTemplate
        });
        setIsApproveRequestDialogOpen(false);
        setIsEmailDialogOpen(true);
      } else {
        // If it moves to PO Requested, just close the dialog.
        setIsApproveRequestDialogOpen(false);
      }
    }
  };

  // NUEVO: Abrir diálogo de recepción
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
      // Step 1: Upload the file/Save PO Number via Edge Function
      const { filePath, poNumber: returnedPoNumber } = await updateFileMutation.mutateAsync({
        id: request.id,
        fileType: fileTypeToUpload,
        file: file,
        poNumber: poNumber,
      });

      // Step 2: Update the request status based on file type
      if (fileTypeToUpload === "quote" && filePath) {
        // If a quote is uploaded, the status changes to PO Requested (Buy Me)
        await updateStatusMutation.mutateAsync({ id: request.id, status: "PO Requested", quoteUrl: filePath });
        
        // Create an updated version of the request for email context
        const updatedRequestWithQuote = { ...request, quote_url: filePath, status: "PO Requested" as const };
        
        // If an account manager is assigned, send the PO request email
        if (updatedRequestWithQuote.account_manager_id) {
          handleSendPORequest(updatedRequestWithQuote);
        } else {
          toast.info("Cotización subida. Por favor, asigna un Gerente de Cuenta para solicitar un PO.");
        }
      } else if (fileTypeToUpload === "po") {
        // If PO Number was successfully saved, mark as Ordered
        if (returnedPoNumber && request.status === "PO Requested") {
             await updateStatusMutation.mutateAsync({ id: request.id, status: "Ordered", poNumber: returnedPoNumber, quoteUrl: request.quote_url });
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
    
    let attachmentsForDialog: { name: string; url: string }[] = [];
    let attachmentsForSend: { name: string; url: string }[] = [];
    
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
      subject: processTextTemplate(orderConfirmationTemplate.subject_template, context as any), // Cast to any
      body: processEmailTemplate(orderConfirmationTemplate.body_template, context as any), // Use processEmailTemplate
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
    
    const validStatuses: RequestStatusType[] = ["Pending", "Quote Requested", "PO Requested", "Ordered", "Received", "Denied", "Cancelled"];
    if (!validStatuses.includes(newStatus as RequestStatusType)) {
        toast.error("Estado no válido seleccionado.");
        return;
    }
    
    if (newStatus === "Received" && request.status !== "Received") {
        // BLOQUEAR CAMBIO MANUAL A 'RECEIVED'
        toast.error("Usa el botón 'Recibir Artículos'.", {
            description: "El estado 'Recibido' debe registrarse a través del diálogo de recepción para actualizar el inventario y los albaranes correctamente.",
        });
        setIsStatusOverrideDialogOpen(false);
        return;
    }
    
    if (request.status === "Received" && newStatus !== "Received") {
        // Si intentamos cambiar de Received a otro estado, abrimos el diálogo de reversión
        setIsStatusOverrideDialogOpen(false);
        setIsRevertReceptionDialogOpen(true);
        return;
    }

    await updateStatusMutation.mutateAsync({ id: request.id, status: newStatus as RequestStatusType });
    setIsStatusOverrideDialogOpen(false);
  };
  
  // Handler para la reversión de recepción
  const handleRevertReception = async () => {
    if (!request) return;
    await revertReceptionMutation.mutateAsync(request.id);
    setIsRevertReceptionDialogOpen(false);
  };
  
  // NUEVOS HANDLERS DE ACCIÓN
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
    navigate("/dashboard"); // Redirect after deletion
  };
  // FIN NUEVOS HANDLERS DE ACCIÓN

  // NUEVO: Handler para el botón de "Solicitar Cotización" en la página de detalles
  const handleSendQuoteRequest = async (request: SupabaseRequest) => {
    // Primero, actualizamos el estado de la solicitud a "Quote Requested"
    await updateStatusMutation.mutateAsync({ id: request.id, status: "Quote Requested" });

    // Luego, preparamos y abrimos el diálogo de correo
    const quoteTemplate = emailTemplates?.find(t => t.template_name === 'Quote Request');
    if (!quoteTemplate) {
      toast.error("Plantilla de correo electrónico 'Quote Request' no encontrada. Por favor, crea una en el panel de Admin.");
      return;
    }

    const context = {
      request: { ...request, status: "Quote Requested" as const }, // Usar el estado actualizado para el contexto
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


  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates || isLoadingShippingAddresses || isLoadingBillingAddresses || isLoadingAggregatedReceived) {
    return <div className="p-4 sm:p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Detalles de la Solicitud...</div>;
  }

  if (!request) {
    return (
      <div className="p-4 sm:p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Solicitud No Encontrada</h1>
        <Button onClick={() => navigate("/dashboard")} className="mt-6"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel de Control</Button>
      </div>
    );
  }
  
  // Permitir la edición de ítems en todos los estados
  const isItemEditable = true; 
  
  // LÓGICA ACTUALIZADA: Permitir la edición completa de metadatos si el usuario es Admin o Account Manager
  const isEditableByRole = profile?.role === "Admin" || profile?.role === "Account Manager";
  const isFullEditAllowed = isEditableByRole; // Permitir edición completa en cualquier estado si tiene el rol
  
  // Permitir el cambio de estado manual solo a Admins/Account Managers
  const canOverrideStatus = isEditableByRole;
  const canDelete = isEditableByRole;

  const vendor = vendors?.find(v => v.id === request.vendor_id);
  const displayRequestNumber = request.request_number || `#${request.id.substring(0, 8)}`;
  
  // Determinar el texto del botón de aprobación
  const approveButtonText = request.quote_url ? "Aprobar y Solicitar PO (Cómprame)" : "Aprobar y Solicitar Cotización (Correo)";
  const approveDialogTitle = request.quote_url ? "Aprobar Solicitud y Generar PO" : "Aprobar Solicitud";
  const approveOnlyText = request.quote_url ? "Aprobar Solamente (a PO Solicitado)" : "Aprobar Solamente (a Cotización Solicitada)";


  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate("/dashboard")}><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel de Control</Button>
        
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Solicitud {displayRequestNumber}</h1>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={updateStatusMutation.isPending || deleteRequestMutation.isPending}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canOverrideStatus && (
                <DropdownMenuItem onClick={() => {
                  setNewStatus(request.status);
                  setIsStatusOverrideDialogOpen(true);
                }}>
                  <Edit className="mr-2 h-4 w-4" /> Cambiar Estado Manualmente
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  {canOverrideStatus && <DropdownMenuSeparator />}
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
            isEditable={isFullEditAllowed} // Usar isFullEditAllowed para el botón de edición
          />
          
          <RequestItemsTable items={request.items} isEditable={isItemEditable} />
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
          
          <RequestFilesCard request={request} onUploadClick={handleUploadClick} />
        </div>
      </div>
      
      {/* Diálogo de Edición de Metadatos/Completa */}
      <Dialog open={isEditMetadataDialogOpen} onOpenChange={setIsEditMetadataDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Detalles de la Solicitud</DialogTitle>
            <DialogDescription>
              Actualiza proveedor, direcciones, gerente, proyectos y notas. (Disponible en todos los estados para Administradores y Gerentes de Cuenta)
            </DialogDescription>
          </DialogHeader>
          {request && isFullEditAllowed ? (
            <RequestFullEditForm
              request={request}
              profiles={profiles || []}
              onSubmit={handleUpdateFullRequest}
              isSubmitting={updateFullRequestMutation.isPending}
            />
          ) : (
            <p className="text-muted-foreground p-4">No tienes permiso para editar los detalles de esta solicitud.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Aprobación (existente) */}
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

      {/* Diálogo de Cambio de Estado Manual (Override) */}
      <Dialog open={isStatusOverrideDialogOpen} onOpenChange={setIsStatusOverrideDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Anular Estado de Solicitud</DialogTitle>
            <DialogDescription>
              Cambia manualmente el estado de la Solicitud {displayRequestNumber}. Úsalo con precaución.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as RequestStatusType)} disabled={updateStatusMutation.isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar nuevo estado" />
              </SelectTrigger>
              <SelectContent>
                {["Pending", "Quote Requested", "PO Requested", "Ordered", "Received", "Denied", "Cancelled"].map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "Pending" && "Pendiente"}
                    {status === "Quote Requested" && "Cotización Solicitada"}
                    {status === "PO Requested" && "PO Solicitado (Cómprame)"}
                    {status === "Ordered" && "Pedido"}
                    {status === "Received" && "Recibido"}
                    {status === "Denied" && "Denegada"}
                    {status === "Cancelled" && "Cancelada"}
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
      
      {/* Diálogo de Denegación */}
      <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Denegar Solicitud</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas denegar la Solicitud {displayRequestNumber}? Esta acción cambiará su estado a "Denegada".
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
              ¿Estás seguro de que deseas cancelar la Solicitud {displayRequestNumber}? Esta acción cambiará su estado a "Cancelada".
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

      {/* Diálogo de Eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Eliminar Solicitud Permanentemente</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. ¿Estás seguro de que deseas eliminar la Solicitud {displayRequestNumber} en estado "{request?.status}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteRequestMutation.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRequest} disabled={deleteRequestMutation.isPending}>
              {deleteRequestMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Eliminar Permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Confirmación de Reversión de Recepción */}
      <Dialog open={isRevertReceptionDialogOpen} onOpenChange={setIsRevertReceptionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Revertir Recepción e Inventario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas revertir la Solicitud {displayRequestNumber} de "Recibido" a "Pedido"? Esta acción eliminará permanentemente todos los albaranes asociados y disminuirá las cantidades correspondientes del Inventario.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevertReceptionDialogOpen(false)} disabled={revertReceptionMutation.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRevertReception} disabled={revertReceptionMutation.isPending}>
              {revertReceptionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar Reversión y Quitar del Inventario"}
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