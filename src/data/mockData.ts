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
}

export interface LabRequest {
  id: string;
  vendorId: string;
  requester: string; // For simplicity, we'll hardcode this for now
  status: RequestStatus;
  date: string;
  notes?: string; // Added notes to LabRequest interface
  items: RequestItem[];
  attachments?: { name: string; url: string }[];
  projectCodes?: string[]; // Array of project IDs
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

// Initial Mock Data
export const mockVendors: Vendor[] = [
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
    requester: "Dr. Alice Smith",
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
      },
      {
        id: "item2",
        productName: "Secondary Antibody (Goat Anti-Rabbit IgG)",
        catalogNumber: "SA-2000",
        quantity: 1,
        unitPrice: 85.00,
        link: "https://vectorlabs.com/goat-anti-rabbit-igg.html",
        notes: "",
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
    requester: "Dr. Bob Johnson",
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
      },
    ],
    projectCodes: ["p2"],
  },
  {
    id: "req3",
    vendorId: "v1",
    requester: "Dr. Alice Smith",
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
      },
    ],
    projectCodes: ["p1", "p3"],
  },
  {
    id: "req4",
    vendorId: "v3",
    requester: "Dr. Carol White",
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
      },
    ],
    projectCodes: ["p4"],
  },
  {
    id: "req5",
    vendorId: "v1",
    requester: "Dr. Bob Johnson",
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
      },
    ],
    projectCodes: ["p2"],
  },
];

// Functions to modify mock data (simulating API calls)
export const addRequest = (newRequest: Omit<LabRequest, "id" | "status" | "date" | "requester">) => {
  const id = `req${mockRequests.length + 1}`;
  const date = new Date().toISOString().slice(0, 10); // Current date
  const requester = "Current User"; // Placeholder for logged-in user
  const status = "Pending"; // Default status for new requests

  const requestToAdd: LabRequest = {
    id,
    date,
    requester,
    status,
    ...newRequest,
    items: newRequest.items.map((item, index) => ({
      ...item,
      id: `item${mockRequests.length + 1}-${index + 1}`,
    })),
  };
  mockRequests.push(requestToAdd);
  return requestToAdd;
};

export const updateRequestStatus = (requestId: string, newStatus: RequestStatus) => {
  const requestIndex = mockRequests.findIndex(req => req.id === requestId);
  if (requestIndex > -1) {
    mockRequests[requestIndex].status = newStatus;
    return mockRequests[requestIndex];
  }
  return null;
};

export const addVendor = (newVendor: Omit<Vendor, "id">) => {
  const id = `v${mockVendors.length + 1}`;
  const vendorToAdd: Vendor = { id, ...newVendor };
  mockVendors.push(vendorToAdd);
  return vendorToAdd;
};

export const updateVendor = (vendorId: string, updatedData: Partial<Vendor>) => {
  const vendorIndex = mockVendors.findIndex(v => v.id === vendorId);
  if (vendorIndex > -1) {
    mockVendors[vendorIndex] = { ...mockVendors[vendorIndex], ...updatedData };
    return mockVendors[vendorIndex];
  }
  return null;
};

export const deleteVendor = (vendorId: string) => {
  const initialLength = mockVendors.length;
  mockVendors = mockVendors.filter(v => v.id !== vendorId);
  return mockVendors.length < initialLength; // True if a vendor was removed
};