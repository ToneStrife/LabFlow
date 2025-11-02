// src/data/crud.ts

import {
  Profile,
  Vendor,
  SupabaseRequest,
  SupabaseRequestItem,
  ProductDetails,
  InventoryItem,
  MockEmail,
  Expenditure, // Importar Expenditure
  RequestItem, // Importar RequestItem
  RequestStatus, // Importar RequestStatus
} from "./types";
import * as storage from "./storage"; // Importar como namespace

// Función para simular un retraso de red
const simulateNetworkDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// --- CRUD Functions for Profiles ---
export const getMockProfiles = async (): Promise<Profile[]> => {
  await simulateNetworkDelay();
  return storage.mockProfiles;
};

export const addMockProfile = async (data: Omit<Profile, "id" | "updated_at" | "notify_on_status_change" | "notify_on_new_request">): Promise<Profile> => {
  await simulateNetworkDelay();
  const newProfile: Profile = {
    id: storage.generateId(),
    updated_at: new Date().toISOString(),
    avatar_url: null, // Default to null
    notify_on_status_change: true, // Default value
    notify_on_new_request: false, // Default value
    ...data,
  };
  storage.mockProfiles.push(newProfile);
  return newProfile;
};

export const updateMockProfile = (id: string, data: Partial<Profile>): void => {
  const index = storage.mockProfiles.findIndex(p => p.id === id);
  if (index !== -1) {
    storage.mockProfiles[index] = { ...storage.mockProfiles[index], ...data, updated_at: new Date().toISOString() };
  }
};

export const deleteMockProfile = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  storage.deleteMockProfileById(id);
};

// --- CRUD Functions for Requests ---
export const getMockRequests = async (): Promise<SupabaseRequest[]> => {
  await simulateNetworkDelay();
  // Join requests with their items
  return storage.mockRequests.map(req => ({
    ...req,
    items: storage.mockRequestItems.filter(item => item.request_id === req.id),
  }));
};

export const addMockRequest = async (data: Omit<SupabaseRequest, "id" | "created_at" | "status" | "items" | "po_number" | "quote_url" | "po_url" | "slip_url" | "request_number"> & { items: RequestItem[] }): Promise<SupabaseRequest> => {
  await simulateNetworkDelay();
  const newRequestId = storage.generateId();
  const newRequest: SupabaseRequest = {
    id: newRequestId,
    request_number: null, // Mock requests don't generate numbers
    created_at: new Date().toISOString(),
    status: "Pending",
    quote_url: null,
    po_number: null,
    po_url: null,
    slip_url: null,
    shipping_address_id: data.shipping_address_id, // Corregido
    billing_address_id: data.billing_address_id, // Corregido
    ...data,
    items: [], // Will be populated after item insertion
  };
  storage.mockRequests.push(newRequest);

  const newItems: SupabaseRequestItem[] = data.items.map(item => ({
    id: storage.generateId(),
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
  storage.mockRequestItems.push(...newItems);

  return { ...newRequest, items: newItems };
};

export const updateMockRequestStatus = async (
  id: string, 
  status: RequestStatus,
  quoteUrl: string | null = null,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  await simulateNetworkDelay();
  const index = storage.mockRequests.findIndex(req => req.id === id);
  if (index === -1) throw new Error("Request not found");
  
  storage.mockRequests[index].status = status;
  if (quoteUrl !== undefined) {
    storage.mockRequests[index].quote_url = quoteUrl;
  }
  if (poNumber !== undefined) {
    storage.mockRequests[index].po_number = poNumber;
  }

  return {
    ...storage.mockRequests[index],
    items: storage.mockRequestItems.filter(item => item.request_id === id),
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
  const index = storage.mockRequests.findIndex(req => req.id === id);
  if (index === -1) throw new Error("Request not found");

  if (data.accountManagerId !== undefined) {
    storage.mockRequests[index].account_manager_id = data.accountManagerId === 'unassigned' ? null : data.accountManagerId;
  }
  if (data.notes !== undefined) {
    storage.mockRequests[index].notes = data.notes || null;
  }
  if (data.projectCodes !== undefined) {
    storage.mockRequests[index].project_codes = data.projectCodes || null;
  }

  return {
    ...storage.mockRequests[index],
    items: storage.mockRequestItems.filter(item => item.request_id === id),
  };
};


export const updateMockRequestFile = async (
  id: string,
  fileType: "quote" | "po" | "slip",
  fileUrl: string,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  await simulateNetworkDelay();
  const index = storage.mockRequests.findIndex(req => req.id === id);
  if (index === -1) throw new Error("Request not found");

  switch (fileType) {
    case "quote":
      storage.mockRequests[index].quote_url = fileUrl;
      if (storage.mockRequests[index].status === "Quote Requested") {
        // If quote is uploaded, move to PO Requested state
        storage.mockRequests[index].status = "PO Requested";
      }
      break;
    case "po":
      storage.mockRequests[index].po_url = fileUrl;
      if (poNumber) {
        storage.mockRequests[index].po_number = poNumber;
      }
      break;
    case "slip":
      storage.mockRequests[index].slip_url = fileUrl;
      break;
  }

  return {
    ...storage.mockRequests[index],
    items: storage.mockRequestItems.filter(item => item.request_id === id),
  };
};

export const deleteMockRequest = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  storage.deleteMockRequestById(id);
};

// --- CRUD Functions for Inventory ---
export const getMockInventory = async (): Promise<InventoryItem[]> => {
  await simulateNetworkDelay();
  return storage.mockInventory;
};

export const addMockInventoryItem = async (data: Omit<InventoryItem, "id" | "added_at" | "last_updated">): Promise<InventoryItem> => {
  await simulateNetworkDelay();
  const newInventoryItem: InventoryItem = {
    id: storage.generateId(),
    added_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    ...data,
  };
  // Check if item already exists in inventory by catalog_number and brand
  const existingItemIndex = storage.mockInventory.findIndex(
    (item) => item.catalog_number === newInventoryItem.catalog_number && item.brand === newInventoryItem.brand
  );

  if (existingItemIndex !== -1) {
    // If it exists, update quantity
    storage.mockInventory[existingItemIndex].quantity += newInventoryItem.quantity;
    storage.mockInventory[existingItemIndex].last_updated = new Date().toISOString();
    return storage.mockInventory[existingItemIndex];
  } else {
    // Otherwise, add new item
    storage.mockInventory.push(newInventoryItem);
    return newInventoryItem;
  }
};

export const updateMockInventoryItem = async (id: string, data: Partial<Omit<InventoryItem, "id" | "added_at">>): Promise<InventoryItem> => {
  await simulateNetworkDelay();
  const index = storage.mockInventory.findIndex(item => item.id === id);
  if (index === -1) throw new Error("Inventory item not found");
  storage.mockInventory[index] = { ...storage.mockInventory[index], ...data, last_updated: new Date().toISOString() };
  return storage.mockInventory[index];
};

export const deleteMockInventoryItem = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  storage.deleteMockInventoryItemById(id);
};

// --- CRUD Functions for Expenditures (REMOVED) ---
export const getMockExpenditures = async (): Promise<Expenditure[]> => {
  throw new Error("Mock function removed. Use apiGetExpenditures.");
};

export const addMockExpenditure = async (data: Omit<Expenditure, "id" | "created_at">): Promise<Expenditure> => {
  throw new Error("Mock function removed. Use apiAddExpenditure.");
};

export const updateMockExpenditure = async (id: string, data: Partial<Omit<Expenditure, "id" | "created_at">>): Promise<Expenditure> => {
  throw new Error("Mock function removed. Use apiUpdateExpenditure.");
};

export const deleteMockExpenditure = async (id: string): Promise<void> => {
  throw new Error("Mock function removed. Use apiDeleteExpenditure.");
};

// --- Mock Email Sending Function ---
export const sendMockEmail = async (email: MockEmail): Promise<void> => {
  await simulateNetworkDelay();
  console.log("--- SIMULATED EMAIL SENT ---");
  console.log("To:", email.to);
  console.log("Subject:", email.subject);
  if (email.attachments && email.attachments.length > 0) {
    console.log("Attachments:", email.attachments.map(a => a.name).join(", "));
  }
  console.log("----------------------------");
};