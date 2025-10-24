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
import { Eye, CheckCircle, Package, Receipt, Loader2 } from "lucide-react";
import { RequestStatus } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRequests, useUpdateRequestStatus, SupabaseRequest } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles"; // Import profile hook and helper
import { format } from "date-fns";

const getStatusBadgeVariant = (status: RequestStatus) => {
  switch (status) {
    case "Pending":
      return "secondary";
    case "Approved":
      return "default";
    case "Ordered":
      return "outline";
    case "Received":
      return "default";
    default:
      return "secondary";
  }
};

const RequestList: React.FC = () => {
  const navigate = useNavigate();
  const { data: requests, isLoading: isLoadingRequests, error: requestsError } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles(); // Fetch all profiles
  const updateStatusMutation = useUpdateRequestStatus();

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<RequestStatus | "All">("All");

  const allRequests = requests || [];

  const handleViewDetails = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const handleUpdateStatus = (requestId: string, newStatus: RequestStatus) => {
    updateStatusMutation.mutate({ id: requestId, status: newStatus });
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
      accountManagerName.toLowerCase().includes(searchTerm.toLowerCase());

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
          placeholder="Search requests (product, catalog, brand, vendor, requester, manager)..."
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
              <TableHead>Account Manager</TableHead> {/* New column */}
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
                    <TableCell>{accountManagerName}</TableCell> {/* Display manager name */}
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
                          onClick={() => handleUpdateStatus(request.id, "Approved")}
                          title="Approve Request"
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {(request.status === "Pending" || request.status === "Approved") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateStatus(request.id, "Ordered")}
                          title="Mark as Ordered"
                          disabled={updateStatusMutation.isPending}
                        >
                          <Package className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                      {(request.status === "Ordered") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateStatus(request.id, "Received")}
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
    </div>
  );
};

export default RequestList;