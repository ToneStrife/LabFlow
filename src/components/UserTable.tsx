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
import { Trash2, Loader2 } from "lucide-react";
import { Profile, getFullName } from "@/hooks/use-profiles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface UserTableProps {
  users: Profile[];
  onRoleChange: (userId: string, newRole: Profile['role']) => void;
  onDelete: (userId: string) => void;
  currentUserId?: string; // ID del usuario actualmente logueado
  isUpdatingRole: boolean;
  isDeletingUser: boolean;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  onRoleChange,
  onDelete,
  currentUserId,
  isUpdatingRole,
  isDeletingUser,
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
                    disabled={user.id === currentUserId || isUpdatingRole} // No permitir cambiar el rol del propio usuario o si ya se está actualizando
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
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(user.id)}
                    title="Eliminar Usuario"
                    disabled={user.id === currentUserId || isDeletingUser} // No permitir eliminar el propio usuario o si ya se está eliminando
                  >
                    {isDeletingUser && user.id === currentUserId ? ( // Mostrar loader solo si es el usuario que se está eliminando
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
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