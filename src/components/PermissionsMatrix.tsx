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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePermissionCatalog,
  useRolePermissions,
  useUserPermissions,
  useSetRolePermission,
  useSetUserPermission,
  type PermissionDef,
} from "@/hooks/use-permissions";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { ROL_ETIQUETA } from "@/lib/navigation";
import { Profile } from "@/data/types";

const ROLES: Profile["role"][] = ["Requester", "Account Manager", "Admin"];

/** Agrupa el catalogo por area, respetando el orden que trae de la base. */
const agruparPorCategoria = (permisos: PermissionDef[]) => {
  const grupos = new Map<string, PermissionDef[]>();
  for (const permiso of permisos) {
    const lista = grupos.get(permiso.category) ?? [];
    lista.push(permiso);
    grupos.set(permiso.category, lista);
  }
  return [...grupos.entries()];
};

const PorRol: React.FC = () => {
  const { data: catalogo, isLoading: cargandoCatalogo } = usePermissionCatalog();
  const { data: porRol, isLoading: cargandoRoles } = useRolePermissions();
  const setRolePermission = useSetRolePermission();

  if (cargandoCatalogo || cargandoRoles) {
    return (
      <div className="flex items-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando permisos...
      </div>
    );
  }

  const concedido = (role: string, key: string) =>
    porRol?.find((f) => f.role === role && f.permission_key === key)?.allowed ?? false;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Lo que puede hacer cada rol. Los cambios se aplican al momento, tanto en la
        interfaz como en el servidor.
      </p>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[280px]">Permiso</TableHead>
              {ROLES.map((rol) => (
                <TableHead key={rol} className="text-center whitespace-nowrap">
                  {ROL_ETIQUETA[rol]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {agruparPorCategoria(catalogo ?? []).map(([categoria, permisos]) => (
              <React.Fragment key={categoria}>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell
                    colSpan={ROLES.length + 1}
                    className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {categoria}
                  </TableCell>
                </TableRow>
                {permisos.map((permiso) => (
                  <TableRow key={permiso.key}>
                    <TableCell>
                      <div className="font-medium">{permiso.label}</div>
                      {permiso.description && (
                        <div className="text-xs text-muted-foreground">{permiso.description}</div>
                      )}
                    </TableCell>
                    {ROLES.map((rol) => {
                      // Si estas dos se pudieran quitar al administrador, un
                      // descuido dejaria la aplicacion sin nadie capaz de
                      // volver a repartir permisos.
                      const fijoParaAdmin =
                        rol === "Admin" &&
                        (permiso.key === "users.manage" || permiso.key === "permissions.manage");

                      return (
                        <TableCell key={rol} className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={fijoParaAdmin ? true : concedido(rol, permiso.key)}
                              disabled={fijoParaAdmin || setRolePermission.isPending}
                              onCheckedChange={(valor) =>
                                setRolePermission.mutate({
                                  role: rol,
                                  permission_key: permiso.key,
                                  allowed: valor,
                                })
                              }
                            />
                            {fijoParaAdmin && (
                              <span className="text-[10px] text-muted-foreground">fijo</span>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Gestionar usuarios y gestionar permisos están fijos para el administrador, para que
          no sea posible dejar la aplicación sin nadie que pueda repartir permisos.
        </span>
      </div>
    </div>
  );
};

const PorPersona: React.FC = () => {
  const { data: catalogo, isLoading: cargandoCatalogo } = usePermissionCatalog();
  const { data: perfiles, isLoading: cargandoPerfiles } = useAllProfiles();
  const { data: excepciones, isLoading: cargandoExcepciones } = useUserPermissions();
  const setUserPermission = useSetUserPermission();
  const [usuarioId, setUsuarioId] = React.useState<string | undefined>(undefined);

  if (cargandoCatalogo || cargandoPerfiles || cargandoExcepciones) {
    return (
      <div className="flex items-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  const usuario = perfiles?.find((p) => p.id === usuarioId);
  const esPropietario = !!(usuario as (Profile & { is_owner?: boolean }) | undefined)?.is_owner;

  const estadoDe = (key: string): "hereda" | "si" | "no" => {
    const fila = excepciones?.find((e) => e.user_id === usuarioId && e.permission_key === key);
    if (!fila) return "hereda";
    return fila.allowed ? "si" : "no";
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Excepciones para una persona concreta. Mandan sobre lo que diga su rol, así que
        conviene usarlas con cuentagotas: cuantas más haya, más difícil resulta saber por qué
        alguien puede o no puede algo.
      </p>

      <div className="max-w-md space-y-2">
        <label className="text-sm font-medium">Persona</label>
        <Select value={usuarioId} onValueChange={setUsuarioId}>
          <SelectTrigger>
            <SelectValue placeholder="Elige a quién quieres ajustar" />
          </SelectTrigger>
          <SelectContent>
            {(perfiles ?? []).map((perfil) => (
              <SelectItem key={perfil.id} value={perfil.id}>
                {getFullName(perfil)} ({ROL_ETIQUETA[perfil.role]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {usuario && (
        <>
          {esPropietario && (
            <div className="flex gap-2 rounded-md border bg-muted/30 p-3 text-sm">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Es la persona propietaria de LabFlow: tiene todos los permisos y no se le
                pueden retirar desde aquí.
              </span>
            </div>
          )}

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[280px]">Permiso</TableHead>
                  <TableHead className="w-[220px]">Para esta persona</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agruparPorCategoria(catalogo ?? []).map(([categoria, permisos]) => (
                  <React.Fragment key={categoria}>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell
                        colSpan={2}
                        className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {categoria}
                      </TableCell>
                    </TableRow>
                    {permisos.map((permiso) => {
                      const estado = estadoDe(permiso.key);
                      return (
                        <TableRow key={permiso.key}>
                          <TableCell>
                            <div className="font-medium">{permiso.label}</div>
                            {permiso.description && (
                              <div className="text-xs text-muted-foreground">
                                {permiso.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                value={estado}
                                disabled={esPropietario || setUserPermission.isPending}
                                onValueChange={(valor) =>
                                  setUserPermission.mutate({
                                    user_id: usuario.id,
                                    permission_key: permiso.key,
                                    allowed: valor === "hereda" ? null : valor === "si",
                                  })
                                }
                              >
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hereda">Según su rol</SelectItem>
                                  <SelectItem value="si">Sí, siempre</SelectItem>
                                  <SelectItem value="no">No, nunca</SelectItem>
                                </SelectContent>
                              </Select>
                              {estado !== "hereda" && (
                                <Badge variant="outline" className="text-xs">
                                  excepción
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export const PermissionsMatrix: React.FC = () => {
  const [vista, setVista] = React.useState<"rol" | "persona">("rol");

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setVista("rol")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            vista === "rol"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          Por rol
        </button>
        <button
          type="button"
          onClick={() => setVista("persona")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            vista === "persona"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          Excepciones por persona
        </button>
      </div>

      {vista === "rol" ? <PorRol /> : <PorPersona />}
    </div>
  );
};

export default PermissionsMatrix;
