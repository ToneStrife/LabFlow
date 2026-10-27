import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Lab, LabMember, LabMemberRole, SedeRecord } from "@/data/types";

export type CreateLabInput = {
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  members: Array<{ user_id: string; role: LabMemberRole; smtp_from?: string | null }>;
  sedes: Array<{
    id?: string;
    name: string;
    tipo: "cibm" | "farmacia" | "otro";
    color?: string;
    descripcion?: string | null;
    hero_gradient?: string;
  }>;
};

export const useLabs = () =>
  useQuery({
    queryKey: ["labs"],
    queryFn: async (): Promise<Lab[]> => {
      const { data, error } = await supabase
        .from("labs")
        .select("*")
        .eq("activo", true)
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as Lab[];
    },
  });

export const useSedes = () =>
  useQuery({
    queryKey: ["sedes"],
    queryFn: async (): Promise<SedeRecord[]> => {
      const { data, error } = await supabase
        .from("sedes")
        .select("*")
        .eq("activo", true)
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as SedeRecord[];
    },
  });

export const useMyLabMemberships = () =>
  useQuery({
    queryKey: ["lab_members", "mine"],
    queryFn: async (): Promise<LabMember[]> => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("lab_members")
        .select("*")
        .eq("user_id", uid);
      if (error) throw new Error(error.message);
      return (data ?? []) as LabMember[];
    },
  });

export const useLabMembers = (labId?: string | null) =>
  useQuery({
    queryKey: ["lab_members", labId],
    enabled: Boolean(labId),
    queryFn: async (): Promise<LabMember[]> => {
      const { data, error } = await supabase
        .from("lab_members")
        .select("*")
        .eq("lab_id", labId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as LabMember[];
    },
  });

export const useCreateLab = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLabInput): Promise<Lab> => {
      const { data, error } = await supabase.rpc("create_lab_with_sedes", {
        p_name: input.name,
        p_slug: input.slug,
        p_description: input.description ?? null,
        p_logo_url: input.logo_url ?? null,
        p_members: input.members,
        p_sedes: input.sedes,
      });
      if (error) throw new Error(error.message);
      return data as Lab;
    },
    onSuccess: (lab) => {
      toast.success(`Laboratorio «${lab.name}» creado.`);
      qc.invalidateQueries({ queryKey: ["labs"] });
      qc.invalidateQueries({ queryKey: ["sedes"] });
      qc.invalidateQueries({ queryKey: ["lab_members"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo crear el laboratorio.");
    },
  });
};
