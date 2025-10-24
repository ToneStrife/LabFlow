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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { useRequests, SupabaseRequest, useUpdateRequestStatus, useSendEmail } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import EmailDialog, { EmailFormValues } from "@/components/EmailDialog";

// Import new modular components
import RequestSummaryCard from "@/components/request-details/RequestSummaryCard";
import RequestItemsTable from "@/components/request-details/RequestItemsTable";
import RequestActions from "@/components/request-details/RequestActions";

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: requests, isLoading: isLoadingRequests } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const updateStatusMutation = useUpdateRequestStatus();
  const sendEmailMutation = useSendEmail();

  const request = requests?.find(req => req.id === id);

  const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
  const [emailInitialData, setEmailInitialData] = React.useState<Partial<EmailFormValues>>({});
  const [currentRequestForEmail, setCurrentRequestForEmail] = React.useState<SupabaseRequest | null>(null);

  const [isApproveRequestDialogOpen, setIsApproveRequestDialogOpen] = React.useState(false);
  const [requestToApprove, setRequestToApprove] = React.useState<SupabaseRequest | null>(null);

  const [isQuoteAndPODetailsDialogOpen, setIsQuoteAndPODetailsDialogOpen] = React.useState(false);
  const [quoteDetailsInput, setQuoteDetailsInput] = React.useState(request?.quote_details || "");
  const [poNumberInput, setPoNumberInput] = React.useState(request?.po_number || "");
  const [currentRequestForQuoteAndPO, setCurrentRequestForQuoteAndPO] = React.useState<SupabaseRequest | null>(null);

  const [isOrderConfirmationDialogOpen, setIsOrderConfirmationDialogOpen] = React.useState(false);
  const [requestToOrder, setRequestToOrder] = React.useState<SupabaseRequest | null>(null);

  React.useEffect(() => {
    if (request) {
      setQuoteDetailsInput(request.quote_details || "");
      setPoNumberInput(request.po_number || "");
    }
  }, [request]);

  const getVendorEmail = (vendorId: string) => {
    return vendors?.find(v => v.id === vendorId)?.email || "";
  };

  const getAccountManagerEmail = (managerId: string | null) => {
    return profiles?.find(p => p.id === managerId)?.email || "";
  };

  const getRequesterName = (requesterId: string) => {
    const profile = profiles?.find(p => p.id === requesterId);
    return getFullName(profile);
  };

  const getAccountManagerName = (managerId: string | null) => {
    if (!managerId) return "N/A";
    const managerProfile = profiles?.find(p => p.id === managerId);
    return getFullName(managerProfile);
  };

  const handleSendEmail = async (emailData: EmailFormValues) => {
    await sendEmailMutation.mutateAsync(emailData);
    setIsEmailDialogOpen(false);
  };

  const handleSendPORequest = (request: SupabaseRequest) => {
    setCurrentRequestForEmail(request);
    const managerName = getAccountManagerName(request.account_manager_id);
    const requesterName = getRequesterName(request.requester_id);

    const attachments = [];
    if (request.quote_details) {
      attachments.push({ name: `Quote_Request_${request.id}.pdf`, url: request.quote_details });
    }

    setEmailInitialData({
      to: getAccountManagerEmail(request.account_manager_id),
      subject: `PO Request for Lab Order #${request.id}`,
      body: `Dear ${managerName},

We have received a quote for lab order request #${request.id}.
Quote Details: ${request.quote_details || "N/A"}

Please generate a Purchase Order (PO) for this request.

Thank you,
${requesterName}`,
      attachments: attachments,
    });
    setIsEmailDialogOpen(true);
  };

  // --- Approval Flow ---
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

  const handleApproveAndRequestQuoteEmail = () => {
    if (requestToApprove) {
      setCurrentRequestForEmail(requestToApprove);
      setEmailInitialData({
        to: getVendorEmail(requestToApprove.vendor_id),
        subject: `Quote Request for Lab Order #${requestToApprove.id}`,
        body: `Dear ${vendors?.find(v => v.id === requestToApprove.vendor_id)?.contact_person || "Vendor"},

We would like to request a quote for the following items from our lab order request #${requestToApprove.id}:

${requestToApprove.items?.map(item => `- ${item.quantity}x ${item.product_name} (Catalog #: ${item.catalog_number})`).join("\n")}

Please provide your best pricing and estimated delivery times.

Thank you,
${getRequesterName(requestToApprove.requester_id)}`,
      });
      setIsApproveRequestDialogOpen(false); // Close approval dialog
      setIsEmailDialogOpen(true); // Open email dialog
    }
  };

  const handleConfirmQuoteRequest = async () => {
    if (currentRequestForEmail) {
      await updateStatusMutation.mutateAsync({ id: currentRequestForEmail.id, status: "Quote Requested" });
      setCurrentRequestForEmail(null);
    }
  };
  // --- End Approval Flow ---

  // --- Quote and PO Details Dialog ---
  const handleOpenQuoteAndPODetailsDialog = (request: SupabaseRequest) => {
    setCurrentRequestForQuoteAndPO(request);
    setQuoteDetailsInput(request.quote_details || "");
    setPoNumberInput(request.po_number || "");
    setIsQuoteAndPODetailsDialogOpen(true);
  };

  const handleSaveDetailsOnly = async () => {
    if (currentRequestForQuoteAndPO) {
      await updateStatusMutation.mutateAsync({
        id: currentRequestForQuoteAndPO.id,
        status: "PO Requested",
        quoteDetails: quoteDetailsInput,
        poNumber: poNumberInput || null,
      });
      setIsQuoteAndPODetailsDialogOpen(false);
      setCurrentRequestForQuoteAndPO(null);
      setQuoteDetailsInput("");
      setPoNumberInput("");
    }
  };

  const handleSaveAndRequestPOEmail = () => {
    if (currentRequestForQuoteAndPO) {
      setCurrentRequestForEmail(currentRequestForQuoteAndPO);
      const vendor = vendors?.find(v => v.id === currentRequestForQuoteAndPO.vendor_id);
      const managerName = getAccountManagerName(currentRequestForQuoteAndPO.account_manager_id);
      const requesterName = getRequesterName(currentRequestForQuoteAndPO.requester_id);

      const attachments = [];
      if (quoteDetailsInput) {
        attachments.push({ name: `Quote_Request_${currentRequestForQuoteAndPO.id}.pdf`, url: quoteDetailsInput });
      }

      setEmailInitialData({
        to: getAccountManagerEmail(currentRequestForQuoteAndPO.account_manager_id),
        subject: `PO Request for Lab Order #${currentRequestForQuoteAndPO.id}`,
        body: `Dear ${managerName},

We have received a quote for lab order request #${currentRequestForQuoteAndPO.id}.
Quote Details: ${quoteDetailsInput || "N/A"}

Please generate a Purchase Order (PO) for this request.

Thank you,
${requesterName}`,
        attachments: attachments,
      });
      setIsQuoteAndPODetailsDialogOpen(false); // Close quote/PO dialog
      setIsEmailDialogOpen(true); // Open email dialog
    }
  };

  const handleConfirmPORequest = async () => {
    if (currentRequestForEmail) {
      // Status is already PO Requested, just confirm email sent
      await updateStatusMutation.mutateAsync({
        id: currentRequestForEmail.id,
        status: "PO Requested", // Ensure status is set if not already
        quoteDetails: currentRequestForEmail.quote_details,
        poNumber: currentRequestForEmail.po_number,
      });
      setCurrentRequestForEmail(null);
    }
  };
  // --- End Quote and PO Details Dialog ---

  // --- Order Confirmation Dialog ---
  const openOrderConfirmationDialog = (request: SupabaseRequest) => {
    setRequestToOrder(request);
    setIsOrderConfirmationDialogOpen(true);
  };

  const handleMarkAsOrderedOnly = async () => {
    if (requestToOrder) {
      await updateStatusMutation.mutateAsync({ id: requestToOrder.id, status: "Ordered" });
      setIsOrderConfirmationDialogOpen(false);
      setRequestToOrder(null);
    }
  };

  const handleMarkAsOrderedAndSendEmail = () => {
    if (requestToOrder) {
      setCurrentRequestForEmail(requestToOrder);
      const vendor = vendors?.find(v => v.id === requestToOrder.vendor_id);
      const requesterName = getRequesterName(requestToOrder.requester_id);

      const attachments = [];
      if (requestToOrder.quote_details) {
        attachments.push({ name: `Quote_Request_${requestToOrder.id}.pdf`, url: requestToOrder.quote_details });
      }
      if (requestToOrder.po_number) {
        attachments.push({ name: `PO_${requestToOrder.po_number}.pdf`, url: `https://example.com/po/${requestToOrder.po_number}.pdf` }); // Mock PO attachment
      }

      setEmailInitialData({
        to: getVendorEmail(requestToOrder.vendor_id),
        subject: `Official Order for Lab Order #${requestToOrder.id} (PO: ${requestToOrder.po_number || "N/A"})`,
        body: `Dear ${vendor?.contact_person || "Vendor"},

This email confirms the official order for lab request #${requestToOrder.id}.
Please find the attached quote and Purchase Order for your reference.

Quote Details: ${requestToOrder.quote_details || "N/A"}
PO Number: ${requestToOrder.po_number || "N/A"}

Please proceed with the order.

Thank you,
${requesterName}`,
        attachments: attachments,
      });
      setIsOrderConfirmationDialogOpen(false); // Close order confirmation dialog
      setIsEmailDialogOpen(true); // Open email dialog
    }
  };

  const handleConfirmOrderEmail = async () => {
    if (currentRequestForEmail) {
      await updateStatusMutation.mutateAsync({ id: currentRequestForEmail.id, status: "Ordered" });
      setCurrentRequestForEmail(null);
    }
  };
  // --- End Order Confirmation Dialog ---

  const handleMarkAsReceived = async (request: SupabaseRequest) => {
    await updateStatusMutation.mutateAsync({ id: request.id, status: "Received" });
  };

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Request Details...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Request Not Found</h1>
        <p className="text-lg text-muted-foreground">
          The request with ID "{id}" could not be found.
        </p>
        <Button onClick={() => navigate("/dashboard")} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const vendor = vendors?.find(v => v.id === request.vendor_id);

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" onClick={() => navigate("/dashboard")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <RequestSummaryCard request={request} vendor={vendor} profiles={profiles} />

      <RequestItemsTable items={request.items} />

      <RequestActions
        request={request}
        isUpdatingStatus={updateStatusMutation.isPending}
        openApproveRequestDialog={openApproveRequestDialog}
        handleOpenQuoteAndPODetailsDialog={handleOpenQuoteAndPODetailsDialog}
        handleSendPORequest={handleSendPORequest}
        openOrderConfirmationDialog={openOrderConfirmationDialog}
        handleMarkAsReceived={handleMarkAsReceived}
      />

      {/* Approve Request Dialog */}
      <Dialog open={isApproveRequestDialogOpen} onOpenChange={setIsApproveRequestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Choose how to proceed with this request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p>Request ID: {requestToApprove?.id}</p>
            <p>Vendor: {vendors?.find(v => v.id === requestToApprove?.vendor_id)?.name || "N/A"}</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={handleApproveOnly} disabled={updateStatusMutation.isPending}>
              Approve Only
            </Button>
            <Button onClick={handleApproveAndRequestQuoteEmail} disabled={updateStatusMutation.isPending}>
              Approve & Request Quote (Email)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <EmailDialog
        isOpen={isEmailDialogOpen}
        onOpenChange={(open) => {
          setIsEmailDialogOpen(open);
          if (!open && currentRequestForEmail) {
            if (currentRequestForEmail.status === "Pending") {
              handleConfirmQuoteRequest();
            } else if (currentRequestForEmail.status === "PO Requested") {
              handleConfirmPORequest();
            } else if (currentRequestForEmail.status === "Ordered") {
              handleConfirmOrderEmail();
            }
          }
        }}
        initialData={emailInitialData}
        onSend={handleSendEmail}
        isSending={sendEmailMutation.isPending}
      />

      {/* Quote and PO Details Dialog */}
      <Dialog open={isQuoteAndPODetailsDialogOpen} onOpenChange={setIsQuoteAndPODetailsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Quote Details & PO Number</DialogTitle>
            <DialogDescription>
              Please provide the quote details (e.g., a link to the quote PDF or relevant text) and the Purchase Order Number.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quoteDetails" className="text-right">
                Quote
              </Label>
              <Input
                id="quoteDetails"
                value={quoteDetailsInput}
                onChange={(e) => setQuoteDetailsInput(e.target.value)}
                className="col-span-3"
                placeholder="e.g., https://vendor.com/quote-123.pdf or Quote #XYZ"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="poNumber" className="text-right">
                PO Number (Optional)
              </Label>
              <Input
                id="poNumber"
                value={poNumberInput}
                onChange={(e) => setPoNumberInput(e.target.value)}
                className="col-span-3"
                placeholder="e.g., PO-12345"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quotePdfUpload" className="text-right">
                Quote PDF (Simulated)
              </Label>
              <Input
                id="quotePdfUpload"
                type="text" // Changed to text for simulation
                className="col-span-3"
                placeholder="e.g., quote_document.pdf (simulated upload)"
                value={quoteDetailsInput.startsWith('http') ? '' : quoteDetailsInput} // Clear if it's a URL
                onChange={(e) => setQuoteDetailsInput(e.target.value)}
              />
            </div>
          </div >
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={() => setIsQuoteAndPODetailsDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={handleSaveDetailsOnly} disabled={updateStatusMutation.isPending}>
              Save Details Only
            </Button>
            <Button onClick={handleSaveAndRequestPOEmail} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save & Request PO (Email)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Confirmation Dialog */}
      <Dialog open={isOrderConfirmationDialogOpen} onOpenChange={setIsOrderConfirmationDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
            <DialogDescription>
              Choose how to proceed with marking this request as ordered.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p>Request ID: {requestToOrder?.id}</p>
            <p>Vendor: {vendors?.find(v => v.id === requestToOrder?.vendor_id)?.name || "N/A"}</p>
            <p>PO Number: {requestToOrder?.po_number || "N/A"}</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={handleMarkAsOrderedOnly} disabled={updateStatusMutation.isPending}>
              Mark as Ordered Only
            </Button>
            <Button onClick={handleMarkAsOrderedAndSendEmail} disabled={updateStatusMutation.isPending}>
              Mark as Ordered & Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default RequestDetails;