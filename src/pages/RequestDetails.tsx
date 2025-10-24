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

import { useRequests, SupabaseRequest, useUpdateRequestStatus, useSendEmail, useUpdateRequestFile, FileType } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import EmailDialog, { EmailFormValues } from "@/components/EmailDialog";

// Import new modular components
import RequestSummaryCard from "@/components/request-details/RequestSummaryCard";
import RequestItemsTable from "@/components/request-details/RequestItemsTable";
import RequestActions from "@/components/request-details/RequestActions";
import RequestFilesCard from "@/components/request-details/RequestFilesCard";
import FileUploadDialog from "@/components/request-details/FileUploadDialog";
import { toast } from "sonner";

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: requests, isLoading: isLoadingRequests } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const updateStatusMutation = useUpdateRequestStatus();
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
  const getAccountManagerEmail = (managerId: string | null) => profiles?.find(p => p.id === managerId)?.email || "";
  const getRequesterName = (requesterId: string) => getFullName(profiles?.find(p => p.id === requesterId));
  const getAccountManagerName = (managerId: string | null) => managerId ? getFullName(profiles?.find(p => p.id === managerId)) : "N/A";

  const handleSendEmail = async (emailData: EmailFormValues) => {
    await sendEmailMutation.mutateAsync(emailData);
    setIsEmailDialogOpen(false);
  };

  const handleSendPORequest = (request: SupabaseRequest) => {
    if (!request.account_manager_id) {
      toast.error("Cannot send PO request.", { description: "No account manager assigned to this request." });
      return;
    }
    if (!request.quote_url) {
      toast.error("Cannot send PO request.", { description: "Quote file is missing." });
      return;
    }

    const managerName = getAccountManagerName(request.account_manager_id);
    const requesterName = getRequesterName(request.requester_id);
    const attachments = request.quote_url ? [{ name: `Quote_Request_${request.id}.pdf`, url: request.quote_url }] : [];

    setEmailInitialData({
      to: getAccountManagerEmail(request.account_manager_id),
      subject: `PO Request for Lab Order #${request.id}`,
      body: `Dear ${managerName},\n\nPlease generate a Purchase Order (PO) for this request.\nThe quote is attached.\n\nThank you,\n${requesterName}`,
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
      
      setEmailInitialData({
        to: getVendorEmail(requestToApprove.vendor_id),
        subject: `Quote Request for Lab Order #${requestToApprove.id}`,
        body: `Dear ${vendors?.find(v => v.id === requestToApprove.vendor_id)?.contact_person || "Vendor"},\n\nPlease provide a quote for the items in request #${requestToApprove.id}.\n\nThank you,\n${getRequesterName(requestToApprove.requester_id)}`,
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

  // Action for Quote Requested state: Upload Quote file
  const handleUploadQuote = () => {
    handleUploadClick("quote");
  };

  // Action for PO Requested state: Upload PO file and mark as Ordered
  const handleUploadPOAndOrder = () => {
    handleUploadClick("po");
  };

  const handleFileUpload = async (file: File, poNumber?: string) => {
    if (request) {
      // Simulate file upload by creating a mock URL
      const mockFileUrl = `/uploads/${file.name}`;
      
      const updatedRequest = await updateFileMutation.mutateAsync({
        id: request.id,
        fileType: fileTypeToUpload,
        fileUrl: mockFileUrl,
        poNumber: poNumber,
      });

      // If we just uploaded a PO, automatically change status to Ordered
      if (fileTypeToUpload === "po") {
        await updateStatusMutation.mutateAsync({ id: request.id, status: "Ordered" });
        // No email needed here, the email is sent via the separate action button
      }
      
      // If we just uploaded a Quote, automatically change status to PO Requested
      if (fileTypeToUpload === "quote") {
        await updateStatusMutation.mutateAsync({ id: request.id, status: "PO Requested" });
        
        // Automatically prepare the email to request PO from Manager
        if (updatedRequest.account_manager_id) {
          handleSendPORequest(updatedRequest);
        } else {
          toast.info("Quote uploaded. Please assign an Account Manager to request a PO.");
        }
      }

      setIsUploadDialogOpen(false);
    }
  };

  // --- Logic for Mark as Ordered and Send Email ---
  const handleMarkAsOrderedAndSendEmail = (request: SupabaseRequest) => {
    if (!request.po_url) {
      toast.error("Cannot send order email.", { description: "PO file is missing. Please upload the PO file first." });
      return;
    }

    const vendor = vendors?.find(v => v.id === request.vendor_id);
    const requesterName = getRequesterName(request.requester_id);
    const attachments = [];
    if (request.quote_url) attachments.push({ name: `Quote_Request_${request.id}.pdf`, url: request.quote_url });
    if (request.po_url) attachments.push({ name: `PO_${request.po_number || request.id}.pdf`, url: request.po_url });

    setEmailInitialData({
      to: getVendorEmail(request.vendor_id),
      subject: `Official Order - PO: ${request.po_number || "N/A"}`,
      body: `Dear ${vendor?.contact_person || "Vendor"},\n\nThis email confirms the official order for lab request #${request.id}.\nPlease find the attached Purchase Order.\n\nThank you,\n${requesterName}`,
      attachments,
    });
    setIsEmailDialogOpen(true);
  };
  // --- End Logic for Mark as Ordered and Send Email ---


  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles) {
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

      <RequestActions
        request={request}
        isUpdatingStatus={updateStatusMutation.isPending || updateFileMutation.isPending}
        openApproveRequestDialog={openApproveRequestDialog}
        handleSendPORequest={handleSendPORequest}
        handleUploadQuote={handleUploadQuote}
        handleUploadPOAndOrder={handleUploadPOAndOrder}
        handleMarkAsReceived={handleMarkAsReceived}
        handleMarkAsOrderedAndSendEmail={handleMarkAsOrderedAndSendEmail} // New prop
      />

      {/* Dialogs */}
      <Dialog open={isApproveRequestDialogOpen} onOpenChange={setIsApproveRequestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Request</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => updateStatusMutation.mutate({ id: request.id, status: "Quote Requested" }).then(() => setIsApproveRequestDialogOpen(false))}>Approve Only</Button>
            <Button onClick={handleApproveAndRequestQuoteEmail}>Approve & Request Quote (Email)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmailDialog isOpen={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen} initialData={emailInitialData} onSend={handleSendEmail} isSending={sendEmailMutation.isPending} />

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