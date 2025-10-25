"use client";

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { useRequests, SupabaseRequest, useUpdateRequestStatus, useSendEmail, useUpdateRequestFile, useUpdateRequestMetadata, FileType } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { useAccountManagers } from "@/hooks/use-account-managers";
import { useProjects } from "@/hooks/use-projects"; // Importar useProjects
import { useEmailTemplates } from "@/hooks/use-email-templates"; // Importar useEmailTemplates
import { processEmailTemplate } from "@/utils/email-templating"; // Importar la utilidad de templating
import EmailDialog, { EmailFormValues } from "@/components/EmailDialog";

// Import new modular components
import RequestSummaryCard from "@/components/request-details/RequestSummaryCard";
import RequestItemsTable from "@/components/request-details/RequestItemsTable";
import RequestActions from "@/components/request-details/RequestActions";
import RequestFilesCard from "@/components/request-details/RequestFilesCard";
import FileUploadDialog from "@/components/request-details/FileUploadDialog";
import RequestMetadataForm from "@/components/request-details/RequestMetadataForm";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider"; // Importar useSession

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, profile } = useSession(); // Obtener la sesión y el perfil del usuario actual
  const { data: requests, isLoading: isLoadingRequests } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagers();
  const { data: projects, isLoading: isLoadingProjects } = useProjects(); // Usar el hook de proyectos
  const { data: emailTemplates, isLoading: isLoadingEmailTemplates } = useEmailTemplates(); // Usar el hook de plantillas
  const updateStatusMutation = useUpdateRequestStatus();
  const updateFileMutation = useUpdateRequestFile();
  const updateMetadataMutation = useUpdateRequestMetadata();
  const sendEmailMutation = useSendEmail();

  const request = requests?.find(req => req.id === id);

  const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
  const [emailInitialData, setEmailInitialData] = React.useState<Partial<EmailFormValues>>({});
  
  const [isApproveRequestDialogOpen, setIsApproveRequestDialogOpen] = React.useState(false);
  const [requestToApprove, setRequestToApprove] = React.useState<SupabaseRequest | null>(null);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [fileTypeToUpload, setFileTypeToUpload] = React.useState<FileType>("quote");

  const getVendorEmail = (vendorId: string) => vendors?.find(v => v.id === vendorId)?.email || "";
  
  const getAccountManagerEmail = (managerId: string | null) => {
    if (!managerId) return "";
    const manager = accountManagers?.find(am => am.id === managerId);
    return manager?.email || "";
  };

  const getRequesterName = (requesterId: string) => getFullName(profiles?.find(p => p.id === requesterId));
  
  const getAccountManagerName = (managerId: string | null) => {
    if (!managerId) return "N/A";
    const manager = accountManagers?.find(am => am.id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name}` : "N/A";
  };

  const handleSendEmail = async (emailData: EmailFormValues) => {
    await sendEmailMutation.mutateAsync(emailData);
    setIsEmailDialogOpen(false);
  };

  const handleSendPORequest = (request: SupabaseRequest) => {
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
    };

    const attachments = request.quote_url ? [{ name: `Quote_Request_${request.id}.pdf`, url: request.quote_url }] : [];

    setEmailInitialData({
      to: getAccountManagerEmail(request.account_manager_id),
      subject: processEmailTemplate(poRequestTemplate.subject_template, context),
      body: processEmailTemplate(poRequestTemplate.body_template, context),
      attachments,
    });
    setIsEmailDialogOpen(true);
  };

  const openApproveRequestDialog = (request: SupabaseRequest) => {
    setRequestToApprove(request);
    setIsApproveRequestDialogOpen(true);
  };

  const handleApproveAndRequestQuoteEmail = async () => {
    if (requestToApprove) {
      await updateStatusMutation.mutateAsync({ id: requestToApprove.id, status: "Quote Requested" });
      
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
      };

      setEmailInitialData({
        to: getVendorEmail(requestToApprove.vendor_id),
        subject: processEmailTemplate(quoteTemplate.subject_template, context),
        body: processEmailTemplate(quoteTemplate.body_template, context),
      });
      setIsApproveRequestDialogOpen(false);
      setIsEmailDialogOpen(true);
    }
  };

  const handleMarkAsReceived = async (request: SupabaseRequest) => {
    await updateStatusMutation.mutateAsync({ id: request.id, status: "Received" });
  };

  const handleUploadClick = (fileType: FileType) => {
    setFileTypeToUpload(fileType);
    setIsUploadDialogOpen(true);
  };

  const handleUploadQuote = () => {
    handleUploadClick("quote");
  };

  const handleUploadPOAndOrder = () => {
    handleUploadClick("po");
  };

  const handleFileUpload = async (file: File, poNumber?: string) => {
    if (request) {
      // Llama a la API con el objeto File real
      const { fileUrl, poNumber: returnedPoNumber } = await updateFileMutation.mutateAsync({
        id: request.id,
        fileType: fileTypeToUpload,
        file: file, // Pasa el objeto File
        poNumber: poNumber,
      });

      if (fileTypeToUpload === "po") {
        await updateStatusMutation.mutateAsync({ id: request.id, status: "Ordered", poNumber: returnedPoNumber });
      }
      
      if (fileTypeToUpload === "quote") {
        await updateStatusMutation.mutateAsync({ id: request.id, status: "PO Requested", quoteUrl: fileUrl });
        
        // Después de subir la cotización y cambiar el estado a PO Requested, enviar el correo de solicitud de PO
        // Asegúrate de que el request esté actualizado con la nueva quote_url antes de enviar el correo
        const updatedRequestWithQuote = { ...request, quote_url: fileUrl, status: "PO Requested" };
        if (updatedRequestWithQuote.account_manager_id) {
          handleSendPORequest(updatedRequestWithQuote);
        } else {
          toast.info("Cotización subida. Por favor, asigna un Gerente de Cuenta para solicitar un PO.");
        }
      }

      setIsUploadDialogOpen(false);
    }
  };

  const handleMarkAsOrderedAndSendEmail = (request: SupabaseRequest) => {
    if (!request.po_url) {
      toast.error("No se puede enviar el correo de pedido.", { description: "El archivo PO no está disponible. Por favor, sube el archivo PO primero." });
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
    };
    
    const attachments = [];
    if (request.quote_url) attachments.push({ name: `Quote_Request_${request.id}.pdf`, url: request.quote_url });
    if (request.po_url) attachments.push({ name: `PO_${request.po_number || request.id}.pdf`, url: request.po_url });

    setEmailInitialData({
      to: getVendorEmail(request.vendor_id),
      subject: processEmailTemplate(orderConfirmationTemplate.subject_template, context),
      body: processEmailTemplate(orderConfirmationTemplate.body_template, context),
      attachments,
    });
    setIsEmailDialogOpen(true);
  };

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
  };


  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates) {
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

  const vendor = vendors?.find(v => v.id === request.vendor_id);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button variant="outline" onClick={() => navigate("/dashboard")}><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel de Control</Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RequestSummaryCard request={request} vendor={vendor} profiles={profiles} />
          <RequestItemsTable items={request.items} />
        </div>
        <div className="lg:col-span-1">
          <RequestFilesCard request={request} onUploadClick={handleUploadClick} />
        </div>
      </div>
      
      <div className="mt-6">
        <h2 className="text-2xl font-bold mb-4">Metadatos de la Solicitud</h2>
        <RequestMetadataForm
          request={request}
          profiles={profiles || []}
          onSubmit={handleUpdateMetadata}
          isSubmitting={updateMetadataMutation.isPending}
        />
      </div>

      <RequestActions
        request={request}
        isUpdatingStatus={updateStatusMutation.isPending || updateFileMutation.isPending}
        openApproveRequestDialog={openApproveRequestDialog}
        handleSendPORequest={handleSendPORequest}
        handleUploadQuote={handleUploadQuote}
        handleUploadPOAndOrder={handleUploadPOAndOrder}
        handleMarkAsReceived={handleMarkAsReceived}
        handleMarkAsOrderedAndSendEmail={handleMarkAsOrderedAndSendEmail}
      />

      <Dialog open={isApproveRequestDialogOpen} onOpenChange={setIsApproveRequestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aprobar Solicitud</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => updateStatusMutation.mutate({ id: request!.id, status: "Quote Requested" }).then(() => setIsApproveRequestDialogOpen(false))}>Aprobar Solamente</Button>
            <Button onClick={handleApproveAndRequestQuoteEmail}>Aprobar y Solicitar Cotización (Correo)</Button>
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
    </div>
  );
};

export default RequestDetails;