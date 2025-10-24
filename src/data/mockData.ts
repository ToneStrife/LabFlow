// src/data/mockData.ts

export type RequestStatus = "Pending" | "Approved" | "Quote Requested" | "PO Requested" | "Ordered" | "Received";

export interface RequestItem {
  id?: string; // ID is optional for new items before insertion
  productName: string;
  catalogNumber: string;
  quantity: number;
  unitPrice?: number;
  format?: string;
  link?: string;
  notes?: string;
  brand?: string; // New field for brand
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null; // Added email to profile
  avatar_url: string | null;
  updated_at: string | null;
  role: "Requester" | "Account Manager" | "Admin";
}

export interface Vendor {
  id: string;
  created_at: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  brands: string[] | null;
}

export interface CustomerAccount {
  id: string;
  created_at: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  owner_id: string;
  assigned_manager_id: string | null;
}

export interface SupabaseRequestItem {
  id: string;
  request_id: string;
  product_name: string;
  catalog_number: string;
  quantity: number;
  unit_price: number | null;
  format: string | null;
  link: string | null;
  notes: string | null;
  brand: string | null;
}

export interface SupabaseRequest {
  id: string;
  created_at: string;
  vendor_id: string;
  requester_id: string;
  account_manager_id: string | null;
  status: RequestStatus;
  notes: string | null;
  project_codes: string[] | null;
  items: SupabaseRequestItem[] | null;
  quote_details: string | null; // New field for quote details (e.g., a link to a PDF or text)
  po_number: string | null; // New field for Purchase Order number
}

// --- Mock Data for Autofill Feature ---
export interface ProductDetails {
  id: string;
  productName: string;
  catalogNumber: string;
  unitPrice?: number;
  format?: string;
  link?: string;
  brand: string;
}

export const productDatabase: ProductDetails[] = [
  {
    id: "pdt1",
    productName: "E. coli DH5a Competent Cells",
    catalogNumber: "18265017",
    unitPrice: 150.00,
    format: "10x 50µl",
    link: "https://www.thermofisher.com/order/catalog/product/18265017",
    brand: "Invitrogen",
  },
  {
    id: "pdt2",
    productName: "DMEM, high glucose, GlutaMAX Supplement, pyruvate",
    catalogNumber: "11965092",
    unitPrice: 35.50,
    format: "500 mL",
    link: "https://www.thermofisher.com/order/catalog/product/11965092",
    brand: "Gibco",
  },
  {
    id: "pdt3",
    productName: "Anti-GFP Antibody (Rabbit Polyclonal)",
    catalogNumber: "ab12345",
    unitPrice: 120.50,
    format: "100 µl",
    link: "https://www.abcam.com/anti-gfp-antibody-ab12345.html",
    brand: "Abcam",
  },
  {
    id: "pdt4",
    productName: "Anti-GFP Antibody (Mouse Monoclonal)",
    catalogNumber: "ab12345",
    unitPrice: 130.00,
    format: "50 µl",
    link: "https://www.bio-rad.com/anti-gfp-antibody-ab12345.html",
    brand: "Bio-Rad",
  },
  {
    id: "pdt5",
    productName: "Taq DNA Polymerase",
    catalogNumber: "P2000",
    unitPrice: 50.00,
    format: "500 units",
    link: "https://www.sigmaaldrich.com/P2000",
    brand: "Sigma-Aldrich",
  },
];

export const mockProjects: { id: string; name: string; code: string }[] = [
  { id: "p1", name: "Project Alpha", code: "PA-001" },
  { id: "p2", name: "Project Beta", code: "PB-002" },
  { id: "p3", name: "Project Gamma", code: "PG-003" },
  { id: "p4", name: "Project Delta", code: "PD-004" },
];

// --- Mock Data Storage ---
export let mockProfiles: Profile[] = [
  {
    id: "mock-user-id-123",
    first_name: "Mock",
    last_name: "User",
    email: "user@example.com",
    avatar_url: null,
    updated_at: new Date().toISOString(),
    role: "Requester",
  },
  {
    id: "manager-id-456",
    first_name: "Alice",
    last_name: "Manager",
    email: "alice.manager@example.com",
    avatar_url: null,
    updated_at: new Date().toISOString(),
    role: "Account Manager",
  },
  {
    id: "manager-id-789",
    first_name: "Bob",
    last_name: "Supervisor",
    email: "bob.supervisor@example.com",
    avatar_url: null,
    updated_at: new Date().toISOString(),
    role: "Account Manager",
  },
];

export let mockVendors: Vendor[] = [
  {
    id: "v1",
    created_at: new Date().toISOString(),
    name: "Thermo Fisher Scientific",
    contact_person: "Jane Doe",
    email: "jane.doe@thermofisher.com",
    phone: "1-800-123-4567",
    notes: "Primary vendor for reagents and consumables.",
    brands: ["Invitrogen", "Applied Biosystems", "Gibco"],
  },
  {
    id: "v2",
    created_at: new Date().toISOString(),
    name: "Sigma-Aldrich",
    contact_person: "John Smith",
    email: "john.smith@sigmaaldrich.com",
    phone: "1-800-765-4321",
    notes: "Specializes in chemicals and custom synthesis.",
    brands: ["Sigma", "Aldrich", "Supelco"],
  },
  {
    id: "v3",
    created_at: new Date().toISOString(),
    name: "Bio-Rad Laboratories",
    contact_person: "Emily White",
    email: "emily.white@bio-rad.com",
    phone: "1-800-987-6543",
    notes: "Equipment and kits for molecular biology.",
    brands: ["Bio-Rad"],
  },
];

export let mockCustomerAccounts: CustomerAccount[] = [
  {
    id: "ca1",
    created_at: new Date().toISOString(),
    name: "Biology Department",
    contact_person: "Dr. Alice Smith",
    email: "alice.smith@bio.edu",
    phone: "555-111-2222",
    notes: "Main research department.",
    owner_id: "mock-user-id-123",
    assigned_manager_id: "manager-id-456",
  },
  {
    id: "ca2",
    created_at: new Date().toISOString(),
    name: "Chemistry Department",
    contact_person: "Dr. Bob Johnson",
    email: "bob.johnson@chem.edu",
    phone: "555-333-4444",
    notes: "Organic synthesis lab.",
    owner_id: "mock-user-id-123",
    assigned_manager_id: null,
  },
];

export let mockRequestItems: SupabaseRequestItem[] = [
  {
    id: "ri1",
    request_id: "req1",
    product_name: "E. coli DH5a Competent Cells",
    catalog_number: "18265017",
    quantity: 2,
    unit_price: 150.00,
    format: "10x 50µl",
    link: "https://www.thermofisher.com/order/catalog/product/18265017",
    notes: null,
    brand: "Invitrogen",
  },
  {
    id: "ri2",
    request_id: "req1",
    product_name: "DMEM, high glucose",
    catalog_number: "11965092",
    quantity: 5,
    unit_price: 35.50,
    format: "500 mL",
    link: "https://www.thermofisher.com/order/catalog/product/11965092",
    notes: "Need quickly",
    brand: "Gibco",
  },
  {
    id: "ri3",
    request_id: "req2",
    product_name: "Anti-GFP Antibody",
    catalog_number: "ab12345",
    quantity: 1,
    unit_price: 120.50,
    format: "100 µl",
    link: "https://www.abcam.com/anti-gfp-antibody-ab12345.html",
    notes: null,
    brand: "Abcam",
  },
];

export let mockRequests: SupabaseRequest[] = [
  {
    id: "req1",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    vendor_id: "v1",
    requester_id: "mock-user-id-123",
    account_manager_id: "manager-id-456",
    status: "Pending",
    notes: "Urgent request for cell culture supplies.",
    project_codes: ["p1"],
    items: [], // Items will be joined later
    quote_details: null,
    po_number: null,
  },
  {
    id: "req2",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    vendor_id: "v3",
    requester_id: "mock-user-id-123",
    account_manager_id: null,
    status: "Approved",
    notes: "Antibody for western blot.",
    project_codes: ["p2"],
    items: [], // Items will be joined later
    quote_details: null,
    po_number: null,
  },
  {
    id: "req3",
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
    vendor_id: "v2",
    requester_id: "mock-user-id-123",
    account_manager_id: "manager-id-789",
    status: "Ordered",
    notes: "Chemicals for new experiment.",
    project_codes: ["p3"],
    items: [], // Items will be joined later
    quote_details: "https://example.com/quote-req3.pdf",
    po_number: "PO-CHEM-001",
  },
];

// --- Inventory Data and Interface ---
export interface InventoryItem {
  id: string;
  product_name: string;
  catalog_number: string;
  brand: string | null;
  quantity: number;
  unit_price: number | null;
  format: string | null;
  added_at: string; // When it was added to inventory
  last_updated: string;
}

export let mockInventory: InventoryItem[] = [
  {
    id: "inv1",
    product_name: "Taq DNA Polymerase",
    catalog_number: "P2000",
    brand: "Sigma-Aldrich",
    quantity: 3,
    unit_price: 50.00,
    format: "500 units",
    added_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    last_updated: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
];


// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// --- CRUD Functions for Mock Data ---

// Profiles
export const getMockProfiles = async (): Promise<Profile[]> => {
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API delay
  return mockProfiles;
};

export const addMockProfile = async (data: Omit<Profile, "id" | "updated_at">): Promise<Profile> => {
  await new Promise(resolve => setTimeout(resolve, 300));
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
  await new Promise(resolve => setTimeout(resolve, 300));
  mockProfiles = mockProfiles.filter(p => p.id !== id);
};

// Vendors
export const getMockVendors = async (): Promise<Vendor[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockVendors;
};

export const addMockVendor = async (data: Omit<Vendor, "id" | "created_at">): Promise<Vendor> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const newVendor: Vendor = {
    id: generateId(),
    created_at: new Date().toISOString(),
    ...data,
  };
  mockVendors.push(newVendor);
  return newVendor;
};

export const updateMockVendor = async (id: string, data: Partial<Omit<Vendor, "id" | "created_at">>): Promise<Vendor> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const index = mockVendors.findIndex(v => v.id === id);
  if (index === -1) throw new Error("Vendor not found");
  mockVendors[index] = { ...mockVendors[index], ...data };
  return mockVendors[index];
};

export const deleteMockVendor = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  mockVendors = mockVendors.filter(v => v.id !== id);
};

// Customer Accounts
export const getMockCustomerAccounts = async (): Promise<CustomerAccount[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockCustomerAccounts;
};

export const addMockCustomerAccount = async (data: Omit<CustomerAccount, "id" | "created_at">): Promise<CustomerAccount> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const newAccount: CustomerAccount = {
    id: generateId(),
    created_at: new Date().toISOString(),
    ...data,
  };
  mockCustomerAccounts.push(newAccount);
  return newAccount;
};

export const updateMockCustomerAccount = async (id: string, data: Partial<Omit<CustomerAccount, "id" | "created_at">>): Promise<CustomerAccount> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const index = mockCustomerAccounts.findIndex(a => a.id === id);
  if (index === -1) throw new Error("Customer account not found");
  mockCustomerAccounts[index] = { ...mockCustomerAccounts[index], ...data };
  return mockCustomerAccounts[index];
};

export const deleteMockCustomerAccount = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  mockCustomerAccounts = mockCustomerAccounts.filter(a => a.id !== id);
};

// Requests
export const getMockRequests = async (): Promise<SupabaseRequest[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  // Join requests with their items
  return mockRequests.map(req => ({
    ...req,
    items: mockRequestItems.filter(item => item.request_id === req.id),
  }));
};

export const addMockRequest = async (data: Omit<SupabaseRequest, "id" | "created_at" | "status" | "items" | "quote_details" | "po_number"> & { items: RequestItem[] }): Promise<SupabaseRequest> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const newRequestId = generateId();
  const newRequest: SupabaseRequest = {
    id: newRequestId,
    created_at: new Date().toISOString(),
    status: "Pending",
    quote_details: null,
    po_number: null,
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

export const updateMockRequestStatus = async (id: string, status: RequestStatus, quote_details: string | null = null, po_number: string | null = null): Promise<SupabaseRequest> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const index = mockRequests.findIndex(req => req.id === id);
  if (index === -1) throw new Error("Request not found");
  mockRequests[index].status = status;
  if (quote_details !== null) mockRequests[index].quote_details = quote_details;
  if (po_number !== null) mockRequests[index].po_number = po_number;

  return {
    ...mockRequests[index],
    items: mockRequestItems.filter(item => item.request_id === id),
  };
};

export const deleteMockRequest = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  mockRequests = mockRequests.filter(req => req.id !== id);
  mockRequestItems = mockRequestItems.filter(item => item.request_id !== id);
};

// --- CRUD Functions for Inventory ---
export interface InventoryItem {
  id: string;
  product_name: string;
  catalog_number: string;
  brand: string | null;
  quantity: number;
  unit_price: number | null;
  format: string | null;
  added_at: string; // When it was added to inventory
  last_updated: string;
}

export let mockInventory: InventoryItem[] = [
  {
    id: "inv1",
    product_name: "Taq DNA Polymerase",
    catalog_number: "P2000",
    brand: "Sigma-Aldrich",
    quantity: 3,
    unit_price: 50.00,
    format: "500 units",
    added_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    last_updated: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
];

export const getMockInventory = async (): Promise<InventoryItem[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockInventory;
};

export const addMockInventoryItem = async (data: Omit<InventoryItem, "id" | "added_at" | "last_updated">): Promise<InventoryItem> => {
  await new Promise(resolve => setTimeout(resolve, 300));
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
  await new Promise(resolve => setTimeout(resolve, 300));
  const index = mockInventory.findIndex(item => item.id === id);
  if (index === -1) throw new Error("Inventory item not found");
  mockInventory[index] = { ...mockInventory[index], ...data, last_updated: new Date().toISOString() };
  return mockInventory[index];
};

export const deleteMockInventoryItem = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  mockInventory = mockInventory.filter(item => item.id !== id);
};

// --- Mock Email Sending Function ---
interface MockEmail {
  to: string;
  subject: string;
  body: string;
  attachments?: { name: string; url: string }[];
}

export const sendMockEmail = async (email: MockEmail): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  console.log("--- SIMULATED EMAIL SENT ---");
  console.log("To:", email.to);
  console.log("Subject:", email.subject);
  console.log("Body:", email.body);
  if (email.attachments && email.attachments.length > 0) {
    console.log("Attachments:", email.attachments.map(a => a.name).join(", "));
  }
  console.log("----------------------------");
};