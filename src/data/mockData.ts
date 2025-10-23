// src/data/mockData.ts

export type RequestStatus = "Pending" | "Approved" | "Ordered" | "Received";

export interface RequestItem {
  id: string;
  productName: string;
  catalogNumber: string;
  quantity: number;
  unitPrice?: number;
  format?: string;
  link?: string;
  notes?: string;
  brand?: string; // New field for brand
}

export interface User {
  id: string;
  name?: string; // Make name optional as we'll derive it from first/last
  first_name?: string; // New field
  last_name?: string; // New field
  email: string;
  role: "Requester" | "Account Manager" | "Admin"; // Example roles
}

export interface AccountManager {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

// NOTE: This type is now primarily used for form input/local mock data linking
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
export let mockUsers: User[] = [
  { id: "u1", first_name: "Alice", last_name: "Smith", email: "alice.s@lab.com", role: "Requester" },
  { id: "u2", first_name: "Bob", last_name: "Johnson", email: "bob.j@lab.com", role: "Requester" },
  { id: "u3", first_name: "Carol", last_name: "White", email: "carol.w@lab.com", role: "Requester" },
  { id: "u4", first_name: "Admin", last_name: "User", email: "admin@lab.com", role: "Admin" },
];

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

export let mockAccountManagers: AccountManager[] = [
  { id: "am1", name: "Manager A", email: "manager.a@lab.com", phone: "555-111-2222" },
  { id: "am2", name: "Manager B", email: "manager.b@lab.com", phone: "555-333-4444" },
];

export const mockProjects: Project[] = [
  { id: "p1", name: "Project Alpha", code: "PA-001" },
  { id: "p2", name: "Project Beta", code: "PB-002" },
  { id: "p3", name: "Project Gamma", code: "PG-003" },
  { id: "p4", name: "Project Delta", code: "PD-004" },
];

// Empty mockRequests array as data will come from Supabase
export let mockRequests: LabRequest[] = [];

// Helper function to get user's full name
export const getUserFullName = (userId: string): string => {
  const user = mockUsers.find(u => u.id === userId);
  if (user) {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.name || "N/A"; // Fallback to 'name' if first/last not set
  }
  return "N/A";
};


// --- Observer Pattern for Mock Data Changes ---

type Listener<T> = (data: T) => void;

const userListeners: Listener<User[]>[] = [];
const accountManagerListeners: Listener<AccountManager[]>[] = [];

// Removed subscribeToRequests

export const subscribeToUsers = (listener: Listener<User[]>) => {
  userListeners.push(listener);
  return () => {
    const index = userListeners.indexOf(listener);
    if (index > -1) {
      userListeners.splice(index, 1);
    }
  };
};

export const subscribeToAccountManagers = (listener: Listener<AccountManager[]>) => {
  accountManagerListeners.push(listener);
  return () => {
    const index = accountManagerListeners.indexOf(listener);
    if (index > -1) {
      accountManagerListeners.splice(index, 1);
    }
  };
};

// Removed notifyRequestListeners

const notifyUserListeners = () => {
  userListeners.forEach(listener => listener([...mockUsers]));
};

const notifyAccountManagerListeners = () => {
  accountManagerListeners.forEach(listener => listener([...mockAccountManagers]));
};

// --- Functions to modify mock data (simulating API calls) ---
// Removed addRequest and updateRequestStatus

export const addUser = (newUser: Omit<User, "id">) => {
  const id = `u${mockUsers.length + 1}`;
  const userToAdd: User = { id, ...newUser };
  mockUsers.push(userToAdd);
  notifyUserListeners();
  return userToAdd;
};

export const updateUser = (userId: string, updatedData: Partial<User>) => {
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex > -1) {
    mockUsers[userIndex] = { ...mockUsers[userIndex], ...updatedData };
    notifyUserListeners();
    return mockUsers[userIndex];
  }
  return null;
};

export const deleteUser = (userId: string) => {
  const initialLength = mockUsers.length;
  mockUsers = mockUsers.filter(u => u.id !== userId);
  if (mockUsers.length < initialLength) {
    notifyUserListeners();
    return true;
  }
  return false;
};

export const addAccountManager = (newManager: Omit<AccountManager, "id">) => {
  const id = `am${mockAccountManagers.length + 1}`;
  const managerToAdd: AccountManager = { id, ...newManager };
  mockAccountManagers.push(managerToAdd);
  notifyAccountManagerListeners();
  return managerToAdd;
};

export const updateAccountManager = (managerId: string, updatedData: Partial<AccountManager>) => {
  const managerIndex = mockAccountManagers.findIndex(am => am.id === managerId);
  if (managerIndex > -1) {
    mockAccountManagers[managerIndex] = { ...mockAccountManagers[managerIndex], ...updatedData };
    notifyAccountManagerListeners();
    return mockAccountManagers[managerIndex];
  }
  return null;
};

export const deleteAccountManager = (managerId: string) => {
  const initialLength = mockAccountManagers.length;
  mockAccountManagers = mockAccountManagers.filter(am => am.id !== managerId);
  if (mockAccountManagers.length < initialLength) {
    notifyAccountManagerListeners();
    return true;
  }
  return false;
};