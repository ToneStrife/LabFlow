// src/data/storage.ts

import { Profile, Vendor, CustomerAccount, SupabaseRequest, SupabaseRequestItem, ProductDetails, InventoryItem } from "./types";

// Helper to generate unique IDs
export const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// --- Mock Data for Autofill Feature ---
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