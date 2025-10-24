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
import { ArrowLeft, Loader2 } from "lucide-react";
import { mockProjects, RequestStatus } from "@/data/mockData";
import { useRequests, SupabaseRequest } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
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

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: requests, isLoading: isLoadingRequests } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();

  const request = requests?.find(req => req.id === id);

  if (isLoadingRequests || isLoadingVendors || isLoadingProfiles) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Request Details...
      </div>
    );
  }

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

  const vendor = vendors?.find(v => v.id === request.vendor_id);
  const accountManagerProfile = profiles?.find(p => p.id === request.account_manager_id);
  const accountManagerName = getFullName(accountManagerProfile);
  const requesterProfile = profiles?.find(p => p.id === request.requester_id);
  const requesterName = getFullName(requesterProfile);

  const projectCodesDisplay = request.project_codes?.map(projectId => {
    const project = mockProjects.find(p => p.id === projectId);
    return project ? project.code : projectId;
  }).join(", ") || "N/A";

  const dateSubmitted = format(new Date(request.created_at), 'yyyy-MM-dd HH:mm');

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" onClick={() => navigate("/dashboard")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Request from: {vendor?.name || "N/A"}</span>
            <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Requester</p>
              <p className="font-medium">{requesterName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account Manager</p>
              <p className="font-medium">{accountManagerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Project Codes</p>
              <p className="font-medium">{projectCodesDisplay}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date Submitted</p>
              <p className="font-medium">{dateSubmitted}</p>
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
                  <TableHead>Brand</TableHead>
                  <TableHead>Catalog #</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {request.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.brand || "N/A"}</TableCell>
                    <TableCell>{item.catalog_number || "N/A"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit_price ? `$${Number(item.unit_price).toFixed(2)}` : "N/A"}</TableCell>
                    <TableCell>{item.format || "N/A"}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestDetails;