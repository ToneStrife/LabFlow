"use client";

import React from "react";
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

// Define a type for the request status
type RequestStatus = "Pending" | "Approved" | "Ordered" | "Received";

// Mock data for lab order requests
const mockRequests = [
  {
    id: "req1",
    title: "Antibodies for Project X",
    requester: "Dr. Alice Smith",
    projectCode: "P12345",
    status: "Pending" as RequestStatus,
    date: "2023-10-26",
  },
  {
    id: "req2",
    title: "PCR Reagents Refill",
    requester: "Dr. Bob Johnson",
    projectCode: "P67890",
    status: "Ordered" as RequestStatus,
    date: "2023-10-25",
  },
  {
    id: "req3",
    title: "Custom Peptide Synthesis",
    requester: "Dr. Alice Smith",
    projectCode: "P12345",
    status: "Approved" as RequestStatus,
    date: "2023-10-24",
  },
  {
    id: "req4",
    title: "Consumables for Cell Culture",
    requester: "Dr. Carol White",
    projectCode: "CULT001",
    status: "Received" as RequestStatus,
    date: "2023-10-23",
  },
  {
    id: "req5",
    title: "New Microscope Slides",
    requester: "Dr. Bob Johnson",
    projectCode: "P67890",
    status: "Pending" as RequestStatus,
    date: "2023-10-22",
  },
];

const getStatusBadgeVariant = (status: RequestStatus) => {
  switch (status) {
    case "Pending":
      return "secondary";
    case "Approved":
      return "default"; // Or a custom green variant
    case "Ordered":
      return "outline"; // Or a custom blue variant
    case "Received":
      return "default"; // Or a custom success variant
    default:
      return "secondary";
  }
};

const RequestList: React.FC = () => {
  const handleViewDetails = (requestId: string) => {
    console.log(`View details for request: ${requestId}`);
    // Implement navigation to a request details page
  };

  const handleApprove = (requestId: string) => {
    console.log(`Approve request: ${requestId}`);
    // Implement logic to change request status to Approved
  };

  const handleMarkOrdered = (requestId: string) => {
    console.log(`Mark request as Ordered: ${requestId}`);
    // Implement logic to change request status to Ordered
  };

  const handleMarkReceived = (requestId: string) => {
    console.log(`Mark request as Received: ${requestId}`);
    // Implement logic to change request status to Received
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Project Code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.title}</TableCell>
              <TableCell>{request.requester}</TableCell>
              <TableCell>{request.projectCode}</TableCell>
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
                    onClick={() => handleApprove(request.id)}
                    title="Approve Request"
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </Button>
                )}
                {(request.status === "Pending" || request.status === "Approved") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMarkOrdered(request.id)}
                    title="Mark as Ordered"
                  >
                    <Package className="h-4 w-4 text-blue-600" />
                  </Button>
                )}
                {(request.status === "Ordered") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMarkReceived(request.id)}
                    title="Mark as Received"
                  >
                    <Receipt className="h-4 w-4 text-purple-600" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RequestList;