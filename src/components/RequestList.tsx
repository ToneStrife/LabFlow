"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, Package, Receipt, Loader2, Mail, FileText } from "lucide-react";
import { RequestStatus } from "@/data/types"; // Importar RequestStatus desde types
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRequests, useUpdateRequestStatus, SupabaseRequest, useSendEmail } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { format } from "date-fns";
import EmailDialog, { EmailFormValues } from "./EmailDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const getStatusBadgeVariant = (status: RequestStatus) => {
  switch (status) {
    case "Pending":
      return "secondary";
    case "Quote Requested":
      return "outline";
    case "PO Requested":
      return "destructive";
    case "Ordered":
      return "default";
    case "Received":
      return "success"; // Assuming 'success' variant exists or can be styled
    default:
      return "secondary";
  }
};

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
  const [currentRequestForEmail, setCurrentRequestForEmail] = React.useState<SupabaseRequest | null>(null);

  const [isApproveRequestDialogOpen, setIsApproveRequestDialogOpen] = React.useState(false);
  const [requestToApprove, setRequestToApprove] = React.useState<SupabaseRequest | null>(null);

  const [isQuoteAndPODetailsDialogOpen, setIsQuoteAndPODetailsDialogOpen] = React.useState(false);
  const [quoteDetailsInput, setQuoteDetailsInput] = React.useState("");
  const [poNumberInput, setPoNumberInput] = React.useState("");
  const [currentRequestForQuoteAndPO, setCurrentRequestForQuoteAndPO] = React.useState<SupabaseRequest | null>(null);

  const [isOrderConfirmationDialogOpen, setIsOrderConfirmationDialogOpen] = React.useState(false);
  const [requestToOrder, setRequestToOrder] = React.useState<SupabaseRequest | null>(null);


  const allRequests = requests || [];

  const handleViewDetails = (requestId: string) => {
    navigate(`/requests/${requestId}`);
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

  const handleApproveAndRequestQuoteEmail = async () => {
    if (requestToApprove) {
      // First, update the status
      await updateStatusMutation.mutateAsync({ id: requestToApprove.id, status: "Quote Requested" });
      
      // Then, prepare and open the email dialog
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

  const handleSaveAndRequestPOEmail = async () => {
    if (currentRequestForQuoteAndPO) {
      // First, save the details and update status
      await updateStatusMutation.mutateAsync({
        id: currentRequestForQuoteAndPO.id,
        status: "PO Requested",
        quoteDetails: quoteDetailsInput,
        poNumber: poNumberInput || null,
      });

      // Then, prepare and open the email dialog
      setCurrentRequestForEmail(currentRequestForQuoteAndPO);
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

  const handleMarkAsOrderedAndSendEmail = async () => {
    if (requestToOrder) {
      // First, update the status
      await updateStatusMutation.mutateAsync({ id: requestToOrder.id, status: "Ordered" });

      // Then, prepare and open the email dialog
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
  // --- End Order Confirmation Dialog ---

  const handleMarkAsReceived = async (request: SupabaseRequest) => {
    await updateStatusMutation.mutateAsync({ id: request.id, status: "Received" });
  };

  const filteredRequests = allRequests.filter(request => {
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
      (request.quote_details && request.quote_details.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search requests (product, catalog, brand, vendor, requester, manager, quote, PO)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select value={filterStatus} onValueChange={(value: RequestStatus | "All") => setFilterStatus(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Quote Requested">Quote Requested</SelectItem>
            <SelectItem value="PO Requested">PO Requested</SelectItem>
            <SelectItem value="Ordered">Ordered</SelectItem>
            <SelectItem value="Received">Received</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Account Manager</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No requests found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => {
                const vendor = vendors?.find(v => v.id === request.vendor_id);
                const requesterName = getRequesterName(request.requester_id);
                const accountManagerName = getAccountManagerName(request.account_manager_id);
                const date = format(new Date(request.created_at), 'yyyy-MM-dd');

                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{vendor?.name || "N/A"}</TableCell>
                    <TableCell>{requesterName}</TableCell>
                    <TableCell>{accountManagerName}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{date}</TableCell>
                    <TableCell className="text-right flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(request.id)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {request.status === "Pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openApproveRequestDialog(request)}
                          title="Approve Request"
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}

                      {request.status === "Quote Requested" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenQuoteAndPODetailsDialog(request)}
                          title="Enter Quote Details & PO Number"
                          disabled={updateStatusMutation.isPending}
                        >
                          <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}

                      {request.status === "PO Requested" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendPORequest(request)}
                            title="Send PO Request to Account Manager"
                            disabled={updateStatusMutation.isPending}
                          >
                            <Mail className="h-4 w-4 text-orange-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openOrderConfirmationDialog(request)}
                            title={!request.po_number ? "A PO number is required to mark as ordered" : "Mark as Ordered"}
                            disabled={updateStatusMutation.isPending || !request.po_number}
                          >
                            <Package className="h-4 w-4 text-blue-600" />
                          </Button>
                        </>
                      )}

                      {request.status === "Ordered" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsReceived(request)}
                          title="Mark as Received"
                          disabled={updateStatusMutation.isPending}
                        >
                          <Receipt className="h-4 w-4 text-purple-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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
        onOpenChange={setIsEmailDialogOpen}
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
          </div>
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
    </div>
  );
};

export default RequestList;