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
import SedeDot from "@/components/SedeDot";
import { SEDES, TODAS_LAS_SEDES } from "@/lib/sedes";
import { ROL_ETIQUETA } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface UserTableProps {
  users: Profile[];
  onRoleChange: (userId: string, newRole: Profile["role"]) => void;
  onDefaultSedeChange: (userId: string, sedeId: string | null) => void;
  onDelete: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  currentUserId?: string;
  isUpdatingRole: boolean;
  isUpdatingDefaultSede: boolean;
  isDeletingUser: boolean;
  isResettingPassword: boolean;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  onRoleChange,
  onDefaultSedeChange,
  onDelete,
  onResetPassword,
  currentUserId,
  isUpdatingRole,
  isUpdatingDefaultSede,
  isDeletingUser,
  isResettingPassword,
}) => {
  const availableRoles: Profile["role"][] = ["Requester", "Account Manager", "Admin"];

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 px-3">Usuario</TableHead>
            <TableHead className="h-9 px-3 w-[9.5rem]">Rol</TableHead>
            <TableHead className="h-9 px-3 w-[8.5rem]">Sede</TableHead>
            <TableHead className="h-9 px-3 w-[5.5rem] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                No se encontraron usuarios.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="px-3 py-2 align-middle">
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-medium">{getFullName(user)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email || "Sin email"}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Select
                    value={user.role}
                    onValueChange={(newRole: Profile["role"]) => onRoleChange(user.id, newRole)}
                    disabled={user.id === currentUserId || isUpdatingRole}
                  >
                    <SelectTrigger className="h-8 w-full min-w-[8.5rem] text-xs">
                      <SelectValue placeholder="Rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role} className="text-xs">
                          {ROL_ETIQUETA[role] ?? role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Select
                    value={user.default_sede_id ?? TODAS_LAS_SEDES}
                    onValueChange={(value) =>
                      onDefaultSedeChange(
                        user.id,
                        value === TODAS_LAS_SEDES ? null : value
                      )
                    }
                    disabled={isUpdatingDefaultSede}
                  >
                    <SelectTrigger className="h-8 w-full min-w-[7.5rem] text-xs">
                      <SelectValue placeholder="Sede" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODAS_LAS_SEDES} className="text-xs">
                        Todas
                      </SelectItem>
                      {SEDES.map((sede) => (
                        <SelectItem key={sede.id} value={sede.id} className="text-xs">
                          <span className="flex items-center gap-2">
                            <SedeDot color={sede.color} />
                            {sede.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onResetPassword(user.id)}
                      title="Restablecer contraseña"
                      disabled={isResettingPassword}
                    >
                      {isResettingPassword ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <KeyRound className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      )}
                      onClick={() => onDelete(user.id)}
                      title="Eliminar usuario"
                      disabled={user.id === currentUserId || isDeletingUser}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
