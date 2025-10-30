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
} from "./types";
import {
  generateId,
  mockProfiles,
  mockVendors,
  mockRequestItems,
  mockRequests,
  mockInventory,
} from "./storage";

// Función para simular un retraso de red
const simulateNetworkDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// --- Mock Data Storage for Expenditures ---
export let mockExpenditures: Expenditure[] = [
  {
    id: "exp1",
    created_at: new Date().toISOString(),
    project_id: "p1", // Assuming p1 exists in mockProjects
    amount: 500.00,
    description: "Initial budget allocation for Project Alpha",
    date_incurred: new Date().toISOString().split('T')[0],
    request_id: null,
  },
  {
    id: "exp2",
    created_at: new Date().toISOString(),
    project_id: "p2", // Assuming p2 exists
    amount: 185.50,
    description: "Cost of Request 2024-0002 (Antibody)",
    date_incurred: new Date().toISOString().split('T')[0],
    request_id: "req2",
  },
];

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

// --- CRUD Functions for Requests ---
export const getMockRequests = async (): Promise<SupabaseRequest[]> => {
  await simulateNetworkDelay();
  // Join requests with their items
  return mockRequests.map(req => ({
    ...req,
    items: mockRequestItems.filter(item => item.request_id === req.id),
  }));
};

export const addMockRequest = async (data: Omit<SupabaseRequest, "id" | "created_at" | "status" | "items" | "po_number" | "quote_url" | "po_url" | "slip_url" | "request_number" | "shipping_address_id" | "billing_address_id"> & { items: RequestItem[] }): Promise<SupabaseRequest> => {
  await simulateNetworkDelay();
  const newRequestId = generateId();
  const newRequest: SupabaseRequest = {
    id: newRequestId,
    request_number: null, // Mock requests don't generate numbers
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

// --- CRUD Functions for Expenditures ---
export const getMockExpenditures = async (): Promise<Expenditure[]> => {
  await simulateNetworkDelay();
  return mockExpenditures;
};

export const addMockExpenditure = async (data: Omit<Expenditure, "id" | "created_at">): Promise<Expenditure> => {
  await simulateNetworkDelay();
  const newExpenditure: Expenditure = {
    id: generateId(),
    created_at: new Date().toISOString(),
    ...data,
  };
  mockExpenditures.push(newExpenditure);
  return newExpenditure;
};

export const updateMockExpenditure = async (id: string, data: Partial<Omit<Expenditure, "id" | "created_at">>): Promise<Expenditure> => {
  await simulateNetworkDelay();
  const index = mockExpenditures.findIndex(exp => exp.id === id);
  if (index === -1) throw new Error("Expenditure not found");
  mockExpenditures[index] = { ...mockExpenditures[index], ...data };
  return mockExpenditures[index];
};

export const deleteMockExpenditure = async (id: string): Promise<void> => {
  await simulateNetworkDelay();
  mockExpenditures = mockExpenditures.filter(exp => exp.id !== id);
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