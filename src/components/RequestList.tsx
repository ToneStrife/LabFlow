"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { RequestStatus } from "@/data/types";
import { useRequests, useUpdateRequestStatus, SupabaseRequest, useSendEmail } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import EmailDialog, { EmailFormValues } from "./EmailDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RequestListToolbar from "./request-list/RequestListToolbar";
import RequestListTable from "./request-list/RequestListTable";
import { toast } from "sonner";

const RequestList: React.FC = () => {
  const navigate = useNavigate();
  const { data: requests, isLoading: isLoadingRequests, error: requestsError } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const updateStatusMutation = useUpdateRequestStatus();
  const sendEmailMutation = useSendEmail();

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<RequestStatus | "All">("All");

  const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
  const [emailInitialData, setEmailInitialData] = React.useState<Partial<EmailFormValues>>({});
  
  const [isApproveRequestDialogOpen, setIsApproveRequestDialogOpen] = React.useState(false);
  const [requestToApprove, setRequestToApprove] = React.useState<SupabaseRequest | null>(null);

  // Restored Quote/PO Details Dialog state
  const [isQuoteAndPODetailsDialogOpen, setIsQuoteAndPODetailsDialogOpen] = React.useState(false);
  const [quoteUrlInput, setQuoteUrlInput] = React.useState("");
  const [poNumberInput, setPoNumberInput] = React.useState("");
  const [currentRequestForQuoteAndPO, setCurrentRequestForQuoteAndPO] = React.useState<SupabaseRequest | null>(null);

  const [isOrderConfirmationDialogOpen, setIsOrderConfirmationDialogOpen] = React.useState(false);
  const [requestToOrder, setRequestToOrder] = React.useState<SupabaseRequest | null>(null);

  const getRequesterName = (requesterId: string) => {
    const profile = profiles?.find(p => p.id === requesterId);
    return getFullName(profile);
  };

  const getAccountManagerName = (managerId: string | null) => {
    if (!managerId) return "N/A";
    const managerProfile = profiles?.find(p => p.id === managerId);
    return getFullName(managerProfile);
  };

  const getVendorEmail = (vendorId: string) => {
    return vendors?.find(v => v.id === vendorId)?.email || "";
  };

  const getAccountManagerEmail = (managerId: string | null) => {
    return profiles?.find(p => p.id === managerId)?.email || "";
  };

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
      toast.error("Cannot send PO request.", { description: "Quote file/URL is missing." });
      return;
    }

    const managerName = getAccountManagerName(request.account_manager_id);
    const requesterName = getRequesterName(request.requester_id);
    const attachments = request.quote_url ? [{ name: `Quote_Request_${request.id}.pdf`, url: request.quote_url }] : [];

    setEmailInitialData({
      to: getAccountManagerEmail(request.account_manager_id),
      subject: `PO Request for Lab Order #${request.id}`,
      body: `Dear ${managerName},\n\nWe have received a quote for lab order request #${request.id}.\nQuote URL: ${request.quote_url || "N/A"}\n\nPlease generate a Purchase Order (PO) for this request.\n\nThank you,\n${requesterName}`,
      attachments,
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
      setRequestToApprove(null);
    }
  };

  const handleApproveAndRequestQuoteEmail = async () => {
    if (requestToApprove) {
      await updateStatusMutation.mutateAsync({ id: requestToApprove.id, status: "Quote Requested" });
      
      setEmailInitialData({
        to: getVendorEmail(requestToApprove.vendor_id),
        subject: `Quote Request for Lab Order #${requestToApprove.id}`,
        body: `Dear ${vendors?.find(v => v.id === requestToApprove.vendor_id)?.contact_person || "Vendor"},\n\nWe would like to request a quote for the following items from our lab order request #${requestToApprove.id}:\n\n${requestToApprove.items?.map(item => `- ${item.quantity}x ${item.product_name} (Catalog #: ${item.catalog_number})`).join("\n")}\n\nPlease provide your best pricing and estimated delivery times.\n\nThank you,\n${getRequesterName(requestToApprove.requester_id)}`,
      });
      setIsApproveRequestDialogOpen(false);
      setIsEmailDialogOpen(true);
    }
  };

  // --- Quote/PO Details Logic ---
  const openQuoteAndPODetailsDialog = (request: SupabaseRequest) => {
    setCurrentRequestForQuoteAndPO(request);
    setQuoteUrlInput(request.quote_url || "");
    setPoNumberInput(request.po_number || "");
    setIsQuoteAndPODetailsDialogOpen(true);
  };

  const handleSaveDetailsAndRequestPOEmail = async () => {
    if (currentRequestForQuoteAndPO) {
      // Update status to PO Requested and save details
      const updatedRequest = await updateStatusMutation.mutateAsync({
        id: currentRequestForQuoteAndPO.id,
        status: "PO Requested",
        quoteUrl: quoteUrlInput || null,
        poNumber: poNumberInput || null,
      });
      
      // Send PO Request Email
      handleSendPORequest(updatedRequest);
      setIsQuoteAndPODetailsDialogOpen(false);
    }
  };
  
  const handleSaveDetailsOnly = async () => {
    if (currentRequestForQuoteAndPO) {
      await updateStatusMutation.mutateAsync({
        id: currentRequestForQuoteAndPO.id,
        status: "PO Requested",
        quoteUrl: quoteUrlInput || null,
        poNumber: poNumberInput || null,
      });
      setIsQuoteAndPODetailsDialogOpen(false);
    }
  };
  // --- End Quote/PO Details Logic ---

  const openOrderConfirmationDialog = (request: SupabaseRequest) => {
    setRequestToOrder(request);
    setIsOrderConfirmationDialogOpen(true);
  };

  const handleMarkAsOrderedOnly = async () => {
    if (requestToOrder) {
      await updateStatusMutation.mutateAsync({ id: requestToOrder.id, status: "Ordered" });
      setIsOrderConfirmationDialogOpen(false);
    }
  };

  const handleMarkAsOrderedAndSendEmail = async () => {
    if (requestToOrder) {
      await updateStatusMutation.mutateAsync({ id: requestToOrder.id, status: "Ordered" });
      
      const vendor = vendors?.find(v => v.id === requestToOrder.vendor_id);
      const requesterName = getRequesterName(requestToOrder.requester_id);
      const attachments = [];
      if (requestToOrder.quote_url) attachments.push({ name: `Quote_Request_${requestToOrder.id}.pdf`, url: requestToOrder.quote_url });
      if (requestToOrder.po_url) attachments.push({ name: `PO_${requestToOrder.po_number}.pdf`, url: requestToOrder.po_url || "" });

      setEmailInitialData({
        to: getVendorEmail(requestToOrder.vendor_id),
        subject: `Official Order - PO: ${requestToOrder.po_number || "N/A"}`,
        body: `Dear ${vendor?.contact_person || "Vendor"},\n\nThis email confirms the official order for lab request #${requestToOrder.id}.\nPlease find the attached Purchase Order.\n\nThank you,\n${requesterName}`,
        attachments,
      });
      setIsOrderConfirmationDialogOpen(false);
      setIsEmailDialogOpen(true);
    }
  };

  const handleMarkAsReceived = async (request: SupabaseRequest) => {
    await updateStatusMutation.mutateAsync({ id: request.id, status: "Received" });
  };

  const filteredRequests = (requests || []).filter(request => {
    const vendorName = vendors?.find(v => v.id === request.vendor_id)?.name || "";
    const requesterName = getRequesterName(request.requester_id);
    const accountManagerName = getAccountManagerName(request.account_manager_id);

    const matchesSearchTerm = searchTerm.toLowerCase() === "" ||
      request.items?.some(item =>
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.catalog_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      ) ||
      vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      accountManagerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.quote_url && request.quote_url.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.po_number && request.po_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === "All" || request.status === filterStatus;

    return matchesSearchTerm && matchesStatus;
  });

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading Requests...
      </div>
    );
  }

  if (requestsError) {
    return <div className="text-red-500">Error loading requests: {requestsError.message}</div>;
  }

  return (
    <div className="space-y-4">
      <RequestListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
      />
      <RequestListTable
        requests={filteredRequests}
        vendors={vendors}
        profiles={profiles}
        isUpdatingStatus={updateStatusMutation.isPending}
        onViewDetails={(id) => navigate(`/requests/${id}`)}
        onApprove={openApproveRequestDialog}
        onEnterQuoteDetails={openQuoteAndPODetailsDialog}
        onSendPORequest={handleSendPORequest}
        onMarkAsOrdered={openOrderConfirmationDialog}
        onMarkAsReceived={handleMarkAsReceived}
      />

      {/* Dialogs remain in the container component */}
      <Dialog open={isApproveRequestDialogOpen} onOpenChange={setIsApproveRequestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>Choose how to proceed with this request.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p>Request ID: {requestToApprove?.id}</p>
            <p>Vendor: {vendors?.find(v => v.id === requestToApprove?.vendor_id)?.name || "N/A"}</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={handleApproveOnly} disabled={updateStatusMutation.isPending}>Approve Only</Button>
            <Button onClick={handleApproveAndRequestQuoteEmail} disabled={updateStatusMutation.isPending}>Approve & Request Quote (Email)</Button>
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

      {/* RESTORED: Quote/PO Details Dialog */}
      <Dialog open={isQuoteAndPODetailsDialogOpen} onOpenChange={setIsQuoteAndPODetailsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Quote Details & PO Number</DialogTitle>
            <DialogDescription>Please provide the quote URL and the Purchase Order Number (if available).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quoteUrl" className="text-right">Quote URL</Label>
              <Input id="quoteUrl" value={quoteUrlInput} onChange={(e) => setQuoteUrlInput(e.target.value)} className="col-span-3" placeholder="e.g., https://vendor.com/quote-123.pdf" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="poNumber" className="text-right">PO Number</Label>
              <Input id="poNumber" value={poNumberInput} onChange={(e) => setPoNumberInput(e.target.value)} className="col-span-3" placeholder="e.g., PO-12345" />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={() => setIsQuoteAndPODetailsDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={handleSaveDetailsOnly} disabled={updateStatusMutation.isPending}>Save Details Only</Button>
            <Button onClick={handleSaveDetailsAndRequestPOEmail} disabled={updateStatusMutation.isPending || !currentRequestForQuoteAndPO?.account_manager_id}>
              {updateStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save & Request PO (Email)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOrderConfirmationDialogOpen} onOpenChange={setIsOrderConfirmationDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
            <DialogDescription>Choose how to proceed with marking this request as ordered.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p>Request ID: {requestToOrder?.id}</p>
            <p>PO Number: {requestToOrder?.po_number || "N/A"}</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={handleMarkAsOrderedOnly} disabled={updateStatusMutation.isPending}>Mark as Ordered Only</Button>
            <Button onClick={handleMarkAsOrderedAndSendEmail} disabled={updateStatusMutation.isPending}>Mark as Ordered & Send Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestList;