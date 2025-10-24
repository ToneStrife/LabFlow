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

import {
  apiGetProfiles as supabaseGetProfiles,
  apiAddProfile as supabaseAddProfile,
  apiUpdateProfile as supabaseUpdateProfile,
  apiDeleteProfile as supabaseDeleteProfile,
  apiGetVendors as supabaseGetVendors,
  apiAddVendor as supabaseAddVendor,
  apiUpdateVendor as supabaseUpdateVendor,
  apiDeleteVendor as supabaseDeleteVendor,
  apiGetCustomerAccounts as supabaseGetCustomerAccounts,
  apiAddCustomerAccount as supabaseAddCustomerAccount,
  apiUpdateCustomerAccount as supabaseUpdateCustomerAccount,
  apiDeleteCustomerAccount as supabaseDeleteCustomerAccount,
  apiGetRequests as supabaseGetRequests,
  apiAddRequest as supabaseAddRequest,
  apiUpdateRequestStatus as supabaseUpdateRequestStatus,
  apiUpdateRequestFile as supabaseUpdateRequestFile,
  apiUpdateRequestMetadata as supabaseUpdateRequestMetadata,
  apiDeleteRequest as supabaseDeleteRequest,
  apiGetInventory as supabaseGetInventory,
  apiAddInventoryItem as supabaseAddInventoryItem,
  apiUpdateInventoryItem as supabaseUpdateInventoryItem,
  apiDeleteInventoryItem as supabaseDeleteInventoryItem,
  apiSendEmail as supabaseSendEmail,
} from "@/integrations/supabase/api";

// --- API de Perfiles ---
export const apiGetProfiles = async (): Promise<Profile[]> => {
  return supabaseGetProfiles();
};

export const apiAddProfile = async (data: Omit<Profile, "id" | "updated_at">): Promise<Profile> => {
  return supabaseAddProfile(data);
};

export const apiUpdateProfile = async (id: string, data: Partial<Profile>): Promise<void> => {
  return supabaseUpdateProfile(id, data);
};

export const apiDeleteProfile = async (id: string): Promise<void> => {
  return supabaseDeleteProfile(id);
};

// --- API de Vendedores ---
export const apiGetVendors = async (): Promise<Vendor[]> => {
  return supabaseGetVendors();
};

export const apiAddVendor = async (data: Omit<Vendor, "id" | "created_at">): Promise<Vendor> => {
  return supabaseAddVendor(data);
};

export const apiUpdateVendor = async (id: string, data: Partial<Omit<Vendor, "id" | "created_at">>): Promise<Vendor> => {
  return supabaseUpdateVendor(id, data);
};

export const apiDeleteVendor = async (id: string): Promise<void> => {
  return supabaseDeleteVendor(id);
};

// --- API de Cuentas de Clientes ---
export const apiGetCustomerAccounts = async (): Promise<CustomerAccount[]> => {
  return supabaseGetCustomerAccounts();
};

export const apiAddCustomerAccount = async (data: Omit<CustomerAccount, "id" | "created_at">): Promise<CustomerAccount> => {
  return supabaseAddCustomerAccount(data);
};

export const apiUpdateCustomerAccount = async (id: string, data: Partial<Omit<CustomerAccount, "id" | "created_at">>): Promise<CustomerAccount> => {
  return supabaseUpdateCustomerAccount(id, data);
};

export const apiDeleteCustomerAccount = async (id: string): Promise<void> => {
  return supabaseDeleteCustomerAccount(id);
};

// --- API de Solicitudes ---
export const apiGetRequests = async (): Promise<SupabaseRequest[]> => {
  return supabaseGetRequests();
};

export const apiAddRequest = async (data: Omit<SupabaseRequest, "id" | "created_at" | "status" | "items" | "po_number" | "quote_url" | "po_url" | "slip_url"> & { items: RequestItem[] }): Promise<SupabaseRequest> => {
  return supabaseAddRequest(data);
};

export const apiUpdateRequestStatus = async (
  id: string,
  status: RequestStatus,
  quoteUrl: string | null = null,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  return supabaseUpdateRequestStatus(id, status, quoteUrl, poNumber);
};

export const apiUpdateRequestMetadata = async (
  id: string,
  data: {
    accountManagerId?: string | null;
    notes?: string | null;
    projectCodes?: string[] | null;
  }
): Promise<SupabaseRequest> => {
  return supabaseUpdateRequestMetadata(id, data);
};

export const apiUpdateRequestFile = async (
  id: string,
  fileType: "quote" | "po" | "slip",
  fileUrl: string,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  return supabaseUpdateRequestFile(id, fileType, fileUrl, poNumber);
};

export const apiDeleteRequest = async (id: string): Promise<void> => {
  return supabaseDeleteRequest(id);
};

// --- API de Inventario ---
export const apiGetInventory = async (): Promise<InventoryItem[]> => {
  return supabaseGetInventory();
};

export const apiAddInventoryItem = async (data: Omit<InventoryItem, "id" | "added_at" | "last_updated">): Promise<InventoryItem> => {
  return supabaseAddInventoryItem(data);
};

export const apiUpdateInventoryItem = async (id: string, data: Partial<Omit<InventoryItem, "id" | "added_at">>): Promise<InventoryItem> => {
  return supabaseUpdateInventoryItem(id, data);
};

export const apiDeleteInventoryItem = async (id: string): Promise<void> => {
  return supabaseDeleteInventoryItem(id);
};

// --- API de Envío de Correo Electrónico ---
interface EmailData {
  to: string;
  subject: string;
  body: string;
  attachments?: { name: string; url: string }[];
}

export const apiSendEmail = async (email: EmailData): Promise<void> => {
  return supabaseSendEmail(email);
};