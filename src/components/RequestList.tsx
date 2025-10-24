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
import { RequestStatus } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRequests, useUpdateRequestStatus, SupabaseRequest, useSendEmail } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { format } from "date-fns";
import EmailDialog, { EmailFormValues } from "./EmailDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const getStatusBadgeVariant = (status: RequestStatus) => {
  switch (status) {
    case "Pending":
      return "secondary";
    case "Approved":
      return "default";
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

  const [isQuoteDetailsDialogOpen, setIsQuoteDetailsDialogOpen] = React.useState(false);
  const [quoteDetailsInput, setQuoteDetailsInput] = React.useState("");
  const [currentRequestForQuote, setCurrentRequestForQuote] = React.useState<SupabaseRequest | null>(null);

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

  const handleApproveRequest = (request: SupabaseRequest) => {
    setCurrentRequestForEmail(request);
    setEmailInitialData({
      to: getVendorEmail(request.vendor_id),
      subject: `Quote Request for Lab Order #${request.id}`,
      body: `Dear ${vendors?.find(v => v.id === request.vendor_id)?.contact_person || "Vendor"},

We would like to request a quote for the following items from our lab order request #${request.id}:

${request.items?.map(item => `- ${item.quantity}x ${item.product_name} (Catalog #: ${item.catalog_number})`).join("\n")}

Please provide your best pricing and estimated delivery times.

Thank you,
${getRequesterName(request.requester_id)}`,
    });
    setIsEmailDialogOpen(true);
  };

  const handleConfirmQuoteRequest = async () => {
    if (currentRequestForEmail) {
      await updateStatusMutation.mutateAsync({ id: currentRequestForEmail.id, status: "Quote Requested" });
      setCurrentRequestForEmail(null);
    }
  };

  const handleOpenQuoteDetailsDialog = (request: SupabaseRequest) => {
    setCurrentRequestForQuote(request);
    setQuoteDetailsInput(request.quote_details || "");
    setIsQuoteDetailsDialogOpen(true);
  };

  const handleSaveQuoteDetails = async () => {
    if (currentRequestForQuote) {
      await updateStatusMutation.mutateAsync({
        id: currentRequestForQuote.id,
        status: "PO Requested",
        quoteDetails: quoteDetailsInput,
      });
      setIsQuoteDetailsDialogOpen(false);
      setCurrentRequestForQuote(null);
      setQuoteDetailsInput("");
    }
  };

  const handleSendPORequest = (request: SupabaseRequest) => {
    setCurrentRequestForEmail(request);
    setEmailInitialData({
      to: getAccountManagerEmail(request.account_manager_id),
      subject: `PO Request for Lab Order #${request.id}`,
      body: `Dear ${getAccountManagerName(request.account_manager_id)},

We have received a quote for lab order request #${request.id}.
Quote Details: ${request.quote_details || "N/A"}

Please generate a Purchase Order (PO) for this request.

Thank you,
${getRequesterName(request.requester_id)}`,
      attachments: request.quote_details ? [{ name: `Quote_Request_${request.id}.pdf`, url: request.quote_details }] : [],
    });
    setIsEmailDialogOpen(true);
  };

  const handleConfirmPORequest = async () => {
    if (currentRequestForEmail) {
      // Status is already PO Requested, no need to update status here, just confirm email sent
      setCurrentRequestForEmail(null);
    }
  };

  const handleMarkAsOrdered = (request: SupabaseRequest) => {
    setCurrentRequestForEmail(request);
    setEmailInitialData({
      to: getVendorEmail(request.vendor_id),
      subject: `Official Order for Lab Order #${request.id} (PO: ${request.po_number || "N/A"})`,
      body: `Dear ${vendors?.find(v => v.id === request.vendor_id)?.contact_person || "Vendor"},

This email confirms the official order for lab request #${request.id}.
Please find the attached quote and Purchase Order for your reference.

Quote Details: ${request.quote_details || "N/A"}
PO Number: ${request.po_number || "N/A"}

Please proceed with the order.

Thank you,
${getRequesterName(request.requester_id)}`,
      attachments: [
        ...(request.quote_details ? [{ name: `Quote_Request_${request.id}.pdf`, url: request.quote_details }] : []),
        ...(request.po_number ? [{ name: `PO_${request.po_number}.pdf`, url: `https://example.com/po/${request.po_number}.pdf` }] : []), // Mock PO attachment
      ],
    });
    setIsEmailDialogOpen(true);
  };

  const handleConfirmOrderEmail = async () => {
    if (currentRequestForEmail) {
      await updateStatusMutation.mutateAsync({ id: currentRequestForEmail.id, status: "Ordered" });
      setCurrentRequestForEmail(null);
    }
  };

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
            <SelectItem value="Approved">Approved</SelectItem>
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
                          onClick={() => handleApproveRequest(request)}
                          title="Approve Request & Request Quote"
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}

                      {request.status === "Quote Requested" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenQuoteDetailsDialog(request)}
                          title="Enter Quote Details"
                          disabled={updateStatusMutation.isPending}
                        >
                          <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}

                      {request.status === "PO Requested" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSendPORequest(request)}
                          title="Send PO Request to Account Manager"
                          disabled={updateStatusMutation.isPending}
                        >
                          <Mail className="h-4 w-4 text-orange-600" />
                        </Button>
                      )}

                      {(request.status === "PO Requested" && request.po_number) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsOrdered(request)}
                          title="Mark as Ordered & Send Order Email to Vendor"
                          disabled={updateStatusMutation.isPending}
                        >
                          <Package className="h-4 w-4 text-blue-600" />
                        </Button>
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

      <EmailDialog
        isOpen={isEmailDialogOpen}
        onOpenChange={(open) => {
          setIsEmailDialogOpen(open);
          if (!open && currentRequestForEmail) {
            // If dialog is closed and there's a pending email action, confirm it
            if (currentRequestForEmail.status === "Pending") {
              handleConfirmQuoteRequest();
            } else if (currentRequestForEmail.status === "PO Requested") {
              handleConfirmPORequest();
            } else if (currentRequestForEmail.status === "Approved") {
              handleConfirmQuoteRequest(); // This handles the case where "Approved" leads to "Quote Requested"
            } else if (currentRequestForEmail.status === "PO Requested" && currentRequestForEmail.po_number) {
              handleConfirmOrderEmail();
            }
          }
        }}
        initialData={emailInitialData}
        onSend={handleSendEmail}
        isSending={sendEmailMutation.isPending}
      />

      <Dialog open={isQuoteDetailsDialogOpen} onOpenChange={setIsQuoteDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Quote Details</DialogTitle>
            <DialogDescription>
              Please provide the quote details (e.g., a link to the quote PDF or relevant text).
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
                value={currentRequestForQuote?.po_number || ""}
                onChange={(e) => setCurrentRequestForQuote(prev => prev ? { ...prev, po_number: e.target.value } : null)}
                className="col-span-3"
                placeholder="e.g., PO-12345"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsQuoteDetailsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveQuoteDetails} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save & Request PO"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestList;