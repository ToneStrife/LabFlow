import { supabase } from "./supabase/client"; // Importar cliente de Supabase
import {
  Profile,
  Vendor,
  AccountManager, // Importar el nuevo tipo AccountManager
  Project, // Importar el nuevo tipo Project
  SupabaseRequest,
  RequestItem,
  RequestStatus,
  InventoryItem,
  MockEmail,
  ProductDetails, // Importar ProductDetails para la búsqueda externa
  EmailTemplate, // Importar el nuevo tipo EmailTemplate
} from "@/data/types";

// Mantener las importaciones de mock data para otras tablas hasta que se conviertan
import {
  getMockRequests,
  addMockRequest,
  updateMockRequestStatus,
  updateMockRequestFile,
  updateMockRequestMetadata,
  deleteMockRequest,
  getMockInventory,
  addMockInventoryItem,
  updateMockInventoryItem,
  deleteMockInventoryItem,
  sendMockEmail,
} from "@/data/crud";


// --- API de Perfiles (Usuarios del sistema) ---
export const apiGetProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data;
};

export const apiUpdateProfile = async (id: string, data: Partial<Profile>): Promise<void> => {
  const { error } = await supabase.from('profiles').update(data).eq('id', id);
  if (error) throw error;
};

export const apiDeleteProfile = async (id: string): Promise<void> => {
  // Asegurarse de que la sesión esté fresca antes de invocar la función Edge
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !session) {
    console.error("Error refreshing session before deleting user:", refreshError);
    throw new Error("Failed to refresh session. Please log in again.");
  }

  const { data: edgeFunctionData, error } = await supabase.functions.invoke('delete-user', {
    body: JSON.stringify({ userIdToDelete: id }),
    method: 'POST',
  });

  if (error) {
    console.error("Error invoking delete-user edge function:", error);
    let errorMessage = 'Failed to delete user via Edge Function.';
    if (edgeFunctionData && typeof edgeFunctionData === 'object' && 'error' in edgeFunctionData) {
        errorMessage = (edgeFunctionData as any).error;
    } else if (error.message) {
        errorMessage = error.message;
    } else if (typeof edgeFunctionData === 'string') {
        errorMessage = edgeFunctionData;
    }
    if ((error as any).status) {
        errorMessage = `(Status: ${(error as any).status}) ${errorMessage}`;
    }
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
    console.error("Error invoking invite-user edge function:", error);
    console.error("Edge function raw response data (on error):", edgeFunctionData); // Log raw data

    let errorMessage = 'Failed to invite user via Edge Function.';
    
    // Try to get a more specific error message from the edge function's response body
    if (edgeFunctionData && typeof edgeFunctionData === 'object' && 'error' in edgeFunctionData) {
        errorMessage = (edgeFunctionData as any).error;
    } else if (typeof edgeFunctionData === 'string') {
        // If the edge function returned a plain string error message
        errorMessage = edgeFunctionData;
    } else if (error.message) {
        // Fallback to the generic error message from supabase.functions.invoke
        errorMessage = error.message;
    }

    // Add status code if available from the invoke error object
    if ((error as any).status) {
        errorMessage = `(Status: ${(error as any).status}) ${errorMessage}`;
    }
    
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

// --- API de Account Managers (Contactos, no usuarios del sistema) ---
export const apiGetAccountManagers = async (): Promise<AccountManager[]> => {
  const { data, error } = await supabase.from('account_managers').select('*');
  if (error) throw error;
  return data;
};

export const apiAddAccountManager = async (data: Omit<AccountManager, "id" | "created_at">): Promise<AccountManager> => {
  const { data: newManager, error } = await supabase.from('account_managers').insert(data).select().single();
  if (error) throw error;
  return newManager;
};

export const apiUpdateAccountManager = async (id: string, data: Partial<Omit<AccountManager, "id" | "created_at">>): Promise<AccountManager> => {
  const { data: updatedManager, error } = await supabase.from('account_managers').update(data).eq('id', id).select().single();
  if (error) throw error;
  return updatedManager;
};

export const apiDeleteAccountManager = async (id: string): Promise<void> => {
  const { error } = await supabase.from('account_managers').delete().eq('id', id);
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

// --- API de Búsqueda Externa de Productos (Ahora invoca la Edge Function) ---
export const apiSearchExternalProduct = async (catalogNumber: string, brand?: string): Promise<ProductDetails> => {
  const { data, error } = await supabase.functions.invoke('search-product', {
    body: JSON.stringify({ catalogNumber, brand }),
    method: 'POST',
  });

  if (error) {
    console.error("Error invoking search-product edge function:", error);
    let errorMessage = 'Failed to search external product via Edge Function.';
    if (data && typeof data === 'object' && 'error' in data) {
        errorMessage = (data as any).error;
    } else if (error.message) {
        errorMessage = error.message;
    } else if (typeof data === 'string') {
        errorMessage = data;
    }
    throw new Error(errorMessage);
  }

  // La Edge Function devuelve un objeto con una propiedad 'products'
  if (!data || !data.products) {
    throw new Error("AI did not return valid product details.");
  }
  
  return data.products as ProductDetails;
};


// --- API de Solicitudes (usando mock data por ahora) ---
export const apiGetRequests = async (): Promise<SupabaseRequest[]> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return getMockRequests();
};

export const apiAddRequest = async (data: Omit<SupabaseRequest, "id" | "created_at" | "status" | "items" | "po_number" | "quote_url" | "po_url" | "slip_url"> & { items: RequestItem[] }): Promise<SupabaseRequest> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return addMockRequest(data);
};

export const apiUpdateRequestStatus = async (
  id: string,
  status: RequestStatus,
  quoteUrl: string | null = null,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return updateMockRequestStatus(id, status, quoteUrl, poNumber);
};

export const apiUpdateRequestMetadata = async (
  id: string,
  data: {
    accountManagerId?: string | null;
    notes?: string | null;
    projectCodes?: string[] | null;
  }
): Promise<SupabaseRequest> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return updateMockRequestMetadata(id, data);
};

export const apiUpdateRequestFile = async (
  id: string,
  fileType: "quote" | "po" | "slip",
  fileUrl: string,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return updateMockRequestFile(id, fileType, fileUrl, poNumber);
};

export const apiDeleteRequest = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return deleteMockRequest(id);
};

// --- API de Inventario (usando mock data por ahora) ---
export const apiGetInventory = async (): Promise<InventoryItem[]> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return getMockInventory();
};

export const apiAddInventoryItem = async (data: Omit<InventoryItem, "id" | "added_at" | "last_updated">): Promise<InventoryItem> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return addMockInventoryItem(data);
};

export const apiUpdateInventoryItem = async (id: string, data: Partial<Omit<InventoryItem, "id" | "added_at">>): Promise<InventoryItem> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return updateMockInventoryItem(id, data);
};

export const apiDeleteInventoryItem = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return deleteMockInventoryItem(id);
};

// --- API de Envío de Correo Electrónico (simulado) ---
interface EmailData {
  to: string;
  subject: string;
  body: string;
  attachments?: { name: string; url: string }[];
}

export const apiSendEmail = async (email: EmailData): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return sendMockEmail(email);
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