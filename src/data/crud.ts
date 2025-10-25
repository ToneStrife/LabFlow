// src/data/crud.ts

import {
  Profile,
  Vendor,
  CustomerAccount,
  SupabaseRequest,
  RequestItem,
  RequestStatus,
  InventoryItem,
  MockEmail,
  SupabaseRequestItem,
} from "./types";
import {
  generateId,
  mockProfiles,
  mockVendors,
  mockCustomerAccounts,
  mockRequestItems,
  mockRequests,
  mockInventory,
} from "./storage";

// Función para simular un retraso de red
const simulateNetworkDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// --- CRUD Functions for Profiles ---
export const getMockProfiles = async (): Promise<Profile[]> => {
  await simulateNetworkDelay();
  return mockProfiles;
};

export const addMockProfile = async (data: Omit<Profile, "id" | "updated_at">): Promise<Profile> => {
  await simulateNetworkDelay();
  const newProfile: Profile = {
    id: generateId(),
    updated_at: new Date().toISOString(),
    avatar_url: null, // Default to null
    ...data,
  };
  mockProfiles.push(newProfile);
  return newProfile;
};

export const updateMockProfile = (id: string, data: Partial<Profile>): void => {
  const index = mockProfiles.findIndex(p => p.id === id);
  if (index !== -1) {
    mockProfiles[index] = { ...mockProfiles[index], ...data, updated_at: new Date().toISOString() };
  }
};

export const deleteMockProfile = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  mockProfiles = mockProfiles.filter(p => p.id !== id);
};

/*
// --- CRUD Functions for Vendors ---
// Estas funciones han sido migradas a src/integrations/api.ts para usar Supabase directamente.
// Se mantienen aquí como referencia si se necesitaran datos simulados para otras partes.
export const getMockVendors = async (): Promise<Vendor[]> => {
  await simulateNetworkDelay();
  return mockVendors;
};

export const addMockVendor = async (data: Omit<Vendor, "id" | "created_at">): Promise<Vendor> => {
  await simulateNetworkDelay();
  const newVendor: Vendor = {
    id: generateId(),
    created_at: new Date().toISOString(),
    ...data,
  };
  mockVendors.push(newVendor);
  return newVendor;
};

export const updateMockVendor = async (id: string, data: Partial<Omit<Vendor, "id" | "created_at">>): Promise<Vendor> => {
  await simulateNetworkDelay();
  const index = mockVendors.findIndex(v => v.id === id);
  if (index === -1) throw new Error("Vendor not found");
  mockVendors[index] = { ...mockVendors[index], ...data };
  return mockVendors[index];
};

export const deleteMockVendor = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  mockVendors = mockVendors.filter(v => v.id !== id);
};
*/

/*
// --- CRUD Functions for Customer Accounts ---
// Estas funciones han sido migradas a src/integrations/api.ts para usar Supabase directamente.
// Se mantienen aquí como referencia si se necesitaran datos simulados para otras partes.
export const getMockCustomerAccounts = async (): Promise<CustomerAccount[]> => {
  await simulateNetworkDelay();
  return mockCustomerAccounts;
};

export const addMockCustomerAccount = async (data: Omit<CustomerAccount, "id" | "created_at">): Promise<CustomerAccount> => {
  await simulateNetworkDelay();
  const newAccount: CustomerAccount = {
    id: generateId(),
    created_at: new Date().toISOString(),
    ...data,
  };
  mockCustomerAccounts.push(newAccount);
  return newAccount;
};

export const updateMockCustomerAccount = async (id: string, data: Partial<Omit<CustomerAccount, "id" | "created_at">>): Promise<CustomerAccount> => {
  await simulateNetworkDelay();
  const index = mockCustomerAccounts.findIndex(a => a.id === id);
  if (index === -1) throw new Error("Customer account not found");
  mockCustomerAccounts[index] = { ...mockCustomerAccounts[index], ...data };
  return mockCustomerAccounts[index];
};

export const deleteMockCustomerAccount = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  mockCustomerAccounts = mockCustomerAccounts.filter(a => a.id !== id);
};
*/

// --- CRUD Functions for Requests ---
export const getMockRequests = async (): Promise<SupabaseRequest[]> => {
  await simulateNetworkDelay();
  // Join requests with their items
  return mockRequests.map(req => ({
    ...req,
    items: mockRequestItems.filter(item => item.request_id === req.id),
  }));
};

export const addMockRequest = async (data: Omit<SupabaseRequest, "id" | "created_at" | "status" | "items" | "po_number" | "quote_url" | "po_url" | "slip_url"> & { items: RequestItem[] }): Promise<SupabaseRequest> => {
  await simulateNetworkDelay();
  const newRequestId = generateId();
  const newRequest: SupabaseRequest = {
    id: newRequestId,
    created_at: new Date().toISOString(),
    status: "Pending",
    quote_url: null,
    po_number: null,
    po_url: null,
    slip_url: null,
    ...data,
    items: [], // Will be populated after item insertion
  };
  mockRequests.push(newRequest);

  const newItems: SupabaseRequestItem[] = data.items.map(item => ({
    id: generateId(),
    request_id: newRequestId,
    product_name: item.productName,
    catalog_number: item.catalogNumber,
    quantity: item.quantity,
    unit_price: item.unitPrice || null,
    format: item.format || null,
    link: item.link || null,
    notes: item.notes || null,
    brand: item.brand || null,
  }));
  mockRequestItems.push(...newItems);

  return { ...newRequest, items: newItems };
};

export const updateMockRequestStatus = async (
  id: string, 
  status: RequestStatus,
  quoteUrl: string | null = null,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  await simulateNetworkDelay();
  const index = mockRequests.findIndex(req => req.id === id);
  if (index === -1) throw new Error("Request not found");
  
  mockRequests[index].status = status;
  if (quoteUrl !== undefined) {
    mockRequests[index].quote_url = quoteUrl;
  }
  if (poNumber !== undefined) {
    mockRequests[index].po_number = poNumber;
  }

  return {
    ...mockRequests[index],
    items: mockRequestItems.filter(item => item.request_id === id),
  };
};

export const updateMockRequestMetadata = async (
  id: string,
  data: {
    accountManagerId?: string | null;
    notes?: string | null;
    projectCodes?: string[] | null;
  }
): Promise<SupabaseRequest> => {
  await simulateNetworkDelay();
  const index = mockRequests.findIndex(req => req.id === id);
  if (index === -1) throw new Error("Request not found");

  if (data.accountManagerId !== undefined) {
    mockRequests[index].account_manager_id = data.accountManagerId === 'unassigned' ? null : data.accountManagerId;
  }
  if (data.notes !== undefined) {
    mockRequests[index].notes = data.notes || null;
  }
  if (data.projectCodes !== undefined) {
    mockRequests[index].project_codes = data.projectCodes || null;
  }

  return {
    ...mockRequests[index],
    items: mockRequestItems.filter(item => item.request_id === id),
  };
};


export const updateMockRequestFile = async (
  id: string,
  fileType: "quote" | "po" | "slip",
  fileUrl: string,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  await simulateNetworkDelay();
  const index = mockRequests.findIndex(req => req.id === id);
  if (index === -1) throw new Error("Request not found");

  switch (fileType) {
    case "quote":
      mockRequests[index].quote_url = fileUrl;
      if (mockRequests[index].status === "Quote Requested") {
        // If quote is uploaded, move to PO Requested state
        mockRequests[index].status = "PO Requested";
      }
      break;
    case "po":
      mockRequests[index].po_url = fileUrl;
      if (poNumber) {
        mockRequests[index].po_number = poNumber;
      }
      break;
    case "slip":
      mockRequests[index].slip_url = fileUrl;
      break;
  }

  return {
    ...mockRequests[index],
    items: mockRequestItems.filter(item => item.request_id === id),
  };
};

export const deleteMockRequest = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  mockRequests = mockRequests.filter(req => req.id !== id);
  mockRequestItems = mockRequestItems.filter(item => item.request_id !== id);
};

// --- CRUD Functions for Inventory ---
export const getMockInventory = async (): Promise<InventoryItem[]> => {
  await simulateNetworkDelay();
  return mockInventory;
};

export const addMockInventoryItem = async (data: Omit<InventoryItem, "id" | "added_at" | "last_updated">): Promise<InventoryItem> => {
  await simulateNetworkDelay();
  const newInventoryItem: InventoryItem = {
    id: generateId(),
    added_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    ...data,
  };
  // Check if item already exists in inventory by catalog_number and brand
  const existingItemIndex = mockInventory.findIndex(
    (item) => item.catalog_number === newInventoryItem.catalog_number && item.brand === newInventoryItem.brand
  );

  if (existingItemIndex !== -1) {
    // If it exists, update quantity
    mockInventory[existingItemIndex].quantity += newInventoryItem.quantity;
    mockInventory[existingItemIndex].last_updated = new Date().toISOString();
    return mockInventory[existingItemIndex];
  } else {
    // Otherwise, add new item
    mockInventory.push(newInventoryItem);
    return newInventoryItem;
  }
};

export const updateMockInventoryItem = async (id: string, data: Partial<Omit<InventoryItem, "id" | "added_at">>): Promise<InventoryItem> => {
  await simulateNetworkDelay();
  const index = mockInventory.findIndex(item => item.id === id);
  if (index === -1) throw new Error("Inventory item not found");
  mockInventory[index] = { ...mockInventory[index], ...data, last_updated: new Date().toISOString() };
  return mockInventory[index];
};

export const deleteMockInventoryItem = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  mockInventory = mockInventory.filter(item => item.id !== id);
};

// --- Mock Email Sending Function ---
export const sendMockEmail = async (email: MockEmail): Promise<void> => {
  await simulateNetworkDelay();
  console.log("--- SIMULATED EMAIL SENT ---");
  console.log("To:", email.to);
  console.log("Subject:", email.subject);
  console.log("Body:", email.body);
  if (email.attachments && email.attachments.length > 0) {
    console.log("Attachments:", email.attachments.map(a => a.name).join(", "));
  }
  console.log("----------------------------");
};