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

export interface EmailTemplate {
  id: string;
  template_name: string;
  subject_template: string;
  body_template: string;
  created_at: string;
}

export interface Address {
  id: string;
  created_at: string;
  name: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  cif: string | null; // Nuevo campo CIF
}

export interface ShippingAddress extends Address {}
export interface BillingAddress extends Address {}

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

export interface PackingSlip {
  id: string;
  request_id: string;
  slip_number: string;
  received_by: string | null; // auth.users.id
  received_at: string;
  slip_url: string | null;
}

export interface ReceivedItem {
  id: string;
  slip_id: string;
  request_item_id: string;
  quantity_received: number;
  received_at: string;
}

export interface SupabaseRequest {
  id: string;
  request_number: string | null; // Nuevo campo para el número de solicitud legible
  created_at: string;
  vendor_id: string;
  requester_id: string; // Still references auth.users.id via profiles
  account_manager_id: string | null; // Now references public.account_managers.id
  shipping_address_id: string | null; // Nuevo campo
  billing_address_id: string | null; // Nuevo campo
  status: RequestStatus;
  notes: string | null;
  project_codes: string[] | null; // Still string[] but values are public.projects.id
  items: SupabaseRequestItem[] | null;
  po_number: string | null;
  quote_url: string | null;
  po_url: string | null;
  slip_url: string | null; // Este campo se mantiene para el último albarán subido, pero la lógica de recepción usará la tabla packing_slips
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