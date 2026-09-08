"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";

export interface PermissionDef {
  key: string;
  label: string;
  description: string | null;
  category: string;
  sort_order: number;
}

export interface RolePermission {
  role: string;
  permission_key: string;
  allowed: boolean;
}

export interface UserPermission {
  user_id: string;
  permission_key: string;
  allowed: boolean;
}

/**
 * Los permisos de quien esta usando la aplicacion.
 *
 * Se los pedimos al servidor en vez de calcularlos aqui con las tres tablas:
 * la misma funcion que usan las politicas de Supabase responde tambien a la
 * interfaz, asi que no pueden acabar diciendo cosas distintas.
 */
export const useMyPermissions = () => {
  const { session } = useSession();

  return useQuery<Set<string>, Error>({
    queryKey: ["myPermissions", session?.user?.id],
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_permissions");
      if (error) throw new Error(error.message);
      return new Set<string>((data ?? []).map((f: { permission_key: string }) => f.permission_key));
    },
  });
};

/** Atajo para preguntar por un permiso concreto. */
export const useCan = () => {
  const { data, isLoading } = useMyPermissions();
  return {
    can: (key?: string) => (key ? data?.has(key) ?? false : true),
    cargandoPermisos: isLoading,
  };
};

// --- Lo que necesita la matriz del panel de Admin ---

export const usePermissionCatalog = () =>
  useQuery<PermissionDef[], Error>({
    queryKey: ["permissionCatalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return data as PermissionDef[];
    },
  });

export const useRolePermissions = () =>
  useQuery<RolePermission[], Error>({
    queryKey: ["rolePermissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permissions").select("*");
      if (error) throw new Error(error.message);
      return data as RolePermission[];
    },
  });

export const useUserPermissions = () =>
  useQuery<UserPermission[], Error>({
    queryKey: ["userPermissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_permissions").select("*");
      if (error) throw new Error(error.message);
      return data as UserPermission[];
    },
  });

export const useSetRolePermission = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { role: string; permission_key: string; allowed: boolean }>({
    mutationFn: async ({ role, permission_key, allowed }) => {
      const { error } = await supabase
        .from("role_permissions")
        .upsert({ role, permission_key, allowed, updated_at: new Date().toISOString() },
                { onConflict: "role,permission_key" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rolePermissions"] });
      // Puede afectar a quien lo esta cambiando.
      queryClient.invalidateQueries({ queryKey: ["myPermissions"] });
    },
    onError: (error) => {
      toast.error("No se pudo guardar el permiso.", { description: error.message });
    },
  });
};

/** allowed a null quita la excepcion y devuelve a la persona a lo que diga su rol. */
export const useSetUserPermission = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { user_id: string; permission_key: string; allowed: boolean | null }>({
    mutationFn: async ({ user_id, permission_key, allowed }) => {
      if (allowed === null) {
        const { error } = await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", user_id)
          .eq("permission_key", permission_key);
        if (error) throw new Error(error.message);
        return;
      }

      const { error } = await supabase
        .from("user_permissions")
        .upsert({ user_id, permission_key, allowed, updated_at: new Date().toISOString() },
                { onConflict: "user_id,permission_key" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPermissions"] });
      queryClient.invalidateQueries({ queryKey: ["myPermissions"] });
    },
    onError: (error) => {
      toast.error("No se pudo guardar la excepción.", { description: error.message });
    },
  });
};
