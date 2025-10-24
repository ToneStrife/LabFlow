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
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { CustomerAccount } from "@/hooks/use-customer-accounts";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";

interface CustomerAccountTableProps {
  accounts: CustomerAccount[];
  onEdit: (account: CustomerAccount) => void;
  onDelete: (accountId: string) => void;
}

const CustomerAccountTable: React.FC<CustomerAccountTableProps> = ({ accounts, onEdit, onDelete }) => {
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();

  const getManagerName = (managerId: string | null) => {
    if (!managerId) return "N/A";
    const managerProfile = profiles?.find(p => p.id === managerId);
    return getFullName(managerProfile);
  };

  if (isLoadingProfiles) {
    return <p>Loading profiles...</p>; // Or a skeleton loader
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Name</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Assigned Manager</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No customer accounts found.
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell>{account.contact_person || "N/A"}</TableCell>
                <TableCell>{account.email || "N/A"}</TableCell>
                <TableCell>{account.phone || "N/A"}</TableCell>
                <TableCell>{getManagerName(account.assigned_manager_id)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(account)}
                    className="mr-2"
                    title="Edit Account"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(account.id)}
                    title="Delete Account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomerAccountTable;