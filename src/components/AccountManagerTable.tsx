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
import { AccountManager } from "@/data/types";

interface AccountManagerTableProps {
  accountManagers: AccountManager[];
  onEdit: (manager: AccountManager) => void;
  onDelete: (managerId: string) => void;
}

const AccountManagerTable: React.FC<AccountManagerTableProps> = ({ accountManagers, onEdit, onDelete }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accountManagers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                No account managers found.
              </TableCell>
            </TableRow>
          ) : (
            accountManagers.map((manager) => (
              <TableRow key={manager.id}>
                <TableCell className="font-medium">{manager.name}</TableCell>
                <TableCell>{manager.email || "N/A"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(manager)}
                    className="mr-2"
                    title="Edit Account Manager"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(manager.id)}
                    title="Delete Account Manager"
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

export default AccountManagerTable;