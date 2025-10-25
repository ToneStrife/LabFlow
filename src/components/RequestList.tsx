"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { RequestStatus } from "@/data/types";
import { useRequests, useSendEmail, SupabaseRequest, useUpdateRequest } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName, useAccountManagerProfiles } from "@/hooks/use-profiles";
import { useProjects } from "@/hooks/use-projects";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { processEmailTemplate } from "@/utils/email-templating";
import EmailDialog, { EmailFormValues } from "@/components/EmailDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RequestListToolbar from "@/components/request-list/RequestListToolbar";
import RequestListTable from "@/components/request-list/RequestListTable";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";

const RequestList: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useSession();
  const { data: requests, isLoading: isLoadingRequests, error: requestsError } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagerProfiles();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: emailTemplates, isLoading: isLoadingEmailTemplates } = useEmailTemplates();
  const updateRequestMutation = useUpdateRequest();
  const sendEmailMutation = useSendEmail();

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<RequestStatus | "All">("All");

  const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
  const [emailInitialData, setEmailInitialData] = React.useState<Partial<EmailFormValues>>({});
  
  const [isApproveRequestDialogOpen, setIsApproveRequestDialogOpen] = React.useState(false);
  const [requestToApprove, setRequestToApprove] = React.useState<SupabaseRequest | null>(null);

  const getRequesterName = (requesterId: string) => getFullName(profiles?.find(p => p.id === requesterId));
  const getAccountManagerName = (managerId: string | null) => {
    if (!managerId) return "N/A";
    const manager = accountManagers?.find(am => am.id === managerId);
    return getFullName(manager);
  };
  const getVendorEmail = (vendorId: string) => vendors?.find(v => v.id === vendorId)?.email || "";
  const getAccountManagerEmail = (managerId: string | null) => accountManagers?.find(am => am.id === managerId)?.email || "";

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

  const filteredRequests = (requests || []).filter(request => {
    const vendorName = vendors?.find(v => v.id === request.vendor_id)?.name || "";
    const requesterName = getRequesterName(request.requester_id);
    const accountManagerName = getAccountManagerName(request.account_manager_id);
    const searchTermLower = searchTerm.toLowerCase();

    const matchesSearchTerm = searchTermLower === "" ||
      request.items?.some(item =>
        item.product_name.toLowerCase().includes(searchTermLower) ||
        item.catalog_number.toLowerCase().includes(searchTermLower) ||
        (item.brand && item.brand.toLowerCase().includes(searchTermLower))
      ) ||
      vendorName.toLowerCase().includes(searchTermLower) ||
      requesterName.toLowerCase().includes(searchTermLower) ||
      accountManagerName.toLowerCase().includes(searchTermLower) ||
      (request.po_number && request.po_number.toLowerCase().includes(searchTermLower));

    const matchesStatus = filterStatus === "All" || request.status === filterStatus;
    return matchesSearchTerm && matchesStatus;
  });

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles || isLoadingAccountManagers || isLoadingProjects || isLoadingEmailTemplates) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading Requests...</div>;
  }

  if (requestsError) {
    return <div className="text-red-500">Error loading requests: {requestsError.message}</div>;
  }

  return (
    <div className="space-y-4">
      <RequestListToolbar searchTerm={searchTerm} onSearchChange={setSearchTerm} filterStatus={filterStatus} onStatusChange={setFilterStatus} />
      <RequestListTable
        requests={filteredRequests}
        vendors={vendors}
        profiles={profiles}
        isUpdatingStatus={updateRequestMutation.isPending}
        onViewDetails={(id) => navigate(`/requests/${id}`)}
        onApprove={openApproveRequestDialog}
        onEnterQuoteDetails={(req) => navigate(`/requests/${req.id}`)}
        onSendPORequest={handleSendPORequest}
        onMarkAsOrdered={(req) => navigate(`/requests/${req.id}`)}
        onMarkAsReceived={handleMarkAsReceived}
      />
      <Dialog open={isApproveRequestDialogOpen} onOpenChange={setIsApproveRequestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>Choose how to proceed with this request.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={() => updateRequestMutation.mutate({ id: requestToApprove!.id, data: { status: "Quote Requested" } }).then(() => setIsApproveRequestDialogOpen(false))}>Approve Only</Button>
            <Button onClick={handleApproveAndRequestQuoteEmail} disabled={updateRequestMutation.isPending}>Approve & Request Quote (Email)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EmailDialog isOpen={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen} initialData={emailInitialData} onSend={handleSendEmail} isSending={sendEmailMutation.isPending} />
    </div>
  );
};

export default RequestList;