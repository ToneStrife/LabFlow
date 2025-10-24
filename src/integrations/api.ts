import { supabase } from "./supabase/client"; // Importar cliente de Supabase
import {
  Profile,
  Vendor,
  SupabaseRequest,
  RequestItem,
  RequestStatus,
  InventoryItem,
  MockEmail,
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


// --- API de Perfiles ---
export const apiGetProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data;
};

// La función apiAddProfile se elimina temporalmente.
// Los nuevos perfiles deben crearse a través del trigger de registro de auth.users.

export const apiUpdateProfile = async (id: string, data: Partial<Profile>): Promise<void> => {
  const { error } = await supabase.from('profiles').update(data).eq('id', id);
  if (error) throw error;
};

export const apiDeleteProfile = async (id: string): Promise<void> => {
  // Para eliminar un perfil, primero debemos eliminar el usuario de auth.users
  // Esto activará la eliminación en cascada en la tabla de perfiles si está configurada correctamente.
  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError) {
    console.error("Error deleting user from auth.users:", authError);
    throw authError;
  }
  // Si la eliminación en cascada no está configurada o falla, también podemos intentar eliminar el perfil directamente.
  const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
  if (profileError) {
    console.error("Error deleting profile from public.profiles:", profileError);
    throw profileError;
  }
};

// Nueva función para añadir un gestor de cuentas a través de la función Edge
interface CreateAccountManagerData {
  email: string;
  password?: string; // La contraseña es opcional si la función Edge la genera o usa un valor por defecto
  first_name: string;
  last_name: string;
}

export const apiCreateAccountManager = async (data: CreateAccountManagerData): Promise<Profile> => {
  const { data: edgeFunctionData, error } = await supabase.functions.invoke('create-account-manager', {
    body: JSON.stringify(data),
    method: 'POST',
  });

  if (error) {
    console.error("Error invoking create-account-manager edge function:", error);
    console.error("Edge function response data (on error):", edgeFunctionData);
    const errorMessage = error.message || 
                         (edgeFunctionData && typeof edgeFunctionData === 'object' && 'error' in edgeFunctionData ? (edgeFunctionData as any).error : null) || 
                         'Failed to create account manager via Edge Function.';
    throw new Error(errorMessage);
  }
  return edgeFunctionData as Profile;
};

// Nueva función para invitar a un usuario a través de la función Edge
interface InviteUserData {
  email: string;
  first_name?: string;
  last_name?: string;
}

export const apiInviteUser = async (data: InviteUserData): Promise<any> => {
  const { email, first_name, last_name } = data;
  // Usar window.location.origin para obtener la URL base de la aplicación cliente
  // y redirigir al dashboard después de la confirmación del email.
  const clientRedirectTo = window.location.origin + '/dashboard'; 

  const { data: edgeFunctionData, error } = await supabase.functions.invoke('invite-user', {
    body: JSON.stringify({ email, first_name, last_name, clientRedirectTo }), // Pasar clientRedirectTo
    method: 'POST',
  });

  if (error) {
    console.error("Error invoking invite-user edge function:", error);
    console.error("Edge function response data (on error):", edgeFunctionData);
    let errorMessage = 'Failed to invite user via Edge Function.';
    if (error.message) {
        errorMessage = error.message;
    } else if (edgeFunctionData && typeof edgeFunctionData === 'object' && 'error' in edgeFunctionData) {
        errorMessage = (edgeFunctionData as any).error;
    } else if (typeof edgeFunctionData === 'string') {
        errorMessage = edgeFunctionData;
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

// --- API de Solicitudes ---
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

// --- API de Inventario ---
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

// --- API de Envío de Correo Electrónico ---
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