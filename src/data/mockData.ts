// src/data/mockData.ts

export type RequestStatus = "Pending" | "Approved" | "Ordered" | "Received";

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

// User interface is now primarily handled by Profile in use-profiles.ts
// Keeping a minimal User interface for backward compatibility if needed in mock contexts
export interface User {
  id: string;
  name?: string; // Make name optional as we'll derive it from first/last
  first_name?: string; // New field
  last_name?: string; // New field
  email: string;
  role: "Requester" | "Account Manager" | "Admin"; // Example roles
}

// NOTE: AccountManager interface is no longer needed as profiles will be used

// NOTE: LabRequest interface is now primarily handled by SupabaseRequest in use-requests.ts
// Keeping a minimal LabRequest interface for backward compatibility if needed in mock contexts
export interface LabRequest {
  id: string;
  vendorId: string;
  requesterId: string;
  accountManagerId: string;
  status: RequestStatus;
  date: string; // Keeping date for mock data compatibility, but Supabase uses created_at
  notes?: string;
  items: RequestItem[];
  attachments?: { name: string; url: string }[];
  projectCodes?: string[];
}

// NOTE: Vendor interface is now defined in src/hooks/use-vendors.ts
// We keep mockVendors here only for linking in other mock data (like mockRequests)
export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  notes?: string;
  brands: string[];
}

export interface Project {
  id: string;
  name: string;
  code: string;
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

// Changed from object to array for easier searching by multiple fields
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

// --- Mock Data Storage ---
// Removed mockUsers

// Keeping mockVendors for linking in mockRequests, but CRUD operations will use Supabase
export let mockVendors: Vendor[] = [
  {
    id: "v1",
    name: "Thermo Fisher Scientific",
    contactPerson: "Jane Doe",
    email: "jane.doe@thermofisher.com",
    phone: "1-800-123-4567",
    notes: "Primary vendor for reagents and consumables.",
    brands: ["Invitrogen", "Applied Biosystems", "Gibco"],
  },
  {
    id: "v2",
    name: "Sigma-Aldrich",
    contactPerson: "John Smith",
    email: "john.smith@sigmaaldrich.com",
    phone: "1-800-765-4321",
    notes: "Specializes in chemicals and custom synthesis.",
    brands: ["Sigma", "Aldrich", "Supelco"],
  },
  {
    id: "v3",
    name: "Bio-Rad Laboratories",
    contactPerson: "Emily White",
    email: "emily.white@bio-rad.com",
    phone: "1-800-987-6543",
    notes: "Equipment and kits for molecular biology.",
    brands: ["Bio-Rad"],
  },
  {
    id: "v4",
    name: "Qiagen",
    contactPerson: "David Green",
    email: "david.green@qiagen.com",
    phone: "1-800-234-5678",
    notes: "DNA/RNA purification and assay technologies.",
    brands: ["Qiagen"],
  },
];

// Removed mockAccountManagers

export const mockProjects: Project[] = [
  { id: "p1", name: "Project Alpha", code: "PA-001" },
  { id: "p2", name: "Project Beta", code: "PB-002" },
  { id: "p3", name: "Project Gamma", code: "PG-003" },
  { id: "p4", name: "Project Delta", code: "PD-004" },
];

// Empty mockRequests array as data will come from Supabase
export let mockRequests: LabRequest[] = [];

// Helper function to get user's full name - REMOVED MOCK IMPLEMENTATION
export const getUserFullName = (userId: string): string => {
  // This function is now a placeholder and should be replaced by useAllProfiles hook logic in components
  return userId;
};


// --- Observer Pattern for Mock Data Changes ---

type Listener<T> = (data: T) => void;

// Removed userListeners and related functions

// Removed accountManagerListeners and related functions

// --- Functions to modify mock data (simulating API calls) ---
// Removed addUser, updateUser, deleteUser
// Removed addAccountManager, updateAccountManager, deleteAccountManager

// Removed mock data modification functions as they are replaced by Supabase hooks
export const addRequest = (newRequest: Omit<LabRequest, "id" | "status" | "date">) => {
  console.warn("addRequest from mockData is deprecated. Use useAddRequest hook instead.");
  return null;
};

export const updateRequestStatus = (requestId: string, newStatus: RequestStatus) => {
  console.warn("updateRequestStatus from mockData is deprecated. Use useUpdateRequestStatus hook instead.");
  return null;
};

export const addVendor = (newVendor: Omit<Vendor, "id">) => {
  console.warn("addVendor from mockData is deprecated. Use useAddVendor hook instead.");
  return null;
};

export const updateVendor = (vendorId: string, updatedData: Partial<Vendor>) => {
  console.warn("updateVendor from mockData is deprecated. Use useUpdateVendor hook instead.");
  return null;
};

export const deleteVendor = (vendorId: string) => {
  console.warn("deleteVendor from mockData is deprecated. Use useDeleteVendor hook instead.");
  return false;
};

// Request and Vendor listeners are also deprecated as data comes from Supabase hooks
export const subscribeToRequests = (listener: Listener<LabRequest[]>) => {
  console.warn("subscribeToRequests from mockData is deprecated. Use useRequests hook instead.");
  return () => {};
};

export const subscribeToVendors = (listener: Listener<Vendor[]>) => {
  console.warn("subscribeToVendors from mockData is deprecated. Use useVendors hook instead.");
  return () => {};
};