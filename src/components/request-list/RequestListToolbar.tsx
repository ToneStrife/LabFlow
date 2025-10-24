"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestStatus } from "@/data/types";

interface RequestListToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterStatus: RequestStatus | "All";
  onStatusChange: (status: RequestStatus | "All") => void;
}

const RequestListToolbar: React.FC<RequestListToolbarProps> = ({
  searchTerm,
  onSearchChange,
  filterStatus,
  onStatusChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Input
        placeholder="Search requests (product, catalog, brand, vendor, requester, manager, quote, PO)..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1"
      />
      <Select value={filterStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Statuses</SelectItem>
          <SelectItem value="Pending">Pending</SelectItem>
          <SelectItem value="Quote Requested">Quote Requested</SelectItem>
          <SelectItem value="PO Requested">PO Requested</SelectItem>
          <SelectItem value="Ordered">Ordered</SelectItem>
          <SelectItem value="Received">Received</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default RequestListToolbar;