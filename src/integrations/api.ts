import { supabase } from "./supabase/client";
import {
  Profile,
  Vendor,
  Project,
  SupabaseRequest,
  RequestItem,
  InventoryItem,
  ProductDetails,
  EmailTemplate,
} from "@/data/types";

// --- API de Perfiles (Usuarios del sistema) ---
export const apiGetProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data;
};

export const apiGetAccountManagerProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'Account Manager');
  if (error) throw error;
  return data;
};

export const apiUpdateProfile = async (id: string, data: Partial<Profile>): Promise<void> => {
  const { error } = await supabase.from('profiles').update(data).eq('id', id);
  if (error) throw error;
};

export const apiDeleteProfile = async (id: string): Promise<void> => {
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !session) {
    throw new Error("Failed to refresh session. Please log in again.");
  }
  const { data: edgeFunctionData, error } = await supabase.functions.invoke('delete-user', {
    body: JSON.stringify({ userIdToDelete: id }),
    method: 'POST',
  });
  if (error) {
    let errorMessage = (edgeFunctionData as any)?.error || error.message || 'Failed to delete user.';
    throw new Error(errorMessage);
  }
  return edgeFunctionData;
};

interface InviteUserData {
  email: string;
  first_name?: string;
  last_name?: string;
  role?: Profile['role'];
}

export const apiInviteUser = async (data: InviteUserData): Promise<any> => {
  const { email, first_name, last_name, role } = data;
  const { data: edgeFunctionData, error } = await supabase.functions.invoke('invite-user', {
    body: JSON.stringify({ email, first_name, last_name, role }),
    method: 'POST',
  });
  if (error) {
    let errorMessage = (edgeFunctionData as any)?.error || error.message || 'Failed to invite user.';
    throw new Error(errorMessage);
  }
  return edgeFunctionData;
};

// --- API de Vendedores ---
export const apiGetVendors = async (): Promise<Vendor[]> => {
  const { data, error } = await supabase.from('vendors').select('*');
  if (error) throw error;
  return data;
};

export const apiAddVendor = async (data: Omit<Vendor, "id" | "created_at">): Promise<Vendor> => {
  const { data: newVendor, error } = await supabase.from('vendors').insert(data).select().single();
  if (error) throw error;
  return newVendor;
};

export const apiUpdateVendor = async (id: string, data: Partial<Omit<Vendor, "id" | "created_at">>): Promise<Vendor> => {
  const { data: updatedVendor, error } = await supabase.from('vendors').update(data).eq('id', id).select().single();
  if (error) throw error;
  return updatedVendor;
};

export const apiDeleteVendor = async (id: string): Promise<void> => {
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) throw error;
};

// --- API de Proyectos ---
export const apiGetProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase.from('projects').select('*');
  if (error) throw error;
  return data;
};

export const apiAddProject = async (data: Omit<Project, "id" | "created_at">): Promise<Project> => {
  const { data: newProject, error } = await supabase.from('projects').insert(data).select().single();
  if (error) throw error;
  return newProject;
};

export const apiUpdateProject = async (id: string, data: Partial<Omit<Project, "id" | "created_at">>): Promise<Project> => {
  const { data: updatedProject, error } = await supabase.from('projects').update(data).eq('id', id).select().single();
  if (error) throw error;
  return updatedProject;
};

export const apiDeleteProject = async (id: string): Promise<void> => {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
};

// --- API de Búsqueda Externa de Productos ---
export const apiSearchExternalProduct = async (catalogNumber: string, brand?: string): Promise<ProductDetails> => {
  const { data, error } = await supabase.functions.invoke('search-product', {
    body: JSON.stringify({ catalogNumber, brand }),
    method: 'POST',
  });
  if (error) {
    let errorMessage = (data as any)?.error || error.message || 'Failed to search external product.';
    throw new Error(errorMessage);
  }
  if (!data || !data.products) {
    throw new Error("AI did not return valid product details.");
  }
  return data.products as ProductDetails;
};

// --- API de Solicitudes ---
export const apiGetRequests = async (): Promise<SupabaseRequest[]> => {
  const { data, error } = await supabase.from('requests').select('*, request_items(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(r => ({ ...r, items: r.request_items }));
};

export const apiAddRequest = async (data: {
  vendorId: string;
  accountManagerId: string | null;
  notes?: string | null;
  projectCodes?: string[] | null;
  items: RequestItem[];
}): Promise<SupabaseRequest> => {
  const { data: newRequest, error } = await supabase.rpc('create_request_with_items', {
    vendor_id_in: data.vendorId,
    account_manager_id_in: data.accountManagerId,
    notes_in: data.notes,
    project_codes_in: data.projectCodes,
    items_in: data.items,
  });
  if (error) throw error;
  return newRequest as SupabaseRequest;
};

export const apiUpdateRequest = async (id: string, data: Partial<SupabaseRequest>): Promise<SupabaseRequest> => {
  const { data: updatedRequest, error } = await supabase
    .from('requests')
    .update(data)
    .eq('id', id)
    .select('*, request_items(*)')
    .single();
  if (error) throw error;
  return { ...updatedRequest, items: updatedRequest.request_items };
};

export const apiDeleteRequest = async (id: string): Promise<void> => {
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) throw error;
};

// --- API de Subida de Archivos ---
export const apiUpdateRequestFile = async (
  id: string,
  fileType: "quote" | "po" | "slip",
  file: File,
  poNumber: string | null = null
): Promise<{ fileUrl: string; poNumber: string | null }> => {
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !session) {
    throw new Error("Failed to refresh session. Please log in again.");
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);
  formData.append('requestId', id);
  if (poNumber) {
    formData.append('poNumber', poNumber);
  }
  const { data: edgeFunctionData, error } = await supabase.functions.invoke('upload-file', {
    body: formData,
  });
  if (error) {
    let errorMessage = (edgeFunctionData as any)?.error || error.message || 'Failed to upload file.';
    throw new Error(errorMessage);
  }
  return edgeFunctionData as { fileUrl: string; poNumber: string | null };
};

// --- API de Inventario ---
export const apiGetInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase.from('inventory').select('*').order('last_updated', { ascending: false });
  if (error) throw error;
  return data;
};

export const apiAddInventoryItem = async (data: Omit<InventoryItem, "id" | "added_at" | "last_updated">): Promise<InventoryItem> => {
  const { data: newItem, error } = await supabase.rpc('add_or_update_inventory_item', {
    product_name_in: data.product_name,
    catalog_number_in: data.catalog_number,
    brand_in: data.brand,
    quantity_in: data.quantity,
    unit_price_in: data.unit_price,
    format_in: data.format,
  }).single();
  if (error) throw error;
  return newItem;
};

export const apiUpdateInventoryItem = async (id: string, data: Partial<Omit<InventoryItem, "id" | "added_at">>): Promise<InventoryItem> => {
  const { data: updatedItem, error } = await supabase.from('inventory').update({ ...data, last_updated: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return updatedItem;
};

export const apiDeleteInventoryItem = async (id: string): Promise<void> => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw error;
};

// --- API de Envío de Correo Electrónico ---
interface EmailData {
  to: string;
  subject: string;
  body: string;
  attachments?: { name: string; url: string }[];
}

export const apiSendEmail = async (email: EmailData): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: JSON.stringify(email),
  });
  if (error) {
    let errorMessage = (data as any)?.error || error.message || 'Failed to send email.';
    throw new Error(errorMessage);
  }
  return data;
};

// --- API de Plantillas de Correo Electrónico ---
export const apiGetEmailTemplates = async (): Promise<EmailTemplate[]> => {
  const { data, error } = await supabase.from('email_templates').select('*');
  if (error) throw error;
  return data;
};

export const apiAddEmailTemplate = async (data: Omit<EmailTemplate, "id" | "created_at">): Promise<EmailTemplate> => {
  const { data: newTemplate, error } = await supabase.from('email_templates').insert(data).select().single();
  if (error) throw error;
  return newTemplate;
};

export const apiUpdateEmailTemplate = async (id: string, data: Partial<Omit<EmailTemplate, "id" | "created_at">>): Promise<EmailTemplate> => {
  const { data: updatedTemplate, error } = await supabase.from('email_templates').update(data).eq('id', id).select().single();
  if (error) throw error;
  return updatedTemplate;
};

export const apiDeleteEmailTemplate = async (id: string): Promise<void> => {
  const { error } = await supabase.from('email_templates').delete().eq('id', id);
  if (error) throw error;
};