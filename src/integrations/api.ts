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
  Expenditure, // Importar Expenditure
  UserNotificationPreferences, // Importar la nueva interfaz
} from "@/data/types";

// Mantener las importaciones de mock data para otras tablas hasta que se conviertan
import {
  // getMockRequests, // ELIMINADO
  addMockRequest,
  updateMockRequestStatus as mockUpdateStatus, // Renombrar para evitar conflictos
  updateMockRequestMetadata,
  deleteMockRequest,
  getMockInventory,
  addMockInventoryItem as mockAddInventoryItem, // Renombrar para evitar conflictos
  updateMockInventoryItem,
  deleteMockInventoryItem,
  sendMockEmail,
  // NUEVAS IMPORTACIONES DE GASTOS (ELIMINADAS)
  // getMockExpenditures,
  // addMockExpenditure,
  // updateMockExpenditure,
  // deleteMockExpenditure,
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
// ... existing apiGetVendors
  const { data, error } = await supabase.from('vendors').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddVendor = async (data: Omit<Vendor, "id" | "created_at">): Promise<Vendor> => {
// ... existing apiAddVendor
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
  return newVendor;
};

export const apiUpdateVendor = async (id: string, data: Partial<Omit<Vendor, "id" | "created_at">>): Promise<Vendor> => {
// ... existing apiUpdateVendor
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
  return updatedVendor;
};

export const apiDeleteVendor = async (id: string): Promise<void> => {
// ... existing apiDeleteVendor
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Account Managers (Contactos, no usuarios del sistema) ---
export const apiGetAccountManagers = async (): Promise<AccountManager[]> => {
// ... existing apiGetAccountManagers
  const { data, error } = await supabase.from('account_managers').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddAccountManager = async (data: Omit<AccountManager, "id" | "created_at">): Promise<AccountManager> => {
// ... existing apiAddAccountManager
  const { data: newManager, error } = await supabase.from('account_managers').insert(data).select().single();
  if (error) throw new Error(error.message);
  return newManager;
};

export const apiUpdateAccountManager = async (id: string, data: Partial<Omit<AccountManager, "id" | "created_at">>): Promise<AccountManager> => {
// ... existing apiUpdateAccountManager
  const { data: updatedManager, error } = await supabase.from('account_managers').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedManager;
};

export const apiDeleteAccountManager = async (id: string): Promise<void> => {
// ... existing apiDeleteAccountManager
  const { error } = await supabase.from('account_managers').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Proyectos ---
export const apiGetProjects = async (): Promise<Project[]> => {
// ... existing apiGetProjects
  const { data, error } = await supabase.from('projects').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddProject = async (data: Omit<Project, "id" | "created_at">): Promise<Project> => {
// ... existing apiAddProject
  const { data: newProject, error } = await supabase.from('projects').insert(data).select().single();
  if (error) throw new Error(error.message);
  return newProject;
};

export const apiUpdateProject = async (id: string, data: Partial<Omit<Project, "id" | "created_at">>): Promise<Project> => {
// ... existing apiUpdateProject
  const { data: updatedProject, error } = await supabase.from('projects').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedProject;
};

export const apiDeleteProject = async (id: string): Promise<void> => {
// ... existing apiDeleteProject
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Solicitudes (MIGRADO A SUPABASE REAL) ---
export const apiGetRequests = async (): Promise<SupabaseRequest[]> => {
// ... existing apiGetRequests
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
    items: req.items || null, // Ensure it's SupabaseRequestItem[] | null
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
    request_number: req.request_number || null,
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

// Helper para obtener Lab Managers (Admins) que desean notificaciones de nuevas solicitudes
const getNotificationRecipients = async (preferenceField: keyof Profile, roles: Profile['role'][] = ['Admin']): Promise<Profile[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select(`id, first_name, last_name, role, ${preferenceField}`)
        .in('role', roles)
        .eq(preferenceField, true); // Filtrar por la preferencia activada

    if (error) {
        console.error(`Error fetching profiles for notification preference ${preferenceField}:`, error);
        return [];
    }
    return data || [];
};

// Helper para obtener el Requester (ahora incluye preferencias)
const getRequesterProfile = async (requesterId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', requesterId)
        .single();
    if (error) {
        console.error("Error fetching Requester profile for notification:", error);
        return null;
    }
    return data;
};


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

  // --- NOTIFICATION: New Request (To Admins/Account Managers) ---
  try {
    // Obtener Admins y Account Managers que quieren notificaciones de nuevas solicitudes
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
  // -----------------------------------------------------------------

  // El RPC devuelve un objeto JSONB que ya incluye los ítems
  return newRequest as SupabaseRequest;
};

// Helper para obtener las preferencias de estado de un usuario
const getUserStatusPreferences = async (userId: string): Promise<RequestStatus[]> => {
    const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('notified_statuses')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user status preferences:", error);
        return [];
    }
    
    // Si no hay preferencias, devolvemos un array vacío (o el valor por defecto de la tabla si existe)
    return data?.notified_statuses || [];
};


export const apiUpdateRequestStatus = async (
  id: string,
  status: RequestStatus,
  quoteUrl: string | null = null,
  poNumber: string | null = null
): Promise<SupabaseRequest> => {
  
  // 1. Fetch current request state before update
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

  // 2. Perform the status update
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

  // 3. --- NOTIFICATION: Status Change ---
  if (oldStatus !== status) {
    try {
      // Obtener todos los perfiles para filtrar por preferencia
      const allProfiles = await apiGetProfiles();
      
      // Determinar destinatarios y mensaje
      let targetUserIds: string[] = [];
      let title: string;
      let body: string;
      
      const link = `/requests/${id}`;

      // --- Lógica de Notificación para el Solicitante ---
      const requesterProfile = allProfiles.find(p => p.id === requesterId);
      if (requesterProfile?.notify_on_status_change) {
          const preferredStatuses = await getUserStatusPreferences(requesterId);
          if (preferredStatuses.includes(status)) {
              targetUserIds.push(requesterId);
          }
      }
      
      // --- Lógica de Notificación para el Gerente de Cuenta ---
      if (accountManagerId) {
          const managerProfile = allProfiles.find(p => p.id === accountManagerId);
          if (managerProfile?.notify_on_status_change) {
              const preferredStatuses = await getUserStatusPreferences(accountManagerId);
              if (preferredStatuses.includes(status)) {
                  targetUserIds.push(accountManagerId);
              }
          }
      }
      
      // --- Lógica de Notificación para Admins (Nuevas Solicitudes) ---
      if (status === 'Pending') {
          // Esto no debería ocurrir en un cambio de estado, pero si ocurre, notificamos a los admins
          const adminRecipients = allProfiles.filter(p => 
              (p.role === 'Admin' || p.role === 'Account Manager') && p.notify_on_new_request
          ).map(p => p.id);
          targetUserIds.push(...adminRecipients);
      }
      
      // Definir mensajes (basados en el nuevo estado)
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
      
      // Enviar la notificación si hay destinatarios
      if (targetUserIds.length > 0) {
          // Eliminar duplicados de IDs de usuario
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
  // -------------------------------------------------

  return updatedRequest as SupabaseRequest;
};

// NUEVA FUNCIÓN: Actualización completa de los detalles de la solicitud (solo para estado Pending)
interface UpdateFullRequestData {
// ... existing UpdateFullRequestData
  vendorId: string;
  shippingAddressId: string;
  billingAddressId: string;
  accountManagerId: string | null;
  notes?: string | null;
  projectCodes?: string[] | null;
}

export const apiUpdateFullRequest = async (id: string, data: UpdateFullRequestData): Promise<SupabaseRequest> => {
// ... existing apiUpdateFullRequest
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
// ... existing apiUpdateRequestMetadata
    accountManagerId?: string | null;
    notes?: string | null;
    projectCodes?: string[] | null;
  }
): Promise<SupabaseRequest> => {
// ... existing apiUpdateRequestMetadata
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
// ... existing apiUpdateRequestFile
  id: string,
  fileType: "quote" | "po" | "slip",
  file: File | null, // Aceptar File | null
  poNumber: string | null = null
): Promise<{ filePath: string | null; poNumber: string | null }> => {
// ... existing apiUpdateRequestFile
  // Asegurarse de que la sesión esté fresca antes de invocar la función Edge
  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !session) {
    console.error("Error refreshing session before uploading file:", refreshError);
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
  
  // Corregido: Desestructurar usando 'filePath' que es lo que devuelve la función Edge
  const { filePath, poNumber: returnedPoNumber } = edgeFunctionData as { filePath: string | null; poNumber: string | null };

  // Paso adicional: Actualizar la URL del archivo y el PO Number en la tabla 'requests'
  const updateData: Partial<SupabaseRequest> = {};
  
  // Almacenamos la ruta del archivo (filePath)
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
  
  // Si no hay datos para actualizar, salimos.
  if (Object.keys(updateData).length === 0) {
      return { filePath: filePath, poNumber: returnedPoNumber };
  }

  const { error: dbUpdateError } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', id);

  if (dbUpdateError) {
    console.error(`Error updating request DB with ${fileType} URL/PO Number:`, dbUpdateError);
    throw new Error(`File uploaded/PO Number saved, but failed to update database record: ${dbUpdateError.message}`);
  }

  return { filePath: filePath, poNumber: returnedPoNumber };
};

export const apiDeleteRequest = async (id: string): Promise<void> => {
// ... existing apiDeleteRequest
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// NUEVA FUNCIÓN: Revertir la recepción de una solicitud
export const apiRevertRequestReception = async (requestId: string): Promise<void> => {
// ... existing apiRevertRequestReception
  const { error } = await supabase.rpc('revert_request_reception', { request_id_in: requestId });
  if (error) {
    console.error("Error invoking revert_request_reception RPC:", error);
    throw new Error(error.message);
  }
};


// --- API de Inventario (usando mock data por ahora) ---
export const apiGetInventory = async (): Promise<InventoryItem[]> => {
// ... existing apiGetInventory
  const { data, error } = await supabase.from('inventory').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddInventoryItem = async (data: Omit<InventoryItem, "id" | "added_at" | "last_updated">): Promise<InventoryItem> => {
// ... existing apiAddInventoryItem
  const { data: newItem, error } = await supabase.rpc('add_or_update_inventory_item', {
    product_name_in: data.product_name,
    catalog_number_in: data.catalog_number,
    brand_in: data.brand,
    quantity_in: data.quantity,
    unit_price_in: data.unit_price,
    format_in: data.format,
  }).single();
  if (error) throw new Error(error.message);
  return newItem as InventoryItem; // Cast to InventoryItem
};

export const apiUpdateInventoryItem = async (id: string, data: Partial<Omit<InventoryItem, "id" | "added_at">>): Promise<InventoryItem> => {
// ... existing apiUpdateInventoryItem
  const { data: updatedItem, error } = await supabase.from('inventory').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedItem;
};

export const apiDeleteInventoryItem = async (id: string): Promise<void> => {
// ... existing apiDeleteInventoryItem
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// --- API de Gastos (Expenditures) ---
export const apiGetExpenditures = async (): Promise<Expenditure[]> => {
  // MIGRADO A SUPABASE REAL
  const { data, error } = await supabase.from('expenditures').select('*').order('date_incurred', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddExpenditure = async (data: Omit<Expenditure, "id" | "created_at">): Promise<Expenditure> => {
  // MIGRADO A SUPABASE REAL
  const { data: newExpenditure, error } = await supabase.from('expenditures').insert(data).select().single();
  if (error) throw new Error(error.message);
  return newExpenditure;
};

export const apiUpdateExpenditure = async (id: string, data: Partial<Omit<Expenditure, "id" | "created_at">>): Promise<Expenditure> => {
  // MIGRADO A SUPABASE REAL
  const { data: updatedExpenditure, error } = await supabase.from('expenditures').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedExpenditure;
};

export const apiDeleteExpenditure = async (id: string): Promise<void> => {
  // MIGRADO A SUPABASE REAL
  const { error } = await supabase.from('expenditures').delete().eq('id', id);
  if (error) throw new Error(error.message);
};


// --- API de Envío de Correo Electrónico (REAL) ---
interface EmailData {
// ... existing EmailData
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  // La URL aquí debe ser la RUTA DE ALMACENAMIENTO (storage path) para que la función Edge pueda descargarla.
  attachments?: { name: string; url: string }[]; 
}

export const apiSendEmail = async (email: EmailData): Promise<void> => {
// ... existing apiSendEmail
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: JSON.stringify(email),
    method: 'POST',
  });

  if (error) {
    console.error("Error invoking send-email edge function:", error);
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
// ... existing apiGetEmailTemplates
  const { data, error } = await supabase.from('email_templates').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export const apiAddEmailTemplate = async (data: Omit<EmailTemplate, "id" | "created_at">): Promise<EmailTemplate> => {
// ... existing apiAddEmailTemplate
  const { data: newTemplate, error } = await supabase.from('email_templates').insert(data).select().single();
  if (error) throw new Error(error.message);
  return newTemplate;
};

export const apiUpdateEmailTemplate = async (id: string, data: Partial<Omit<EmailTemplate, "id" | "created_at">>): Promise<EmailTemplate> => {
// ... existing apiUpdateEmailTemplate
  const { data: updatedTemplate, error } = await supabase.from('email_templates').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updatedTemplate;
};

export const apiDeleteEmailTemplate = async (id: string): Promise<void> => {
// ... existing apiDeleteEmailTemplate
  const { error } = await supabase.from('email_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
};