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
  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError) {
    console.error("Error deleting user from auth.users:", authError);
    throw authError;
  }
  const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
  if (profileError) {
    console.error("Error deleting profile from public.profiles:", profileError);
    throw profileError;
  }
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
    
    let errorMessage = 'Failed to invite user via Edge Function.';
    
    if (edgeFunctionData && typeof edgeFunctionData === 'object' && 'error' in edgeFunctionData) {
        errorMessage = (edgeFunctionData as any).error;
    } else if (error.message) {
        errorMessage = error.message;
    } else if (typeof edgeFunctionData === 'string') {
        errorMessage = edgeFunctionData;
    }
    
    console.error("Edge function response data (on error):", edgeFunctionData);
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

// --- API de Búsqueda Externa de Productos (Simulando LLM con acceso a internet) ---
// Esta función ahora simula la llamada a base44.integrations.Core.InvokeLLM
export const apiSearchExternalProduct = async (catalogNumber: string, brand?: string): Promise<ProductDetails> => {
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simular el tiempo de respuesta de la IA

  // Aquí se simularía la lógica del LLM con acceso a internet
  // El "prompt" a la IA sería algo como:
  // "Busca en internet un producto de laboratorio/científico con Marca: '${brand}' y Número de Catálogo: '${catalogNumber}'.
  // Extrae el nombre completo del producto, tamaño del paquete/formato, precio estimado en EUROS, URL de un producto fiable y notas técnicas breves.
  // Devuelve la información en el siguiente formato JSON:
  // { "product_name": "string", "pack_size": "string", "estimated_price": "number", "product_url": "string", "technical_notes": "string" }"

  // Simulación de la respuesta del LLM
  if (catalogNumber.toLowerCase().includes("18265017") && brand?.toLowerCase().includes("invitrogen")) {
    return {
      id: "ai-pdt-18265017",
      productName: "E. coli DH5a Competent Cells",
      catalogNumber: "18265017",
      unitPrice: 155.75, // Precio estimado
      format: "10x 50µl (500µl total)", // Tamaño del paquete
      link: "https://www.thermofisher.com/order/catalog/product/18265017",
      brand: "Invitrogen",
      source: "AI Search",
      notes: "High efficiency transformation, suitable for general cloning applications. Store at -80°C."
    };
  } else if (catalogNumber.toLowerCase().includes("ab12345") && brand?.toLowerCase().includes("abcam")) {
    return {
      id: "ai-pdt-ab12345",
      productName: "Anti-GFP Antibody (Rabbit Polyclonal)",
      catalogNumber: "ab12345",
      unitPrice: 125.00,
      format: "100 µg (200 µl at 0.5 mg/ml)",
      link: "https://www.abcam.com/anti-gfp-antibody-ab12345.html",
      brand: "Abcam",
      source: "AI Search",
      notes: "Reacts with Aequorea victoria GFP. Suitable for Western Blot, Immunofluorescence, ELISA. Store at -20°C."
    };
  } else if (catalogNumber.toLowerCase().includes("p2000") && brand?.toLowerCase().includes("sigma-aldrich")) {
    return {
      id: "ai-pdt-p2000",
      productName: "Taq DNA Polymerase",
      catalogNumber: "P2000",
      unitPrice: 52.50,
      format: "500 units (5 units/µl)",
      link: "https://www.sigmaaldrich.com/P2000",
      brand: "Sigma-Aldrich",
      source: "AI Search",
      notes: "Thermostable DNA polymerase for PCR. Optimal activity at 72°C. Includes 10x reaction buffer."
    };
  }
  
  // Si no se encuentra, simular que la IA no encontró nada
  throw new Error(`AI could not find detailed information for product with Catalog Number: '${catalogNumber}' and Brand: '${brand || "N/A"}'.`);
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