"use client";

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

// Define a type for the request status
type RequestStatus = "Pending" | "Approved" | "Ordered" | "Received";

// Mock data for a single lab order request
const mockRequestDetails = {
  id: "req1",
  title: "Antibodies for Project X",
  requester: "Dr. Alice Smith",
  projectCode: "P12345",
  status: "Pending" as RequestStatus,
  date: "2023-10-26",
  notes: "Need these urgently for upcoming experiments. Please prioritize.",
  items: [
    {
      id: "item1",
      productName: "Anti-GFP Antibody (Rabbit Polyclonal)",
      catalogNumber: "ab12345",
      quantity: 2,
      unitPrice: 120.50,
      vendor: "Abcam",
      link: "https://www.abcam.com/anti-gfp-antibody-ab12345.html",
      notes: "Lot specific, check expiry date.",
    },
    {
      id: "item2",
      productName: "Secondary Antibody (Goat Anti-Rabbit IgG)",
      catalogNumber: "SA-2000",
      quantity: 1,
      unitPrice: 85.00,
      vendor: "Vector Labs",
      link: "https://vectorlabs.com/goat-anti-rabbit-igg.html",
      notes: "",
    },
  ],
  attachments: [
    { name: "Quote_Abcam_ab12345.pdf", url: "#" },
    { name: "ProjectX_ReagentList.xlsx", url: "#" },
  ],
};

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

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // In a real app, you would fetch request details by ID from an API
  // For now, we'll use the mock data.
  const request = mockRequestDetails; // Assuming 'id' matches mockRequestDetails.id for this example

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

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" onClick={() => navigate("/dashboard")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Request: {request.title}</span>
            <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Requester</p>
              <p className="font-medium">{request.requester}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Project Code</p>
              <p className="font-medium">{request.projectCode || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date Submitted</p>
              <p className="font-medium">{request.date}</p>
            </div>
          </div>

          {request.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{request.notes}</p>
              </div>
            </>
          )}

          <Separator />

          <h2 className="text-xl font-semibold mb-4">Requested Items</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Catalog #</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {request.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.catalogNumber || "N/A"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : "N/A"}</TableCell>
                    <TableCell>{item.vendor || "N/A"}</TableCell>
                    <TableCell>
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          View Product
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {request.attachments && request.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-xl font-semibold mb-4">Attachments</h2>
                <ul className="list-disc pl-5 space-y-1">
                  {request.attachments.map((attachment, index) => (
                    <li key={index}>
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {attachment.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestDetails;