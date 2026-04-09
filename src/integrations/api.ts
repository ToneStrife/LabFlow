import { supabase } from "./supabase/client"; // Importar cliente de Supabase
import {
  Profile,
  Vendor,
  AccountManager, 
  Project, 
  SupabaseRequest,
  RequestItem,
  RequestStatus,
  InventoryItem,
  MockEmail,
  ProductDetails, 
  EmailTemplate, 
  Expenditure, 
  UserNotificationPreferences, 
  SupabaseRequestItem, 
} from "@/data/types";

// Mantener las importaciones de mock data para otras tablas hasta que se conviertan
import {
  addMockRequest,
  updateMockRequestStatus as mockUpdateStatus, 
  updateMockRequestMetadata,
  deleteMockRequest,
  getMockInventory,
  addMockInventoryItem as mockAddInventoryItem, 
  updateMockInventoryItem,
  deleteMockInventoryItem,
  sendMockEmail,
} from "@/data/crud";
import { InventoryItemFormData } from "@/hooks/use-inventory"; 

// --- Tipos de datos para la búsqueda ---
interface FuzzySearchResult {
  inv: InventoryItem[];
  req: SupabaseRequestItem[];
}

// --- API de Búsqueda de Productos ---

export const apiFuzzySearchInternal = async (searchTerm: string): Promise<FuzzySearchResult> => {
  const [inventoryResult, requestItemsResult] = await Promise.all([
    supabase.rpc('search_inventory', { search_term: searchTerm }),
    supabase.rpc('search_request_items', { search_term: searchTerm }),
  ]);

  if (inventoryResult.error) {
    console.error("Error searching inventory:", inventoryResult.error);
    throw new Error(inventoryResult.error.message);
  }
  if (requestItemsResult.error) {
    console.error("Error searching request items:", requestItemsResult.error);
    throw new Error(requestItemsResult.error.message);
  }

  return {
    inv: inventoryResult.data as InventoryItem[],
    req: requestItemsResult.data as SupabaseRequestItem[],
  };
};


// --- API de Perfiles (Usuarios del sistema) ---
export const apiGetProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, email, avatar_url, updated_at, role, notify_on_status_change, notify_on_new_request');
  if (error) throw new Error(error.message);
  return data as Profile[];
};

export const apiUpdateProfile = async (id: string, data: Partial<Profile>): Promise<void> => {
  const { error } = await supabase.from('profiles').update(data).eq('id', id);
  if (error) throw new Error(error.message);
};

export const apiDeleteProfile = async (id: string): Promise<void> => {
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !session) {
    throw new Error("Failed to refresh session. Please log in again.");
  }

  const { data: edgeFunctionData, error } = await supabase.functions.invoke('delete-user', {
    body: JSON.stringify({ userIdToDelete: id }),
    method: 'POST',
  });

  if (error) {
    let errorMessage = 'Failed to delete user via Edge Function.';
    if (edgeFunctionData && typeof edgeFunctionData === 'object' && 'error' in edgeFunctionData) {
        errorMessage = (edgeFunctionData as any).error;
    } else if (error.message) {
        errorMessage = error.message;
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
  
  // Construir la URL de redirección compatible con HashRouter y GitHub Pages
  // Esto asegura que el enlace lleve a https://.../LabFlow/#/login o similar
  const origin = window.location.origin;
  const path = window.location.pathname.split('/')[1]; // Captura 'LabFlow' si existe
  const redirectTo = path 
    ? `${origin}/${path}/#/dashboard` 
    : `${origin}/#/dashboard`;

  const { data: edgeFunctionData, error } = await supabase.functions.invoke('invite-user', {
    body: JSON.stringify({ email, first_name, last_name, role, redirectTo }),
    method: 'POST',
  });

  if (error) {
    let errorMessage = 'Failed to invite user via Edge Function.';
    if (edgeFunctionData && typeof edgeFunctionData === 'object' && 'error' in edgeFunctionData) {
        errorMessage = (edgeFunctionData as any).error;
    } else if (error.message) {
        errorMessage = error.message;
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
  const { data: newVendor, error } = await supabase
        .from('vendors')
        .insert([{
          name: data.name,
          contact_person: data.contact_person,
          email: data.email,
          phone: data.phone,
          notes: data.notes,
          brands: data.brands,
        }])
        .select()
        .single();
  if (error) throw new Error(error.message);
  return newVendor as Vendor;
};

export const apiUpdateVendor = async (id: string, data: Partial<Omit<Vendor, "id" | "created_at">>): Promise<Vendor> => {
  const { data: updatedVendor, error } = await supabase
        .from('vendors')
        .update({
          name: data.name,
          contact_person: data.contact_person,
          email: data.email,
          phone: data.phone,
          notes: data.notes,
          brands: data.brands,
        })
        .eq('id', id)
        .select()
        .single();
  if (error) throw new Error(error.message);
  return updatedVendor as Vendor;
};

export const apiDeleteVendor = async (id: string): Promise<void> => {
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Account Managers ---
export const apiGetAccountManagers = async (): Promise<AccountManager[]> => {
  const { data, error } = await supabase.from('account_managers').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddAccountManager = async (data: Omit<AccountManager, "id" | "created_at">): Promise<AccountManager> => {
  const { data: newManager, error } = await supabase.from('account_managers').insert(data).select().single();
  if (error) throw new Error(error.message);
  return newManager as AccountManager;
};

export const apiUpdateAccountManager = async (id: string, data: Partial<Omit<AccountManager, "id" | "created_at">>): Promise<AccountManager> => {
  const { data: updatedManager, error } = await supabase.from('account_managers').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedManager as AccountManager;
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
  return newProject as Project;
};

export const apiUpdateProject = async (id: string, data: Partial<Omit<Project, "id" | "created_at">>): Promise<Project> => {
  const { data: updatedProject, error } = await supabase.from('projects').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedProject as Project;
};

export const apiDeleteProject = async (id: string): Promise<void> => {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Solicitudes ---
export const apiGetRequests = async (): Promise<SupabaseRequest[]> => {
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
    throw new Error(requestsError.message);
  }

  const requests: SupabaseRequest[] = requestsData.map(req => ({
    ...req,
    items: req.items || null,
    quote_url: req.quote_url || null,
    po_number: req.po_number || null,
    po_url: req.po_url || null,
    slip_url: req.slip_url || null,
    project_codes: req.project_codes || null,
    notes: req.notes || null,
    account_manager_id: req.account_manager_id || null,
    shipping_address_id: req.shipping_address_id || null,
    billing_address_id: req.billing_address_id || null,
    request_number: req.request_number || null,
  })) as SupabaseRequest[];

  return requests;
};

interface AddRequestData {
  vendorId: string;
  requesterId: string;
  accountManagerId: string | null;
  shippingAddressId: string; 
  billingAddressId: string; 
  notes?: string | null;
  projectCodes?: string[] | null;
  items: RequestItem[];
}

const getNotificationRecipients = async (preferenceField: keyof Profile, roles: Profile['role'][] = ['Admin']): Promise<Profile[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select(`id, first_name, last_name, role, ${preferenceField}`)
        .in('role', roles)
        .eq(preferenceField, true);

    if (error) {
        console.error(`Error fetching profiles for notification preference ${preferenceField}:`, error);
        return [];
    }
    return data as Profile[] || [];
};

const getRequesterProfile = async (requesterId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', requesterId)
        .single();
    if (error) {
        return null;
    }
    return data as Profile;
};


export const apiAddRequest = async (data: AddRequestData): Promise<SupabaseRequest> => {
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
    throw new Error(error.message);
  }

  try {
    const recipients = await getNotificationRecipients('notify_on_new_request', ['Admin', 'Account Manager']);
    const recipientIds = recipients.map(m => m.id);
    const requester = await getRequesterProfile(requesterId);
    const requesterName = requester ? `${requester.first_name || ''} ${requester.last_name || ''}`.trim() : 'Unkown Requester';
    const requestNumber = (newRequest as SupabaseRequest).request_number || (newRequest as SupabaseRequest).id.substring(0, 8);
    
    if (recipientIds.length > 0) {
        await supabase.functions.invoke('send-notification', {
            method: 'POST',
            body: JSON.stringify({
                user_ids: recipientIds,
                title: `🔔 Nueva Solicitud #${requestNumber}`,
                body: `El usuario ${requesterName} ha enviado una nueva solicitud pendiente.`,
                link: `/requests/${(newRequest as SupabaseRequest).id}`,
            }),
        });
    }
  } catch (e) {
    console.error("Failed to send notification for new request:", e);
  }

  return newRequest as SupabaseRequest;
};

const getUserStatusPreferences = async (userId: string): Promise<RequestStatus[]> => {
    const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('notified_statuses')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        return [];
    }
    return data?.notified_statuses || [];
};


export const apiUpdateRequestStatus = async (
  id: string,
  status: RequestStatus,
  quoteUrl: string | null = null,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  
  const { data: oldRequest, error: fetchError } = await supabase
    .from('requests')
    .select('status, requester_id, account_manager_id, request_number')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  
  const oldStatus = oldRequest.status;
  const requesterId = oldRequest.requester_id;
  const accountManagerId = oldRequest.account_manager_id;
  const requestNumber = oldRequest.request_number || id.substring(0, 8);

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

  if (oldStatus !== status) {
    try {
      const allProfiles = await apiGetProfiles();
      let targetUserIds: string[] = [];
      let title: string;
      let body: string;
      const link = `/requests/${id}`;

      const requesterProfile = allProfiles.find(p => p.id === requesterId);
      if (requesterProfile?.notify_on_status_change) {
          const preferredStatuses = await getUserStatusPreferences(requesterId);
          if (preferredStatuses.includes(status)) {
              targetUserIds.push(requesterId);
          }
      }
      
      if (accountManagerId) {
          const managerProfile = allProfiles.find(p => p.id === accountManagerId);
          if (managerProfile?.notify_on_status_change) {
              const preferredStatuses = await getUserStatusPreferences(accountManagerId);
              if (preferredStatuses.includes(status)) {
                  targetUserIds.push(accountManagerId);
              }
          }
      }
      
      switch (status) {
        case 'Quote Requested':
            title = `✅ Solicitud #${requestNumber} Aprobada`;
            body = `Tu solicitud ha sido aprobada y se ha solicitado una cotización.`;
            break;
        case 'PO Requested':
            title = `📝 Cotización Recibida para #${requestNumber}`;
            body = `La cotización ha sido recibida. Se requiere la emisión de una Orden de Compra (PO).`;
            break;
        case 'Ordered':
            title = `📦 Solicitud #${requestNumber} Pedida`;
            body = `Tu solicitud ha sido marcada como 'Pedido'. Esperando la recepción.`;
            break;
        case 'Received':
            title = `🎉 Solicitud #${requestNumber} Recibida`;
            body = `Los artículos de tu solicitud han sido recibidos y añadidos al inventario.`;
            break;
        case 'Denied':
            title = `❌ Solicitud #${requestNumber} Denegada`;
            body = `Tu solicitud ha sido denegada. Revisa los detalles para más información.`;
            break;
        case 'Cancelled':
            title = `🚫 Solicitud #${requestNumber} Cancelada`;
            body = `Tu solicitud ha sido cancelada.`;
            break;
        default:
            title = `Cambio de Estado en Solicitud #${requestNumber}`;
            body = `El estado ha cambiado a ${status}.`;
            break;
      }
      
      if (targetUserIds.length > 0) {
          const uniqueTargetIds = Array.from(new Set(targetUserIds));
          await supabase.functions.invoke('send-notification', {
              method: 'POST',
              body: JSON.stringify({
                  user_ids: uniqueTargetIds,
                  title: title,
                  body: body,
                  link: link,
              }),
          });
      }
    } catch (e) {
      console.error("Failed to send notification for status change:", e);
    }
  }

  return updatedRequest as SupabaseRequest;
};

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

export const apiUpdateRequestFile = async (
  id: string,
  fileType: "quote" | "po" | "slip",
  file: File | null, 
  poNumber: string | null = null
): Promise<{ filePath: string | null; poNumber: string | null }> => {
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !session) {
    throw new Error("Failed to refresh session. Please log in again.");
  }

  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  formData.append('fileType', fileType);
  formData.append('requestId', id);
  if (poNumber) {
    formData.append('poNumber', poNumber);
  }

  const { data: edgeFunctionData, error } = await supabase.functions.invoke('upload-file', {
    body: formData,
    method: 'POST',
  });

  if (error) {
    let errorMessage = 'Fallo al subir archivo via Edge Function.';
    if (edgeFunctionData && typeof edgeFunctionData === 'object' && 'error' in edgeFunctionData) {
        errorMessage = (edgeFunctionData as any).error;
    } else if (error.message) {
        errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
  
  const { filePath, poNumber: returnedPoNumber } = edgeFunctionData as { filePath: string | null; poNumber: string | null };

  const updateData: Partial<SupabaseRequest> = {};
  if (filePath) {
    if (fileType === 'quote') {
      updateData.quote_url = filePath;
    } else if (fileType === 'po') {
      updateData.po_url = filePath;
    } else if (fileType === 'slip') {
      updateData.slip_url = filePath;
    }
  }

  if (fileType === 'po' && returnedPoNumber) {
    updateData.po_number = returnedPoNumber;
  }
  
  if (Object.keys(updateData).length === 0) {
      return { filePath: filePath, poNumber: returnedPoNumber };
  }

  const { error: dbUpdateError } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', id);

  if (dbUpdateError) {
    throw new Error(`File uploaded, but failed to update database: ${dbUpdateError.message}`);
  }

  return { filePath: filePath, poNumber: returnedPoNumber };
};

export const apiDeleteRequest = async (id: string): Promise<void> => {
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

export const apiRevertRequestReception = async (requestId: string): Promise<void> => {
  const { error } = await supabase.rpc('revert_request_reception', { request_id_in: requestId });
  if (error) {
    throw new Error(error.message);
  }
};


// --- API de Inventario ---
export const apiGetInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase.from('inventory').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddInventoryItem = async (data: InventoryItemFormData): Promise<InventoryItem> => {
  const { data: newItem, error } = await supabase.rpc('add_or_update_inventory_item', {
    product_name_in: data.product_name,
    catalog_number_in: data.catalog_number,
    brand_in: data.brand || null, 
    quantity_in: data.quantity,
    unit_price_in: data.unit_price || null, 
    format_in: data.format || null, 
  }).single();
  if (error) throw new Error(error.message);
  return newItem as InventoryItem; 
};

export const apiUpdateInventoryItem = async (id: string, data: Partial<InventoryItemFormData>): Promise<InventoryItem> => {
  const { data: updatedItem, error } = await supabase.from('inventory').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedItem as InventoryItem;
};

export const apiDeleteInventoryItem = async (id: string): Promise<void> => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Gastos ---
export const apiGetExpenditures = async (): Promise<Expenditure[]> => {
  const { data, error } = await supabase.from('expenditures').select('*').order('date_incurred', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddExpenditure = async (data: Omit<Expenditure, "id" | "created_at">): Promise<Expenditure> => {
  const { data: newExpenditure, error } = await supabase.from('expenditures').insert(data).select().single();
  if (error) throw new Error(error.message);
  return newExpenditure as Expenditure;
};

export const apiUpdateExpenditure = async (id: string, data: Partial<Omit<Expenditure, "id" | "created_at">>): Promise<Expenditure> => {
  const { data: updatedExpenditure, error } = await supabase.from('expenditures').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedExpenditure as Expenditure;
};

export const apiDeleteExpenditure = async (id: string): Promise<void> => {
  const { error } = await supabase.from('expenditures').delete().eq('id', id);
  if (error) throw new Error(error.message);
};


// --- API de Envío de Correo Electrónico ---
interface EmailData {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  attachments?: { name: string; url: string }[]; 
}

export const apiSendEmail = async (email: EmailData): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: JSON.stringify(email),
    method: 'POST',
  });

  if (error) {
    let errorMessage = 'Fallo al enviar correo via Edge Function.';
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
  return newTemplate as EmailTemplate;
};

export const apiUpdateEmailTemplate = async (id: string, data: Partial<Omit<EmailTemplate, "id" | "created_at">>): Promise<EmailTemplate> => {
  const { data: updatedTemplate, error } = await supabase.from('email_templates').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedTemplate as EmailTemplate;
};

export const apiDeleteEmailTemplate = async (id: string): Promise<void> => {
  const { error } = await supabase.from('email_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
};