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
  name: string;
  email: string;
  role: "Requester" | "Account Manager" | "Admin"; // Example roles
}

export interface AccountManager {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface LabRequest {
  id: string;
  vendorId: string;
  requesterId: string; // Changed from 'requester: string' to link to User
  accountManagerId: string; // New field to link to AccountManager
  status: RequestStatus;
  date: string;
  notes?: string;
  items: RequestItem[];
  attachments?: { name: string; url: string }[];
  projectCodes?: string[];
}

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
export const productDatabase: { [key: string]: any } = {
  "18265017": {
    productName: "E. coli DH5a Competent Cells",
    unitPrice: 150.00,
    format: "10x 50µl",
    link: "https://www.thermofisher.com/order/catalog/product/18265017",
    brand: "Invitrogen",
  },
  "11965092": {
    productName: "DMEM, high glucose, GlutaMAX Supplement, pyruvate",
    unitPrice: 35.50,
    format: "500 mL",
    link: "https://www.thermofisher.com/order/catalog/product/11965092",
    brand: "Gibco",
  },
  "ab12345": {
    productName: "Anti-GFP Antibody (Rabbit Polyclonal)",
    unitPrice: 120.50,
    format: "100 µl",
    link: "https://www.abcam.com/anti-gfp-antibody-ab12345.html",
    brand: "Abcam",
  },
};

// --- Mock Data Storage ---
export let mockUsers: User[] = [
  { id: "u1", name: "Dr. Alice Smith", email: "alice.s@lab.com", role: "Requester" },
  { id: "u2", name: "Dr. Bob Johnson", email: "bob.j@lab.com", role: "Requester" },
  { id: "u3", name: "Dr. Carol White", email: "carol.w@lab.com", role: "Requester" },
  { id: "u4", name: "Admin User", email: "admin@lab.com", role: "Admin" },
];

export let mockAccountManagers: AccountManager[] = [
  { id: "am1", name: "Manager A", email: "manager.a@lab.com", phone: "555-111-2222" },
  { id: "am2", name: "Manager B", email: "manager.b@lab.com", phone: "555-333-4444" },
];

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

export const mockProjects: Project[] = [
  { id: "p1", name: "Project Alpha", code: "PA-001" },
  { id: "p2", name: "Project Beta", code: "PB-002" },
  { id: "p3", name: "Project Gamma", code: "PG-003" },
  { id: "p4", name: "Project Delta", code: "PD-004" },
];

export let mockRequests: LabRequest[] = [
  {
    id: "req1",
    vendorId: "v1",
    requesterId: "u1", // Linked to Dr. Alice Smith
    accountManagerId: "am1", // Linked to Manager A
    status: "Pending",
    date: "2023-10-26",
    notes: "Need these urgently for upcoming experiments. Please prioritize.",
    items: [
      {
        id: "item1",
        productName: "Anti-GFP Antibody (Rabbit Polyclonal)",
        catalogNumber: "ab12345",
        quantity: 2,
        unitPrice: 120.50,
        link: "https://www.abcam.com/anti-gfp-antibody-ab12345.html",
        notes: "Lot specific, check expiry date.",
        brand: "Abcam",
      },
      {
        id: "item2",
        productName: "Secondary Antibody (Goat Anti-Rabbit IgG)",
        catalogNumber: "SA-2000",
        quantity: 1,
        unitPrice: 85.00,
        link: "https://vectorlabs.com/goat-anti-rabbit-igg.html",
        notes: "",
        brand: "Vector Labs",
      },
    ],
    attachments: [
      { name: "Quote_Abcam_ab12345.pdf", url: "#" },
      { name: "ProjectX_ReagentList.xlsx", url: "#" },
    ],
    projectCodes: ["p1"],
  },
  {
    id: "req2",
    vendorId: "v2",
    requesterId: "u2", // Linked to Dr. Bob Johnson
    accountManagerId: "am2", // Linked to Manager B
    status: "Ordered",
    date: "2023-10-25",
    notes: "Standard PCR reagents.",
    items: [
      {
        id: "item3",
        productName: "Taq DNA Polymerase",
        catalogNumber: "P2000",
        quantity: 5,
        unitPrice: 50.00,
        format: "500 units",
        link: "https://www.sigmaaldrich.com/P2000",
        notes: "",
        brand: "Sigma-Aldrich",
      },
    ],
    projectCodes: ["p2"],
  },
  {
    id: "req3",
    vendorId: "v1",
    requesterId: "u1", // Linked to Dr. Alice Smith
    accountManagerId: "am1", // Linked to Manager A
    status: "Approved",
    date: "2023-10-24",
    notes: "Custom peptide for new assay development.",
    items: [
      {
        id: "item4",
        productName: "Custom Peptide 'ABCDEFG'",
        catalogNumber: "CP-789",
        quantity: 1,
        unitPrice: 500.00,
        link: "",
        notes: "HPLC purity >95%",
        brand: "Thermo Fisher Scientific",
      },
    ],
    projectCodes: ["p1", "p3"],
  },
  {
    id: "req4",
    vendorId: "v3",
    requesterId: "u3", // Linked to Dr. Carol White
    accountManagerId: "am2", // Linked to Manager B
    status: "Received",
    date: "2023-10-23",
    notes: "Routine cell culture supplies.",
    items: [
      {
        id: "item5",
        productName: "Cell Culture Flasks T-75",
        catalogNumber: "142001",
        quantity: 10,
        unitPrice: 5.50,
        format: "100 pack",
        link: "https://www.bio-rad.com/142001",
        notes: "",
        brand: "Bio-Rad",
      },
    ],
    projectCodes: ["p4"],
  },
  {
    id: "req5",
    vendorId: "v1",
    requesterId: "u2", // Linked to Dr. Bob Johnson
    accountManagerId: "am1", // Linked to Manager A
    status: "Pending",
    date: "2023-10-22",
    notes: "For microscopy imaging.",
    items: [
      {
        id: "item6",
        productName: "Microscope Slides",
        catalogNumber: "10001",
        quantity: 2,
        unitPrice: 25.00,
        format: "72 slides/box",
        link: "https://www.thermofisher.com/10001",
        notes: "",
        brand: "Thermo Fisher Scientific",
      },
    ],
    projectCodes: ["p2"],
  },
];

// --- Observer Pattern for Mock Data Changes ---

type Listener<T> = (data: T) => void;

const requestListeners: Listener<LabRequest[]>[] = [];
const vendorListeners: Listener<Vendor[]>[] = [];
const userListeners: Listener<User[]>[] = []; // New listener for Users
const accountManagerListeners: Listener<AccountManager[]>[] = []; // New listener for Account Managers

export const subscribeToRequests = (listener: Listener<LabRequest[]>) => {
  requestListeners.push(listener);
  return () => {
    const index = requestListeners.indexOf(listener);
    if (index > -1) {
      requestListeners.splice(index, 1);
    }
  };
};

export const subscribeToVendors = (listener: Listener<Vendor[]>) => {
  vendorListeners.push(listener);
  return () => {
    const index = vendorListeners.indexOf(listener);
    if (index > -1) {
      vendorListeners.splice(index, 1);
    }
  };
};

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

const notifyRequestListeners = () => {
  requestListeners.forEach(listener => listener([...mockRequests])); // Pass a copy to prevent direct mutation
};

const notifyVendorListeners = () => {
  vendorListeners.forEach(listener => listener([...mockVendors])); // Pass a copy
};

const notifyUserListeners = () => {
  userListeners.forEach(listener => listener([...mockUsers]));
};

const notifyAccountManagerListeners = () => {
  accountManagerListeners.forEach(listener => listener([...mockAccountManagers]));
};

// --- Functions to modify mock data (simulating API calls) ---
export const addRequest = (newRequest: Omit<LabRequest, "id" | "status" | "date">) => {
  const id = `req${mockRequests.length + 1}`;
  const date = new Date().toISOString().slice(0, 10); // Current date
  const status = "Pending"; // Default status for new requests

  const requestToAdd: LabRequest = {
    id,
    date,
    status,
    ...newRequest,
    items: newRequest.items.map((item, index) => ({
      ...item,
      id: `item${mockRequests.length + 1}-${index + 1}`,
    })),
  };
  mockRequests.push(requestToAdd);
  notifyRequestListeners(); // Notify listeners after adding
  return requestToAdd;
};

export const updateRequestStatus = (requestId: string, newStatus: RequestStatus) => {
  const requestIndex = mockRequests.findIndex(req => req.id === requestId);
  if (requestIndex > -1) {
    mockRequests[requestIndex].status = newStatus;
    notifyRequestListeners(); // Notify listeners after updating
    return mockRequests[requestIndex];
  }
  return null;
};

export const addVendor = (newVendor: Omit<Vendor, "id">) => {
  const id = `v${mockVendors.length + 1}`;
  const vendorToAdd: Vendor = { id, ...newVendor };
  mockVendors.push(vendorToAdd);
  notifyVendorListeners(); // Notify listeners after adding
  return vendorToAdd;
};

export const updateVendor = (vendorId: string, updatedData: Partial<Vendor>) => {
  const vendorIndex = mockVendors.findIndex(v => v.id === vendorId);
  if (vendorIndex > -1) {
    mockVendors[vendorIndex] = { ...mockVendors[vendorIndex], ...updatedData };
    notifyVendorListeners(); // Notify listeners after updating
    return mockVendors[vendorIndex];
  }
  return null;
};

export const deleteVendor = (vendorId: string) => {
  const initialLength = mockVendors.length;
  mockVendors = mockVendors.filter(v => v.id !== vendorId);
  if (mockVendors.length < initialLength) {
    notifyVendorListeners(); // Notify listeners if a vendor was removed
    return true;
  }
  return false;
};

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