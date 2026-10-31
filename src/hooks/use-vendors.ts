import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Vendor, VendorLabOverride, VendorScope } from '@/data/types';

export interface VendorFormValues {
  name: string;
  contact_person: string | null;
  email: string | null;
  email_presupuesto: string | null;
  email_pedido: string | null;
  phone: string | null;
  notes: string | null;
  brands: string | null;
  scope?: VendorScope;
  lab_id?: string | null;
}

export interface VendorOverrideFormValues {
  email: string | null;
  email_presupuesto: string | null;
  email_pedido: string | null;
  contact_person: string | null;
  phone: string | null;
  notes: string | null;
  disabled_for_lab: boolean;
}

const parseBrandsString = (brandsString: string | null | undefined): string[] | null => {
  if (!brandsString) return null;
  const brandsArray = brandsString.split(",").map((brand) => brand.trim()).filter(Boolean);
  return brandsArray.length > 0 ? brandsArray : null;
};

export const useVendors = () => {
  return useQuery<Vendor[], Error>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('*');
      if (error) throw new Error(error.message);
      return (data || []) as Vendor[];
    },
  });
};

export const useVendorLabOverrides = (labId?: string | null) => {
  return useQuery<VendorLabOverride[], Error>({
    queryKey: ['vendor_lab_overrides', labId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('vendor_lab_overrides').select('*');
      if (labId) q = q.eq('lab_id', labId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data || []) as VendorLabOverride[];
    },
  });
};

export const useAddVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: VendorFormValues) => {
      const scope = vendor.scope ?? 'global';
      const { data, error } = await supabase
        .from('vendors')
        .insert([{
          name: vendor.name,
          contact_person: vendor.contact_person,
          email: vendor.email_presupuesto || vendor.email_pedido || vendor.email,
          email_presupuesto: vendor.email_presupuesto,
          email_pedido: vendor.email_pedido,
          phone: vendor.phone,
          notes: vendor.notes,
          brands: parseBrandsString(vendor.brands),
          scope,
          lab_id: scope === 'lab' ? vendor.lab_id ?? null : null,
        }])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Proveedor añadido.');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error('No se pudo añadir el proveedor.', { description: error.message });
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VendorFormValues }) => {
      const scope = data.scope ?? 'global';
      const { data: updatedData, error } = await supabase
        .from('vendors')
        .update({
          name: data.name,
          contact_person: data.contact_person,
          email: data.email_presupuesto || data.email_pedido || data.email,
          email_presupuesto: data.email_presupuesto,
          email_pedido: data.email_pedido,
          phone: data.phone,
          notes: data.notes,
          brands: parseBrandsString(data.brands),
          scope,
          lab_id: scope === 'lab' ? data.lab_id ?? null : null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updatedData;
    },
    onSuccess: () => {
      toast.success('Proveedor actualizado.');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error('No se pudo actualizar el proveedor.', { description: error.message });
    },
  });
};

export const useUpsertVendorLabOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      vendorId,
      labId,
      data,
    }: {
      vendorId: string;
      labId: string;
      data: VendorOverrideFormValues;
    }) => {
      const { data: row, error } = await supabase
        .from('vendor_lab_overrides')
        .upsert(
          {
            vendor_id: vendorId,
            lab_id: labId,
            email: data.email,
            email_presupuesto: data.email_presupuesto,
            email_pedido: data.email_pedido,
            contact_person: data.contact_person,
            phone: data.phone,
            notes: data.notes,
            disabled_for_lab: data.disabled_for_lab,
          },
          { onConflict: 'vendor_id,lab_id' }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row as VendorLabOverride;
    },
    onSuccess: () => {
      toast.success('Personalización del proveedor guardada para este laboratorio.');
      queryClient.invalidateQueries({ queryKey: ['vendor_lab_overrides'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'No se pudo guardar la personalización.');
    },
  });
};

export const useDeleteVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) {
        throw new Error(`No se pudo eliminar el proveedor: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success('Proveedor eliminado.');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
