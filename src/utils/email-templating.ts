import { SupabaseRequest, Vendor, Profile, AccountManager, Project, SupabaseRequestItem, Address } from "@/data/types";
import { getFullName } from "@/hooks/use-profiles";

interface EmailTemplateContext {
  request: SupabaseRequest;
  vendor?: Vendor;
  requesterProfile?: Profile;
  accountManager?: AccountManager;
  projects?: Project[];
  actorProfile?: Profile; // The user performing the action
  shippingAddress?: Address; // Nuevo
  billingAddress?: Address; // Nuevo
  message?: string; // Generic message
  order?: { itemName: string; id: string }; // For specific order items
}

const formatItemsList = (items: SupabaseRequestItem[] | null): string => {
  if (!items || items.length === 0) {
    return "<p>No items listed.</p>";
  }
  const listItems = items.map(item => `<li>${item.quantity}x <strong>${item.product_name}</strong> (Catalog #: ${item.catalog_number})</li>`).join("");
  return `<ul>${listItems}</ul>`;
};

const formatAddressHtml = (address: Address | undefined): string => {
  if (!address) return "N/A";
  return `
    <p style="margin: 0;"><strong>${address.name}</strong></p>
    <p style="margin: 0;">${address.address_line_1}</p>
    ${address.address_line_2 ? `<p style="margin: 0;">${address.address_line_2}</p>` : ''}
    <p style="margin: 0;">${address.city}, ${address.state} ${address.zip_code}</p>
    <p style="margin: 0;">${address.country}</p>
  `;
};

const replacePlaceholder = (template: string, placeholder: string, value: string | number | null | undefined): string => {
  // Regex para encontrar {{placeholder | "valor por defecto"}} o {{placeholder}}
  const regex = new RegExp(`{{${placeholder}(?:\\s*\\|\\s*"(.*?)")?}}`, 'g');
  return template.replace(regex, (match, defaultValue) => {
    // Si el valor es null, undefined o una cadena vacía, usa el valor por defecto o 'N/A'
    return value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : (defaultValue || 'N/A');
  });
};

// Función auxiliar para procesar plantillas de texto plano (como el asunto)
export const processTextTemplate = (templateString: string, context: EmailTemplateContext): string => {
  let processedString = templateString;
  const { request, vendor, requesterProfile, accountManager, projects, actorProfile, message, order } = context;

  // General request details
  processedString = replacePlaceholder(processedString, 'request.id', request.id);
  processedString = replacePlaceholder(processedString, 'request.status', request.status);
  processedString = replacePlaceholder(processedString, 'request.notes', request.notes);
  processedString = replacePlaceholder(processedString, 'request.po_number', request.po_number);

  // Requester details
  processedString = replacePlaceholder(processedString, 'requester.full_name', getFullName(requesterProfile));
  processedString = replacePlaceholder(processedString, 'requester.email', requesterProfile?.email);

  // Vendor details
  processedString = replacePlaceholder(processedString, 'vendor.name', vendor?.name);
  processedString = replacePlaceholder(processedString, 'vendor.contact_person', vendor?.contact_person);
  processedString = replacePlaceholder(processedString, 'vendor.email', vendor?.email);

  // Account Manager details
  processedString = replacePlaceholder(processedString, 'account_manager.full_name', accountManager ? `${accountManager.first_name} ${accountManager.last_name}` : null);
  processedString = replacePlaceholder(processedString, 'account_manager.email', accountManager?.email);

  // Project Codes
  const projectCodesDisplay = request.project_codes?.map(projectId => {
    const project = projects?.find(p => p.id === projectId);
    return project ? project.code : projectId;
  }).join(", ");
  processedString = replacePlaceholder(processedString, 'request.project_codes', projectCodesDisplay);

  // Special placeholders
  processedString = replacePlaceholder(processedString, 'message', message);
  processedString = replacePlaceholder(processedString, 'actor.full_name', getFullName(actorProfile));
  processedString = replacePlaceholder(processedString, 'order.itemName', order?.itemName);
  processedString = replacePlaceholder(processedString, 'order.id', order?.id);

  // Limpiar cualquier salto de línea o etiqueta HTML residual que pueda haber quedado
  return processedString.replace(/<[^>]*>?/gm, '').trim();
};


// Función principal para procesar plantillas de correo electrónico (cuerpo HTML)
export const processEmailTemplate = (templateString: string, context: EmailTemplateContext): string => {
  let processedString = templateString;
  const { request, vendor, requesterProfile, accountManager, projects, actorProfile, shippingAddress, billingAddress, message, order } = context;

  // General request details
  processedString = replacePlaceholder(processedString, 'request.id', request.id);
  processedString = replacePlaceholder(processedString, 'request.status', request.status);
  processedString = replacePlaceholder(processedString, 'request.notes', request.notes);
  processedString = replacePlaceholder(processedString, 'request.quote_url', request.quote_url);
  processedString = replacePlaceholder(processedString, 'request.po_number', request.po_number);
  processedString = replacePlaceholder(processedString, 'request.po_url', request.po_url);
  processedString = replacePlaceholder(processedString, 'request.slip_url', request.slip_url);

  // Requester details
  processedString = replacePlaceholder(processedString, 'requester.full_name', getFullName(requesterProfile));
  processedString = replacePlaceholder(processedString, 'requester.email', requesterProfile?.email);

  // Vendor details
  processedString = replacePlaceholder(processedString, 'vendor.name', vendor?.name);
  processedString = replacePlaceholder(processedString, 'vendor.contact_person', vendor?.contact_person);
  processedString = replacePlaceholder(processedString, 'vendor.email', vendor?.email);

  // Account Manager details
  processedString = replacePlaceholder(processedString, 'account_manager.full_name', accountManager ? `${accountManager.first_name} ${accountManager.last_name}` : null);
  processedString = replacePlaceholder(processedString, 'account_manager.email', accountManager?.email);

  // Project Codes
  const projectCodesDisplay = request.project_codes?.map(projectId => {
    const project = projects?.find(p => p.id === projectId);
    return project ? project.code : projectId; // Muestra el código del proyecto
  }).join(", ");
  processedString = replacePlaceholder(processedString, 'request.project_codes', projectCodesDisplay);

  // Address details (HTML formatting)
  processedString = processedString.replace(/{{shipping_address}}/g, formatAddressHtml(shippingAddress));
  processedString = processedString.replace(/{{billing_address}}/g, formatAddressHtml(billingAddress));

  // Special placeholders
  processedString = processedString.replace(/{{items_list}}/g, formatItemsList(request.items));
  processedString = replacePlaceholder(processedString, 'message', message);
  processedString = replacePlaceholder(processedString, 'actor.full_name', getFullName(actorProfile));
  processedString = replacePlaceholder(processedString, 'order.itemName', order?.itemName);
  processedString = replacePlaceholder(processedString, 'order.id', order?.id);

  // CTA Button (simple placeholder for now, actual button would be HTML)
  processedString = processedString.replace(/{{cta_button}}/g, '[Call to Action Button]');

  // After all replacements, convert remaining newlines to <br> and wrap in a basic HTML structure
  let processedHtml = processedString.replace(/\n/g, '<br />');

  // A simple HTML wrapper
  return `
    <div style="font-family: sans-serif; line-height: 1.6;">
      ${processedHtml}
      <br /><br />
      <p style="font-size: 0.8em; color: #888;">This is an automated message from the LabFlow system.</p>
    </div>
  `;
};