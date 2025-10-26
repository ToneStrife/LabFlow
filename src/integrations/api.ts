import { supabase } from "./supabase/client"; // Importar cliente de Supabase
import {
  Profile,
  Vendor,
  AccountManager, // Importar el nuevo tipo AccountManager
  Project, // Importar el nuevo tipo Project
  SupabaseRequest,
  RequestItem,
  RequestStatus,
  InventoryItem,
  MockEmail,
  ProductDetails, // Importar ProductDetails para la búsqueda externa
  EmailTemplate, // Importar el nuevo tipo EmailTemplate
} from "@/data/types";

// Mantener las importaciones de mock data para otras tablas hasta que se conviertan
import {
  // getMockRequests, // ELIMINADO
  addMockRequest,
  updateMockRequestStatus as mockUpdateStatus, // Renombrar para evitar conflictos
  updateMockRequestMetadata,
  deleteMockRequest,
  getMockInventory,
  addMockInventoryItem,
  updateMockInventoryItem,
  deleteMockInventoryItem,
  sendMockEmail,
} from "@/data/crud";


// --- API de Perfiles (Usuarios del sistema) ---
export const apiGetProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiUpdateProfile = async (id: string, data: Partial<Profile>): Promise<void> => {
  const { error } = await supabase.from('profiles').update(data).eq('id', id);
  if (error) throw new Error(error.message);
};

export const apiDeleteProfile = async (id: string): Promise<void> => {
  // Asegurarse de que la sesión esté fresca antes de invocar la función Edge
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !session) {
    console.error("Error refreshing session before deleting user:", refreshError);
    throw new Error("Failed to refresh session. Please log in again.");
  }

  const { data: edgeFunctionData, error } = await supabase.functions.invoke('delete-user', {
    body: JSON.stringify({ userIdToDelete: id }),
    method: 'POST',
  });

  if (error) {
    console.error("Error invoking delete-user edge function:", error);
    let errorMessage = 'Failed to delete user via Edge Function.';
    if (edgeFunctionData && typeof edgeFunctionData === 'object' && 'error' in edgeFunctionData) {
        errorMessage = (edgeFunctionData as any).error;
    } else if (error.message) {
        errorMessage = error.message;
    } else if (typeof edgeFunctionData === 'string') {
        errorMessage = edgeFunctionData;
    }
    if ((error as any).status) {
        errorMessage = `(Status: ${(error as any).status}) ${errorMessage}`;
    }
    throw new Error(errorMessage);
  }
  return edgeFunctionData;
};

interface InviteUserData {
  email: string;
  first_name?: string;
  last_name?: string;
  role?: Profile['role'];
}

export const apiInviteUser = async (data: InviteUserData): Promise<any> => {
  const { email, first_name, last_name, role } = data;
  
  const { data: edgeFunctionData, error } = await supabase.functions.invoke('invite-user', {
    body: JSON.stringify({ email, first_name, last_name, role }),
    method: 'POST',
  });

  if (error) {
    console.error("Error invoking invite-user edge function:", error);
    console.error("Edge function raw response data (on error):", edgeFunctionData); // Log raw data

    let errorMessage = 'Failed to invite user via Edge Function.';
    
    // Try to get a more specific error message from the edge function's response body
    if (edgeFunctionData && typeof edgeFunctionData === 'object' && 'error' in edgeFunctionData) {
        errorMessage = (edgeFunctionData as any).error;
    } else if (typeof edgeFunctionData === 'string') {
        // If the edge function returned a plain string error message
        errorMessage = edgeFunctionData;
    } else if (error.message) {
        // Fallback to the generic error message from supabase.functions.invoke
        errorMessage = error.message;
    }

    // Add status code if available from the invoke error object
    if ((error as any).status) {
        errorMessage = `(Status: ${(error as any).status}) ${errorMessage}`;
    }
    
    throw new Error(errorMessage);
  }
  return edgeFunctionData;
};


// --- API de Vendedores ---
export const apiGetVendors = async (): Promise<Vendor[]> => {
  const { data, error } = await supabase.from('vendors').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddVendor = async (data: Omit<Vendor, "id" | "created_at">): Promise<Vendor> => {
  const { data: newVendor, error } = await supabase.from('vendors').insert(data).select().single();
  if (error) throw new Error(error.message);
  return newVendor;
};

export const apiUpdateVendor = async (id: string, data: Partial<Omit<Vendor, "id" | "created_at">>): Promise<Vendor> => {
  const { data: updatedVendor, error } = await supabase.from('vendors').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedVendor;
};

export const apiDeleteVendor = async (id: string): Promise<void> => {
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Account Managers (Contactos, no usuarios del sistema) ---
export const apiGetAccountManagers = async (): Promise<AccountManager[]> => {
  const { data, error } = await supabase.from('account_managers').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddAccountManager = async (data: Omit<AccountManager, "id" | "created_at">): Promise<AccountManager> => {
  const { data: newManager, error } = await supabase.from('account_managers').insert(data).select().single();
  if (error) throw new Error(error.message);
  return newManager;
};

export const apiUpdateAccountManager = async (id: string, data: Partial<Omit<AccountManager, "id" | "created_at">>): Promise<AccountManager> => {
  const { data: updatedManager, error } = await supabase.from('account_managers').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedManager;
};

export const apiDeleteAccountManager = async (id: string): Promise<void> => {
  const { error } = await supabase.from('account_managers').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Proyectos ---
export const apiGetProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase.from('projects').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddProject = async (data: Omit<Project, "id" | "created_at">): Promise<Project> => {
  const { data: newProject, error } = await supabase.from('projects').insert(data).select().single();
  if (error) throw new Error(error.message);
  return newProject;
};

export const apiUpdateProject = async (id: string, data: Partial<Omit<Project, "id" | "created_at">>): Promise<Project> => {
  const { data: updatedProject, error } = await supabase.from('projects').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedProject;
};

export const apiDeleteProject = async (id: string): Promise<void> => {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Solicitudes (MIGRADO A SUPABASE REAL) ---
export const apiGetRequests = async (): Promise<SupabaseRequest[]> => {
  // Selecciona la solicitud y une los ítems relacionados
  const { data: requestsData, error: requestsError } = await supabase
    .from('requests')
    .select(`
      *,
      items:request_items (*),
      shipping_address:shipping_addresses (*),
      billing_address:billing_addresses (*)
    `)
    .order('created_at', { ascending: false });

  if (requestsError) {
    console.error("Error fetching requests from Supabase:", requestsError);
    throw new Error(requestsError.message);
  }

  // Mapear los datos para asegurar que 'items' es un array de SupabaseRequestItem
  const requests: SupabaseRequest[] = requestsData.map(req => ({
    ...req,
    items: req.items || [],
    // Asegurar que los campos de URL y PO sean strings o null
    quote_url: req.quote_url || null,
    po_number: req.po_number || null,
    po_url: req.po_url || null,
    slip_url: req.slip_url || null,
    project_codes: req.project_codes || null,
    notes: req.notes || null,
    account_manager_id: req.account_manager_id || null,
    shipping_address_id: req.shipping_address_id || null,
    billing_address_id: req.billing_address_id || null,
    // Nota: Los objetos de dirección se adjuntan aquí si se usan en el cliente,
    // pero por ahora solo necesitamos los IDs para la creación.
  })) as SupabaseRequest[];

  return requests;
};

interface AddRequestData {
  vendorId: string;
  requesterId: string;
  accountManagerId: string | null;
  shippingAddressId: string; // Nuevo
  billingAddressId: string; // Nuevo
  notes?: string | null;
  projectCodes?: string[] | null;
  items: RequestItem[];
}

export const apiAddRequest = async (data: AddRequestData): Promise<SupabaseRequest> => {
  // Usar la función RPC para manejar la inserción de la solicitud y sus ítems en una sola transacción
  const { vendorId, requesterId, accountManagerId, shippingAddressId, billingAddressId, notes, projectCodes, items } = data;

  const itemsJsonb = items.map(item => ({
    productName: item.productName,
    catalogNumber: item.catalogNumber,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    format: item.format,
    link: item.link,
    notes: item.notes,
    brand: item.brand,
  }));

  // Aseguramos que accountManagerId se pase como UUID o null. 
  const accountManagerIdUuid = (accountManagerId && accountManagerId.trim() !== '') ? accountManagerId : null;

  const { data: newRequest, error } = await supabase.rpc('create_request_with_items', {
    vendor_id_in: vendorId,
    account_manager_id_in: accountManagerIdUuid,
    shipping_address_id_in: shippingAddressId,
    billing_address_id_in: billingAddressId,
    notes_in: notes,
    project_codes_in: projectCodes,
    items_in: itemsJsonb,
  });

  if (error) {
    console.error("Error invoking create_request_with_items RPC:", error);
    throw new Error(error.message);
  }

  // El RPC devuelve un objeto JSONB que ya incluye los ítems
  return newRequest as SupabaseRequest;
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

  const { data: updatedRequest, error } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      items:request_items (*)
    `)
    .single();

  if (error) throw new Error(error.message);

  // Lógica de inventario: Mover artículos al inventario cuando se marcan como "Recibido"
  if (status === "Received" && updatedRequest.items) {
    try {
      for (const item of updatedRequest.items) {
        // Usar la función RPC para añadir o actualizar el inventario
        const { error: inventoryError } = await supabase.rpc('add_or_update_inventory_item', {
          product_name_in: item.product_name,
          catalog_number_in: item.catalog_number,
          brand_in: item.brand,
          quantity_in: item.quantity,
          unit_price_in: item.unit_price,
          format_in: item.format,
        });
        if (inventoryError) throw new Error(inventoryError.message);
      }
    } catch (inventoryError) {
      console.error("Error adding items to inventory via RPC:", inventoryError);
      throw new Error(`Failed to add items to inventory: ${inventoryError instanceof Error ? inventoryError.message : String(inventoryError)}`);
    }
  }

  return updatedRequest as SupabaseRequest;
};

// NUEVA FUNCIÓN: Actualización completa de los detalles de la solicitud (solo para estado Pending)
interface UpdateFullRequestData {
  vendorId: string;
  shippingAddressId: string;
  billingAddressId: string;
  accountManagerId: string | null;
  notes?: string | null;
  projectCodes?: string[] | null;
}

export const apiUpdateFullRequest = async (id: string, data: UpdateFullRequestData): Promise<SupabaseRequest> => {
  const updateData: Partial<SupabaseRequest> = {
    vendor_id: data.vendorId,
    shipping_address_id: data.shippingAddressId,
    billing_address_id: data.billingAddressId,
    account_manager_id: data.accountManagerId,
    notes: data.notes,
    project_codes: data.projectCodes,
  };

  const { data: updatedRequest, error } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      items:request_items (*)
    `)
    .single();

  if (error) throw new Error(error.message);
  return updatedRequest as SupabaseRequest;
};


export const apiUpdateRequestMetadata = async (
  id: string,
  data: {
    accountManagerId?: string | null;
    notes?: string | null;
    projectCodes?: string[] | null;
  }
): Promise<SupabaseRequest> => {
  const updateData: Partial<SupabaseRequest> = {};
  if (data.accountManagerId !== undefined) updateData.account_manager_id = data.accountManagerId;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.projectCodes !== undefined) updateData.project_codes = data.projectCodes;

  const { data: updatedRequest, error } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      items:request_items (*)
    `)
    .single();

  if (error) throw new Error(error.message);
  return updatedRequest as SupabaseRequest;
};

// ACTUALIZADO: apiUpdateRequestFile para usar la función Edge
export const apiUpdateRequestFile = async (
  id: string,
  fileType: "quote" | "po" | "slip",
  file: File, // Ahora acepta un objeto File real
  poNumber: string | null = null
): Promise<{ fileUrl: string; poNumber: string | null }> => {
  // Asegurarse de que la sesión esté fresca antes de invocar la función Edge
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !session) {
    console.error("Error refreshing session before uploading file:", refreshError);
    throw new Error("Failed to refresh session. Please log in again.");
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);
  formData.append('requestId', id);
  if (poNumber) {
    formData.append('poNumber', poNumber);
  }

  const { data: edgeFunctionData, error } = await supabase.functions.invoke('upload-file', {
    body: formData,
    method: 'POST',
    headers: {
      // No Content-Type header needed for FormData, browser sets it automatically
    },
  });

  if (error) {
    console.error("Error invoking upload-file edge function:", error);
    let errorMessage = 'Failed to upload file via Edge Function.';
    if (edgeFunctionData && typeof edgeFunctionData === 'object' && 'error' in edgeFunctionData) {
        errorMessage = (edgeFunctionData as any).error;
    } else if (error.message) {
        errorMessage = error.message;
    } else if (typeof edgeFunctionData === 'string') {
        errorMessage = edgeFunctionData;
    }
    if ((error as any).status) {
        errorMessage = `(Status: ${(error as any).status}) ${errorMessage}`;
    }
    throw new Error(errorMessage);
  }
  
  // La función Edge devuelve { fileUrl: string, poNumber: string | null }
  const { fileUrl, poNumber: returnedPoNumber } = edgeFunctionData as { fileUrl: string; poNumber: string | null };

  // Paso adicional: Actualizar la URL del archivo en la tabla 'requests'
  const updateField = fileType === 'quote' ? 'quote_url' : fileType === 'po' ? 'po_url' : 'slip_url';
  const updateData: Partial<SupabaseRequest> = { [updateField]: fileUrl };
  if (fileType === 'po' && returnedPoNumber) {
    updateData.po_number = returnedPoNumber;
  }

  const { error: dbUpdateError } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', id);

  if (dbUpdateError) {
    console.error(`Error updating request DB with ${fileType} URL:`, dbUpdateError);
    throw new Error(`File uploaded, but failed to update database record: ${dbUpdateError.message}`);
  }

  return { fileUrl, poNumber: returnedPoNumber };
};

export const apiDeleteRequest = async (id: string): Promise<void> => {
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Inventario (usando mock data por ahora) ---
export const apiGetInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase.from('inventory').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddInventoryItem = async (data: Omit<InventoryItem, "id" | "added_at" | "last_updated">): Promise<InventoryItem> => {
  const { data: newItem, error } = await supabase.rpc('add_or_update_inventory_item', {
    product_name_in: data.product_name,
    catalog_number_in: data.catalog_number,
    brand_in: data.brand,
    quantity_in: data.quantity,
    unit_price_in: data.unit_price,
    format_in: data.format,
  }).single();
  if (error) throw new Error(error.message);
  return newItem;
};

export const apiUpdateInventoryItem = async (id: string, data: Partial<Omit<InventoryItem, "id" | "added_at">>): Promise<InventoryItem> => {
  const { data: updatedItem, error } = await supabase.from('inventory').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedItem;
};

export const apiDeleteInventoryItem = async (id: string): Promise<void> => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Envío de Correo Electrónico (REAL) ---
interface EmailData {
  to: string;
  subject: string;
  body: string;
  attachments?: { name: string; url: string }[];
}

export const apiSendEmail = async (email: EmailData): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: JSON.stringify(email),
    method: 'POST',
  });

  if (error) {
    console.error("Error invoking send-email edge function:", error);
    let errorMessage = 'Failed to send email via Edge Function.';
    if (data && typeof data === 'object' && 'error' in data) {
        errorMessage = (data as any).error;
    } else if (error.message) {
        errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
  
  return data;
};

// --- API de Plantillas de Correo Electrónico ---
export const apiGetEmailTemplates = async (): Promise<EmailTemplate[]> => {
  const { data, error } = await supabase.from('email_templates').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddEmailTemplate = async (data: Omit<EmailTemplate, "id" | "created_at">): Promise<EmailTemplate> => {
  const { data: newTemplate, error } = await supabase.from('email_templates').insert(data).select().single();
  if (error) throw new Error(error.message);
  return newTemplate;
};

export const apiUpdateEmailTemplate = async (id: string, data: Partial<Omit<EmailTemplate, "id" | "created_at">>): Promise<EmailTemplate> => {
  const { data: updatedTemplate, error } = await supabase.from('email_templates').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedTemplate;
};

export const apiDeleteEmailTemplate = async (id: string): Promise<void> => {
  const { error } = await supabase.from('email_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
};