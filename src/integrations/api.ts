import {
  Profile,
  Vendor,
  CustomerAccount,
  SupabaseRequest,
  RequestItem,
  RequestStatus,
  InventoryItem, // Importar la nueva interfaz
  // Importar las funciones CRUD de mockData
  getMockProfiles,
  addMockProfile,
  updateMockProfile as updateMockProfileData,
  deleteMockProfile,
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
  deleteMockRequest,
  getMockInventory, // Importar las nuevas funciones
  addMockInventoryItem,
  updateMockInventoryItem,
  deleteMockInventoryItem,
} from "@/data/mockData";

// Función para simular un retraso de red
const simulateNetworkDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// --- API de Perfiles ---
export const apiGetProfiles = async (): Promise<Profile[]> => {
  await simulateNetworkDelay();
  return getMockProfiles();
};

export const apiAddProfile = async (data: Omit<Profile, "id" | "updated_at">): Promise<Profile> => {
  await simulateNetworkDelay();
  return addMockProfile(data);
};

export const apiUpdateProfile = async (id: string, data: Partial<Profile>): Promise<void> => {
  await simulateNetworkDelay();
  updateMockProfileData(id, data);
};

export const apiDeleteProfile = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  return deleteMockProfile(id);
};

// --- API de Vendedores ---
export const apiGetVendors = async (): Promise<Vendor[]> => {
  await simulateNetworkDelay();
  return getMockVendors();
};

export const apiAddVendor = async (data: Omit<Vendor, "id" | "created_at">): Promise<Vendor> => {
  await simulateNetworkDelay();
  return addMockVendor(data);
};

export const apiUpdateVendor = async (id: string, data: Partial<Omit<Vendor, "id" | "created_at">>): Promise<Vendor> => {
  await simulateNetworkDelay();
  return updateMockVendor(id, data);
};

export const apiDeleteVendor = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  return deleteMockVendor(id);
};

// --- API de Cuentas de Clientes ---
export const apiGetCustomerAccounts = async (): Promise<CustomerAccount[]> => {
  await simulateNetworkDelay();
  return getMockCustomerAccounts();
};

export const apiAddCustomerAccount = async (data: Omit<CustomerAccount, "id" | "created_at">): Promise<CustomerAccount> => {
  await simulateNetworkDelay();
  return addMockCustomerAccount(data);
};

export const apiUpdateCustomerAccount = async (id: string, data: Partial<Omit<CustomerAccount, "id" | "created_at">>): Promise<CustomerAccount> => {
  await simulateNetworkDelay();
  return updateMockCustomerAccount(id, data);
};

export const apiDeleteCustomerAccount = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  return deleteMockCustomerAccount(id);
};

// --- API de Solicitudes ---
export const apiGetRequests = async (): Promise<SupabaseRequest[]> => {
  await simulateNetworkDelay();
  return getMockRequests();
};

export const apiAddRequest = async (data: Omit<SupabaseRequest, "id" | "created_at" | "status" | "items"> & { items: RequestItem[] }): Promise<SupabaseRequest> => {
  await simulateNetworkDelay();
  return addMockRequest(data);
};

export const apiUpdateRequestStatus = async (id: string, status: RequestStatus): Promise<SupabaseRequest> => {
  await simulateNetworkDelay();
  return updateMockRequestStatus(id, status);
};

export const apiDeleteRequest = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  return deleteMockRequest(id);
};

// --- API de Inventario ---
export const apiGetInventory = async (): Promise<InventoryItem[]> => {
  await simulateNetworkDelay();
  return getMockInventory();
};

export const apiAddInventoryItem = async (data: Omit<InventoryItem, "id" | "added_at" | "last_updated">): Promise<InventoryItem> => {
  await simulateNetworkDelay();
  return addMockInventoryItem(data);
};

export const apiUpdateInventoryItem = async (id: string, data: Partial<Omit<InventoryItem, "id" | "added_at">>): Promise<InventoryItem> => {
  await simulateNetworkDelay();
  return updateMockInventoryItem(id, data);
};

export const apiDeleteInventoryItem = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  return deleteMockInventoryItem(id);
};