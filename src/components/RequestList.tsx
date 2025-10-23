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
import { mockRequests, mockVendors, updateRequestStatus, RequestStatus, LabRequest } from "@/data/mockData"; // Import shared mock data and functions

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
  const [requests, setRequests] = React.useState<LabRequest[]>(mockRequests); // Use local state to trigger re-renders

  // Effect to update local state when mockRequests might change (e.g., new request added)
  React.useEffect(() => {
    setRequests([...mockRequests]); // Create a new array to ensure state update
  }, [mockRequests]); // Depend on mockRequests array reference

  const handleViewDetails = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const handleUpdateStatus = (requestId: string, newStatus: RequestStatus) => {
    const updatedRequest = updateRequestStatus(requestId, newStatus);
    if (updatedRequest) {
      setRequests((prev) => prev.map(req => req.id === requestId ? updatedRequest : req));
      // For a real app, you'd likely refetch or use a global state manager
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead> {/* Changed from Title to Vendor */}
            <TableHead>Requester</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No requests found.
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => {
              const vendor = mockVendors.find(v => v.id === request.vendorId);
              return (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{vendor?.name || "N/A"}</TableCell>
                  <TableCell>{request.requester}</TableCell>
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
  );
};

export default RequestList;