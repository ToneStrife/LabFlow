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

// --- API de Búsqueda Externa de Productos (Ahora usa la función RPC de búsqueda interna) ---
export const apiSearchExternalProduct = async (catalogNumber: string, brand?: string): Promise<ProductDetails> => {
  console.log(`API: Invoking smart_lookup_mock for catalog: ${catalogNumber}, brand: ${brand}`);
  
  // Llama a la función RPC que busca en datos internos (request_items y items_master)
  const { data, error } = await supabase.rpc("smart_lookup_mock", { 
    brand_q: brand || '', 
    catalog_q: catalogNumber 
  });

  if (error) {
    console.error("API: Error invoking smart_lookup_mock RPC:", error);
    throw new Error(`Failed to search internal product history: ${error.message}`);
  }

  console.log("API: Raw data received from smart_lookup_mock:", data);

  if (!data || !data.record || data.match.score < 0.5) {
    throw new Error("No se encontró información fiable en el historial de pedidos (Confianza baja).");
  }

  const record = data.record;
  
  const productDetails: ProductDetails = {
    id: record.catalog_number || 'unknown',
    productName: record.product_name,
    catalogNumber: record.catalog_number || catalogNumber,
    unitPrice: record.unit_price || undefined,
    format: record.format || undefined,
    link: record.link || undefined,
    brand: record.brand || brand || 'N/A',
    notes: record.notes || undefined,
    source: data.source || 'internal_history',
  };
  
  console.log("API: Mapped ProductDetails from internal history:", productDetails);
  return productDetails;
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

// ACTUALIZADO: apiUpdateRequestFile para usar la función Edge
export const apiUpdateRequestFile = async (
  id: string,
  fileType: "quote" | "po" | "slip",
  file: File, // Ahora acepta un objeto File real
  poNumber: string | null = null
): Promise<{ fileUrl: string; poNumber: string | null }> => {
  // Asegurarse de que la sesión esté fresca antes de invocar la función Edge
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !session) {
    console.error("Error refreshing session before uploading file:", refreshError);
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
    method: 'POST',
    headers: {
      // No Content-Type header needed for FormData, browser sets it automatically
    },
  });

  if (error) {
    console.error("Error invoking upload-file edge function:", error);
    let errorMessage = 'Failed to upload file via Edge Function.';
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
  
  // La función Edge devuelve { fileUrl: string, poNumber: string | null }
  return edgeFunctionData as { fileUrl: string; poNumber: string | null };
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

// --- API de Envío de Correo Electrónico (REAL) ---
interface EmailData {
  to: string;
  subject: string;
  body: string;
  attachments?: { name: string; url: string }[];
}

export const apiSendEmail = async (email: EmailData): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: JSON.stringify(email),
    method: 'POST',
  });

  if (error) {
    console.error("Error invoking send-email edge function:", error);
    let errorMessage = 'Failed to send email via Edge Function.';
    if (data && typeof data === 'object' && 'error' in data) {
        errorMessage = (data as any).error;
    } else if (error.message) {
        errorMessage = error.message;
    }
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