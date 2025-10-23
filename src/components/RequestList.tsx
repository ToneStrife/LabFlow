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
import { Eye, CheckCircle, Package, Receipt } from "lucide-react";
import { mockVendors, updateRequestStatus, RequestStatus, LabRequest, subscribeToRequests, mockRequests, getUserFullName } from "@/data/mockData"; // Added getUserFullName
import { Input } from "@/components/ui/input"; // Import Input for search
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select for status filter

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
  const [requests, setRequests] = React.useState<LabRequest[]>(mockRequests);
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<RequestStatus | "All">("All");

  // Subscribe to changes in mockRequests
  React.useEffect(() => {
    const unsubscribe = subscribeToRequests(updatedRequests => {
      setRequests(updatedRequests);
    });
    return () => unsubscribe(); // Clean up subscription on unmount
  }, []);

  const handleViewDetails = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const handleUpdateStatus = (requestId: string, newStatus: RequestStatus) => {
    updateRequestStatus(requestId, newStatus);
    // The setRequests in the useEffect will handle the re-render
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearchTerm = searchTerm.toLowerCase() === "" ||
      request.items.some(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.catalogNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      ) ||
      mockVendors.find(v => v.id === request.vendorId)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserFullName(request.requesterId).toLowerCase().includes(searchTerm.toLowerCase()); // Use getUserFullName for search

    const matchesStatus = filterStatus === "All" || request.status === filterStatus;

    return matchesSearchTerm && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search requests (product, catalog, brand, vendor, requester)..."
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
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No requests found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => {
                const vendor = mockVendors.find(v => v.id === request.vendorId);
                const requesterName = getUserFullName(request.requesterId); // Use helper function
                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{vendor?.name || "N/A"}</TableCell>
                    <TableCell>{requesterName}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{request.date}</TableCell>
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