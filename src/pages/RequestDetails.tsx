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
import { mockRequests, mockVendors, mockProjects, RequestStatus } from "@/data/mockData"; // Import shared mock data

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

  // Find the request from the centralized mock data
  const request = mockRequests.find(req => req.id === id);
  const vendor = request ? mockVendors.find(v => v.id === request.vendorId) : undefined;

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

  const projectCodesDisplay = request.projectCodes?.map(projectId => {
    const project = mockProjects.find(p => p.id === projectId);
    return project ? project.code : projectId;
  }).join(", ") || "N/A";

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" onClick={() => navigate("/dashboard")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Request from: {vendor?.name || "N/A"}</span> {/* Display vendor name */}
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
              <p className="text-sm text-muted-foreground">Project Codes</p>
              <p className="font-medium">{projectCodesDisplay}</p>
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
                  <TableHead>Format</TableHead> {/* New column for Format */}
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
                    <TableCell>{item.format || "N/A"}</TableCell> {/* Display format */}
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