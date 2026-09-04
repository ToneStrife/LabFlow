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
import { Trash2, Loader2, KeyRound } from "lucide-react";
import { getFullName } from "@/hooks/use-profiles";
import { Profile } from "@/data/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserTableProps {
  users: Profile[];
  onRoleChange: (userId: string, newRole: Profile['role']) => void;
  onDelete: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  currentUserId?: string;
  isUpdatingRole: boolean;
  isDeletingUser: boolean;
  isResettingPassword: boolean;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  onRoleChange,
  onDelete,
  onResetPassword,
  currentUserId,
  isUpdatingRole,
  isDeletingUser,
  isResettingPassword,
}) => {
  const availableRoles: Profile['role'][] = ["Requester", "Account Manager", "Admin"];

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No se encontraron usuarios.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{getFullName(user)}</TableCell>
                <TableCell>{user.email || "N/A"}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(newRole: Profile['role']) => onRoleChange(user.id, newRole)}
                    disabled={user.id === currentUserId || isUpdatingRole}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onResetPassword(user.id)}
                    title="Enviar restablecimiento de contraseña"
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(user.id)}
                    title="Eliminar Usuario"
                    disabled={user.id === currentUserId || isDeletingUser}
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

export default UserTable;
