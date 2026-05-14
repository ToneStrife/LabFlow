// src/data/types.ts

export type RequestStatus = "Pending" | "Quote Requested" | "PO Requested" | "Ordered" | "Received" | "Denied" | "Cancelled";

export interface RequestItem {
  id?: string;
  productName: string;
  catalogNumber: string;
  quantity: number;
  unitPrice?: number;
  format?: string;
  link?: string;
  notes?: string;
  brand?: string;

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
  
  // Preferencias de Notificación
  notify_on_status_change: boolean;
  notify_on_new_request: boolean;
}

export interface UserNotificationPreferences {
  user_id: string;
  notified_statuses: RequestStatus[];
  created_at: string;
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
  cif: string | null;
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
  received_by: string | null;
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

// --- NUEVAS INTERFACES PARA FACTURACIÓN ---
export interface Invoice {
  id: string;
  request_id: string;
  invoice_number: string;
  invoiced_by: string | null;
  invoiced_at: string;
  invoice_url: string | null;
}

export interface InvoicedItem {
  id: string;
  invoice_id: string;
  request_item_id: string;
  quantity_invoiced: number;
  invoiced_at: string;
}

export interface SupabaseRequest {
  id: string;
  request_number: string | null;
  created_at: string;
  vendor_id: string;
  requester_id: string;
  account_manager_id: string | null;
  shipping_address_id: string | null;
  billing_address_id: string | null;
  status: RequestStatus;
  notes: string | null;
  project_codes: string[] | null;
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
  source?: string;
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

export interface Expenditure {
  id: string;
  created_at: string;
  project_id: string;
  amount: number;
  description: string;
  date_incurred: string;
  request_id: string | null;
}

export interface EmailLog {
  id: string;
  created_at: string;
  to_email: string;
  subject: string;
  body_preview: string | null;
  status: 'success' | 'failed';
  error_message: string | null;
  sent_by: string | null;
  sent_by_name?: string;
}