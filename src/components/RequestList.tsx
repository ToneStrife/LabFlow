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
import { mockVendors, updateRequestStatus, RequestStatus, LabRequest, subscribeToRequests, mockRequests } from "@/data/mockData"; // Import subscribeToRequests

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
  const [requests, setRequests] = React.useState<LabRequest[]>(mockRequests); // Initialize with current mock data

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
    updateRequestStatus(requestId, newStatus); // This function now notifies listeners
    // The setRequests in the useEffect will handle the re-render
  };

  return (
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