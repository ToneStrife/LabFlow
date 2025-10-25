"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SupabaseRequest, RequestStatus } from "@/data/types";
import { Vendor } from "@/hooks/use-vendors";
import { Profile, getFullName, useAccountManagerProfiles } from "@/hooks/use-profiles";
import { Project } from "@/data/types";
import { useProjects } from "@/hooks/use-projects";
import { format } from "date-fns";

interface RequestSummaryCardProps {
  request: SupabaseRequest;
  vendor?: Vendor;
  profiles?: Profile[];
}

const getStatusBadgeVariant = (status: RequestStatus) => {
  switch (status) {
    case "Pending":
      return "secondary";
    case "Quote Requested":
      return "outline";
    case "PO Requested":
      return "destructive";
    case "Ordered":
      return "default";
    case "Received":
      return "success";
    default:
      return "secondary";
  }
};

const RequestSummaryCard: React.FC<RequestSummaryCardProps> = ({ request, vendor, profiles }) => {
  const { data: accountManagers } = useAccountManagerProfiles();
  const { data: projects } = useProjects();

  const getRequesterName = (requesterId: string) => {
    const profile = profiles?.find(p => p.id === requesterId);
    return getFullName(profile);
  };

  const getAccountManagerName = (managerId: string | null) => {
    if (!managerId) return "N/A";
    const manager = accountManagers?.find(am => am.id === managerId);
    return getFullName(manager);
  };

  const requesterName = getRequesterName(request.requester_id);
  const accountManagerName = getAccountManagerName(request.account_manager_id);

  const projectCodesDisplay = request.project_codes?.map(projectId => {
    const project = projects?.find(p => p.id === projectId);
    return project ? project.code : projectId;
  }).join(", ") || "N/A";

  const dateSubmitted = format(new Date(request.created_at), 'yyyy-MM-dd HH:mm');

  return (
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
          <div>
            <p className="text-sm text-muted-foreground">Quote Details</p>
            <p className="font-medium">
              {request.quote_url ? (
                <a href={request.quote_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  View Quote
                </a>
              ) : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">PO Number</p>
            <p className="font-medium">{request.po_number || "N/A"}</p>
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
      </CardContent>
    </Card>
  );
};

export default RequestSummaryCard;