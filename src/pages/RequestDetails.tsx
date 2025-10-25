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
  DialogFooter,
} from "@/components/ui/dialog";

import { useRequests, SupabaseRequest, useSendEmail, useUpdateRequestFile, FileType, useUpdateRequest } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, useAccountManagerProfiles } from "@/hooks/use-profiles";
import { useProjects } from "@/hooks/use-projects";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { processEmailTemplate } from "@/utils/email-templating";
import EmailDialog, { EmailFormValues } from "@/components/EmailDialog";

import RequestSummaryCard from "@/components/request-details/RequestSummaryCard";
import RequestItemsTable from "@/components/request-details/RequestItemsTable";
import RequestActions from "@/components/request-details/RequestActions";
import RequestFilesCard from "@/components/request-details/RequestFilesCard";
import FileUploadDialog from "@/components/request-details/FileUploadDialog";
import RequestMetadataForm from "@/components/request-details/RequestMetadataForm";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useSession();
  const { data: requests, isLoading: isLoadingRequests } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagerProfiles();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: emailTemplates, isLoading: isLoadingEmailTemplates } = useEmailTemplates();
  
  const updateRequestMutation = useUpdateRequest();
  const updateFileMutation = useUpdateRequestFile();
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

  const handleSendEmail = async (emailData: EmailFormValues) => {
    await sendEmailMutation.mutateAsync(emailData);
    setIsEmailDialogOpen(false);
  };

  const handleSendPORequest = (request: SupabaseRequest) => {
    if (!request.account_manager_id || !request.quote_url) {
      toast.error("Cannot send PO request.", { description: "Account manager or quote file is missing." });
      return;
    }
    const poRequestTemplate = emailTemplates?.find(t => t.template_name === 'PO Request');
    if (!poRequestTemplate) {
      toast.error("Email template 'PO Request' not found.");
      return;
    }
    const context = { request, vendor: vendors?.find(v => v.id === request.vendor_id), requesterProfile: profiles?.find(p => p.id === request.requester_id), accountManager: accountManagers?.find(am => am.id === request.account_manager_id), projects, actorProfile: profile };
    const attachments = [{ name: `Quote_Request_${request.id}.pdf`, url: request.quote_url }];
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
      await updateRequestMutation.mutateAsync({ id: requestToApprove.id, data: { status: "Quote Requested" } });
      const quoteTemplate = emailTemplates?.find(t => t.template_name === 'Quote Request');
      if (!quoteTemplate) {
        toast.error("Email template 'Quote Request' not found.");
        return;
      }
      const context = { request: requestToApprove, vendor: vendors?.find(v => v.id === requestToApprove.vendor_id), requesterProfile: profiles?.find(p => p.id === requestToApprove.requester_id), accountManager: accountManagers?.find(am => am.id === requestToApprove.account_manager_id), projects, actorProfile: profile };
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
    await updateRequestMutation.mutateAsync({ id: request.id, data: { status: "Received" } });
  };

  const handleUploadClick = (fileType: FileType) => {
    setFileTypeToUpload(fileType);
    setIsUploadDialogOpen(true);
  };

  const handleFileUpload = async (file: File, poNumber?: string) => {
    if (!request) return;
    try {
      const { fileUrl } = await updateFileMutation.mutateAsync({
        id: request.id,
        fileType: fileTypeToUpload,
        file: file,
        poNumber: poNumber,
      });

      let updateData: Partial<SupabaseRequest> = {};
      if (fileTypeToUpload === "quote") {
        updateData = { status: "PO Requested", quote_url: fileUrl };
      } else if (fileTypeToUpload === "po") {
        updateData = { status: "Ordered", po_url: fileUrl, po_number: poNumber };
      } else if (fileTypeToUpload === "slip") {
        updateData = { slip_url: fileUrl };
      }

      await updateRequestMutation.mutateAsync({ id: request.id, data: updateData });

      if (fileTypeToUpload === "quote") {
        const updatedRequestWithQuote = { ...request, ...updateData };
        if (updatedRequestWithQuote.account_manager_id) {
          handleSendPORequest(updatedRequestWithQuote);
        } else {
          toast.info("Quote uploaded. Please assign an Account Manager to request a PO.");
        }
      }
      setIsUploadDialogOpen(false);
    } catch (error) {
      console.error("File upload orchestration failed:", error);
    }
  };

  const handleMarkAsOrderedAndSendEmail = (request: SupabaseRequest) => {
    if (!request.po_url) {
      toast.error("Cannot send order email.", { description: "PO file is missing." });
      return;
    }
    const orderConfirmationTemplate = emailTemplates?.find(t => t.template_name === 'Order Confirmation');
    if (!orderConfirmationTemplate) {
      toast.error("Email template 'Order Confirmation' not found.");
      return;
    }
    const context = { request, vendor: vendors?.find(v => v.id === request.vendor_id), requesterProfile: profiles?.find(p => p.id === request.requester_id), accountManager: accountManagers?.find(am => am.id === request.account_manager_id), projects, actorProfile: profile };
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
    await updateRequestMutation.mutateAsync({
      id: request.id,
      data: {
        account_manager_id: data.accountManagerId === 'unassigned' ? null : data.accountManagerId,
        notes: data.notes,
        project_codes: data.projectCodes,
      }
    });
  };

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates) {
    return <div className="container mx-auto py-8 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Request Details...</div>;
  }

  if (!request) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Request Not Found</h1>
        <Button onClick={() => navigate("/dashboard")} className="mt-6"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
      </div>
    );
  }

  const vendor = vendors?.find(v => v.id === request.vendor_id);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button variant="outline" onClick={() => navigate("/dashboard")}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
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
        <h2 className="text-2xl font-bold mb-4">Request Metadata</h2>
        <RequestMetadataForm
          request={request}
          onSubmit={handleUpdateMetadata}
          isSubmitting={updateRequestMutation.isPending}
        />
      </div>
      <RequestActions
        request={request}
        isUpdatingStatus={updateRequestMutation.isPending || updateFileMutation.isPending}
        openApproveRequestDialog={openApproveRequestDialog}
        handleSendPORequest={handleSendPORequest}
        handleUploadQuote={() => handleUploadClick("quote")}
        handleUploadPOAndOrder={() => handleUploadClick("po")}
        handleMarkAsReceived={handleMarkAsReceived}
        handleMarkAsOrderedAndSendEmail={handleMarkAsOrderedAndSendEmail}
      />
      <Dialog open={isApproveRequestDialogOpen} onOpenChange={setIsApproveRequestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Request</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => updateRequestMutation.mutate({ id: request!.id, data: { status: "Quote Requested" } }).then(() => setIsApproveRequestDialogOpen(false))}>Approve Only</Button>
            <Button onClick={handleApproveAndRequestQuoteEmail}>Approve & Request Quote (Email)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EmailDialog isOpen={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen} initialData={emailInitialData} onSend={handleSendEmail} isSending={sendEmailMutation.isPending} />
      <FileUploadDialog isOpen={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen} onUpload={handleFileUpload} isUploading={updateFileMutation.isPending} fileType={fileTypeToUpload} />
    </div>
  );
};

export default RequestDetails;