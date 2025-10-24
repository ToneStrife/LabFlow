import { supabase } from "./supabase/client"; // Importar cliente de Supabase
import {
  Profile,
  Vendor,
  CustomerAccount,
  SupabaseRequest,
  RequestItem,
  RequestStatus,
  InventoryItem,
  MockEmail,
} from "@/data/types";

// Mantener las importaciones de mock data para otras tablas hasta que se conviertan
import {
  getMockVendors,
  addMockVendor,
  updateMockVendor,
  deleteMockVendor,
  getMockCustomerAccounts,
  addMockCustomerAccount,
  updateMockCustomerAccount,
  deleteMockCustomerAccount,
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
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
};

// --- API de Vendedores ---
export const apiGetVendors = async (): Promise<Vendor[]> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return getMockVendors();
};

export const apiAddVendor = async (data: Omit<Vendor, "id" | "created_at">): Promise<Vendor> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return addMockVendor(data);
};

export const apiUpdateVendor = async (id: string, data: Partial<Omit<Vendor, "id" | "created_at">>): Promise<Vendor> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return updateMockVendor(id, data);
};

export const apiDeleteVendor = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return deleteMockVendor(id);
};

// --- API de Cuentas de Clientes ---
export const apiGetCustomerAccounts = async (): Promise<CustomerAccount[]> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return getMockCustomerAccounts();
};

export const apiAddCustomerAccount = async (data: Omit<CustomerAccount, "id" | "created_at">): Promise<CustomerAccount> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return addMockCustomerAccount(data);
};

export const apiUpdateCustomerAccount = async (id: string, data: Partial<Omit<CustomerAccount, "id" | "created_at">>): Promise<CustomerAccount> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return updateMockCustomerAccount(id, data);
};

export const apiDeleteCustomerAccount = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular retraso
  return deleteMockCustomerAccount(id);
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