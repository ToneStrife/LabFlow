import { createClient } from "./client";
import { Profile, Vendor, CustomerAccount, SupabaseRequest, RequestItem, RequestStatus, InventoryItem, MockEmail } from "@/data/types";

const supabase = createClient();

// --- Helper to handle Supabase response ---
const handleResponse = (response: any) => {
  if (response.error) {
    console.error("Supabase Error:", response.error);
    throw new Error(response.error.message || "An unknown Supabase error occurred.");
  }
  return response.data;
};

// --- Profiles API ---

export const apiGetProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*");
  return handleResponse({ data, error });
};

export const apiAddProfile = async (data: Omit<Profile, "id" | "updated_at" | "avatar_url">): Promise<Profile> => {
  // Note: Adding profiles directly via API is usually reserved for Admin/Service roles.
  // For user signup, the trigger handles this. This function is mainly for mock compatibility.
  const { data: [newProfile], error } = await supabase
    .from("profiles")
    .insert([{ ...data, id: data.id }]) // Assuming ID is passed for mock compatibility
    .select()
    .single();
  return handleResponse({ data: newProfile, error });
};

export const apiUpdateProfile = async (id: string, data: Partial<Profile>): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", id);
  handleResponse({ error });
};

export const apiDeleteProfile = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id);
  handleResponse({ error });
};

// --- Vendors API ---

export const apiGetVendors = async (): Promise<Vendor[]> => {
  const { data, error } = await supabase
    .from("vendors")
    .select("*");
  return handleResponse({ data, error });
};

export const apiAddVendor = async (data: Omit<Vendor, "id" | "created_at">): Promise<Vendor> => {
  const { data: [newVendor], error } = await supabase
    .from("vendors")
    .insert([data])
    .select()
    .single();
  return handleResponse({ data: newVendor, error });
};

export const apiUpdateVendor = async (id: string, data: Partial<Omit<Vendor, "id" | "created_at">>): Promise<Vendor> => {
  const { data: [updatedVendor], error } = await supabase
    .from("vendors")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return handleResponse({ data: updatedVendor, error });
};

export const apiDeleteVendor = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("vendors")
    .delete()
    .eq("id", id);
  handleResponse({ error });
};

// --- Customer Accounts API ---

export const apiGetCustomerAccounts = async (): Promise<CustomerAccount[]> => {
  const { data, error } = await supabase
    .from("customer_accounts")
    .select("*");
  return handleResponse({ data, error });
};

export const apiAddCustomerAccount = async (data: Omit<CustomerAccount, "id" | "created_at">): Promise<CustomerAccount> => {
  const { data: [newAccount], error } = await supabase
    .from("customer_accounts")
    .insert([data])
    .select()
    .single();
  return handleResponse({ data: newAccount, error });
};

export const apiUpdateCustomerAccount = async (id: string, data: Partial<Omit<CustomerAccount, "id" | "created_at">>): Promise<CustomerAccount> => {
  const { data: [updatedAccount], error } = await supabase
    .from("customer_accounts")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return handleResponse({ data: updatedAccount, error });
};

export const apiDeleteCustomerAccount = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("customer_accounts")
    .delete()
    .eq("id", id);
  handleResponse({ error });
};

// --- Requests API ---

export const apiGetRequests = async (): Promise<SupabaseRequest[]> => {
  // Fetch requests and join items
  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      items:request_items (*)
    `)
    .order('created_at', { ascending: false });
  
  // Map items array to the expected structure (Supabase returns items as an array of objects)
  const requests = handleResponse({ data, error });
  return requests.map((req: any) => ({
    ...req,
    items: req.items || [],
  }));
};

export const apiAddRequest = async (data: Omit<SupabaseRequest, "id" | "created_at" | "status" | "items" | "po_number" | "quote_url" | "po_url" | "slip_url"> & { items: RequestItem[] }): Promise<SupabaseRequest> => {
  const { items, ...requestData } = data;

  // 1. Insert Request
  const { data: [newRequest], error: requestError } = await supabase
    .from("requests")
    .insert([requestData])
    .select()
    .single();
  
  handleResponse({ data: newRequest, error: requestError });

  if (!newRequest) throw new Error("Failed to create request.");

  // 2. Insert Items
  const itemsToInsert = items.map(item => ({
    request_id: newRequest.id,
    product_name: item.productName,
    catalog_number: item.catalogNumber,
    quantity: item.quantity,
    unit_price: item.unitPrice || null,
    format: item.format || null,
    link: item.link || null,
    notes: item.notes || null,
    brand: item.brand || null,
  }));

  const { data: newItems, error: itemsError } = await supabase
    .from("request_items")
    .insert(itemsToInsert)
    .select();

  handleResponse({ data: newItems, error: itemsError });

  return { ...newRequest, items: newItems || [] };
};

export const apiUpdateRequestStatus = async (
  id: string,
  status: RequestStatus,
  quoteUrl: string | null = null,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  const updateData: Partial<SupabaseRequest> = { status };
  if (quoteUrl !== null) updateData.quote_url = quoteUrl;
  if (poNumber !== null) updateData.po_number = poNumber;

  const { data: [updatedRequest], error } = await supabase
    .from("requests")
    .update(updateData)
    .eq("id", id)
    .select(`
      *,
      items:request_items (*)
    `)
    .single();

  if (error) handleResponse({ error });

  // If status changes to "Ordered", we need to handle inventory update in the hook (useUpdateRequestStatus)
  
  return { ...updatedRequest, items: updatedRequest.items || [] };
};

export const apiUpdateRequestMetadata = async (
  id: string,
  data: {
    accountManagerId?: string | null;
    notes?: string | null;
    projectCodes?: string[] | null;
  }
): Promise<SupabaseRequest> => {
  const updateData: any = {};
  if (data.accountManagerId !== undefined) updateData.account_manager_id = data.accountManagerId;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.projectCodes !== undefined) updateData.project_codes = data.projectCodes;

  const { data: [updatedRequest], error } = await supabase
    .from("requests")
    .update(updateData)
    .eq("id", id)
    .select(`
      *,
      items:request_items (*)
    `)
    .single();

  return handleResponse({ data: updatedRequest, error });
};

export const apiUpdateRequestFile = async (
  id: string,
  fileType: "quote" | "po" | "slip",
  fileUrl: string,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  const updateData: Partial<SupabaseRequest> = {};
  
  switch (fileType) {
    case "quote":
      updateData.quote_url = fileUrl;
      break;
    case "po":
      updateData.po_url = fileUrl;
      if (poNumber) updateData.po_number = poNumber;
      break;
    case "slip":
      updateData.slip_url = fileUrl;
      break;
  }

  const { data: [updatedRequest], error } = await supabase
    .from("requests")
    .update(updateData)
    .eq("id", id)
    .select(`
      *,
      items:request_items (*)
    `)
    .single();

  return handleResponse({ data: updatedRequest, error });
};

export const apiDeleteRequest = async (id: string): Promise<void> => {
  // Deleting the request should cascade delete request_items due to foreign key constraint
  const { error } = await supabase
    .from("requests")
    .delete()
    .eq("id", id);
  handleResponse({ error });
};

// --- Inventory API ---

export const apiGetInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from("inventory")
    .select("*");
  return handleResponse({ data, error });
};

export const apiAddInventoryItem = async (data: Omit<InventoryItem, "id" | "added_at" | "last_updated">): Promise<InventoryItem> => {
  // This logic should ideally be handled by a database function to ensure atomicity and check for existing items.
  // For now, we insert directly. If we need to check for existing items, we'd need a more complex query/function.
  const { data: [newItem], error } = await supabase
    .from("inventory")
    .insert([data])
    .select()
    .single();
  return handleResponse({ data: newItem, error });
};

export const apiUpdateInventoryItem = async (id: string, data: Partial<Omit<InventoryItem, "id" | "added_at">>): Promise<InventoryItem> => {
  const { data: [updatedItem], error } = await supabase
    .from("inventory")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return handleResponse({ data: updatedItem, error });
};

export const apiDeleteInventoryItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("id", id);
  handleResponse({ error });
};

// --- Email API ---
// NOTE: This should ideally use a Supabase Edge Function or a dedicated email service.
// Since we are replacing the mock, we will keep the mock implementation here for now, 
// but log a warning that this needs a real backend implementation.

export const apiSendEmail = async (email: MockEmail): Promise<void> => {
  console.warn("--- WARNING: EMAIL SENDING IS STILL MOCKED ---");
  console.log("To:", email.to);
  console.log("Subject:", email.subject);
  console.log("Body:", email.body);
  if (email.attachments && email.attachments.length > 0) {
    console.log("Attachments:", email.attachments.map(a => a.name).join(", "));
  }
  console.log("---------------------------------------------");
  // In a real app, this would call an Edge Function:
  // const { data, error } = await supabase.functions.invoke('send-email', { body: email });
  // handleResponse({ data, error });
};