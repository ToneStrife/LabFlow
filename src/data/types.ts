// src/data/types.ts

export type RequestStatus = "Pending" | "Quote Requested" | "PO Requested" | "Ordered" | "Received";

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

  // AI-enriched fields
  ai_enriched_product_name?: string;
  ai_enriched_pack_size?: string;
  ai_enriched_estimated_price?: number;
  ai_enriched_link?: string;
  ai_enriched_notes?: string;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
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

export interface AccountManager {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Project {
  id: string;
  created_at: string;
  name: string;
  code: string;
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
  requester_id: string; // Still references auth.users.id via profiles
  account_manager_id: string | null; // Now references public.account_managers.id
  status: RequestStatus;
  notes: string | null;
  project_codes: string[] | null; // Still string[] but values are public.projects.id
  items: SupabaseRequestItem[] | null;
  po_number: string | null;
  quote_url: string | null;
  po_url: string | null;
  slip_url: string | null;
}

export interface ProductDetails {
  id: string;
  productName: string;
  catalogNumber: string;
  unitPrice?: number;
  format?: string;
  link?: string;
  brand: string;
  source?: string; // Added source field
}

export interface InventoryItem {
  id: string;
  product_name: string;
  catalog_number: string;
  brand: string | null;
  quantity: number;
  unit_price: number | null;
  format: string | null;
  added_at: string;
  last_updated: string;
}

export interface MockEmail {
  to: string;
  subject: string;
  body: string;
  attachments?: { name: string; url: string }[];
}