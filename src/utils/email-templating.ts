import { SupabaseRequest, Vendor, Profile, AccountManager, Project, SupabaseRequestItem, Address } from "@/data/types";
import { getFullName } from "@/hooks/use-profiles";

interface EmailTemplateContext {
  request: SupabaseRequest;
  vendor?: Vendor;
  requesterProfile?: Profile;
  accountManager?: AccountManager;
  projects?: Project[];
  /** Perfiles para resolver el IP (investigador) de los proyectos vinculados */
  profiles?: Profile[];
  actorProfile?: Profile; // The user performing the action
  shippingAddress?: Address;
  billingAddress?: Address;
  message?: string; // Generic message
  order?: { itemName: string; id: string }; // For specific order items
}

const linkedProjects = (
  projectCodes: string[] | null | undefined,
  projects: Project[] | undefined
): Project[] => {
  if (!projectCodes?.length || !projects?.length) return [];
  return projectCodes
    .map((projectId) => projects.find((p) => p.id === projectId))
    .filter((p): p is Project => Boolean(p));
};

const formatProjectCodes = (
  projectCodes: string[] | null | undefined,
  projects: Project[] | undefined
): string => {
  if (!projectCodes?.length) return "";
  return projectCodes
    .map((projectId) => {
      const project = projects?.find((p) => p.id === projectId);
      return project ? project.code : projectId;
    })
    .join(", ");
};

/** Investigador: IP de los proyectos vinculados; si no hay, el solicitante. */
const formatInvestigador = (
  request: SupabaseRequest,
  projects: Project[] | undefined,
  profiles: Profile[] | undefined,
  requesterProfile: Profile | undefined
): string => {
  const ips = linkedProjects(request.project_codes, projects)
    .map((project) => {
      if (!project.ip_profile_id) return null;
      const ipProfile = profiles?.find((p) => p.id === project.ip_profile_id);
      const name = getFullName(ipProfile);
      return name !== "N/A" ? name : null;
    })
    .filter((name): name is string => Boolean(name));

  const unique = [...new Set(ips)];
  if (unique.length > 0) return unique.join(", ");

  const requesterName = getFullName(requesterProfile);
  return requesterName !== "N/A" ? requesterName : "";
};

const formatProjectField = (
  projectCodes: string[] | null | undefined,
  projects: Project[] | undefined,
  field: "entidad" | "entidad_cif"
): string => {
  const values = linkedProjects(projectCodes, projects)
    .map((p) => p[field]?.trim())
    .filter((v): v is string => Boolean(v));
  return [...new Set(values)].join(", ");
};

const formatItemsListHtml = (items: SupabaseRequestItem[] | null): string => {
  if (!items || items.length === 0) {
    return "<p>No hay artículos.</p>";
  }
  const rows = items
    .map(
      (item) =>
        `<tr><td style="padding:4px 12px 4px 0;border-bottom:1px solid #ddd;">${item.product_name}</td>` +
        `<td style="padding:4px 12px;border-bottom:1px solid #ddd;">${item.catalog_number}</td>` +
        `<td style="padding:4px 0;border-bottom:1px solid #ddd;text-align:right;">${item.quantity}</td></tr>`
    )
    .join("");
  return (
    `<table style="border-collapse:collapse;width:100%;max-width:560px;">` +
    `<thead><tr>` +
    `<th style="text-align:left;padding:4px 12px 4px 0;border-bottom:2px solid #333;">PRODUCTO</th>` +
    `<th style="text-align:left;padding:4px 12px;border-bottom:2px solid #333;">REFERENCIA</th>` +
    `<th style="text-align:right;padding:4px 0;border-bottom:2px solid #333;">CANT.</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`
  );
};

const formatItemsListPlainText = (items: SupabaseRequestItem[] | null): string => {
  if (!items || items.length === 0) {
    return "No hay artículos.";
  }
  const header = "PRODUCTO\tREFERENCIA\tCANT.";
  const rows = items.map(
    (item) => `${item.product_name}\t${item.catalog_number}\t${item.quantity}`
  );
  return [header, ...rows].join("\n");
};

const formatAddressHtml = (address: Address | undefined): string => {
  if (!address) return "N/A";
  const locality = [address.zip_code, address.city].filter(Boolean).join(" ");
  return `
    <p style="margin: 0;"><strong>${address.name}</strong></p>
    <p style="margin: 0;">${address.address_line_1}</p>
    ${address.address_line_2 ? `<p style="margin: 0;">${address.address_line_2}</p>` : ""}
    ${locality ? `<p style="margin: 0;">${locality}</p>` : ""}
    ${address.state ? `<p style="margin: 0;">${address.state}</p>` : ""}
    ${address.country ? `<p style="margin: 0;">${address.country}</p>` : ""}
  `;
};

const formatAddressPlainText = (address: Address | undefined): string => {
  if (!address) return "N/A";
  const locality = [address.zip_code, address.city].filter(Boolean).join(" ");
  const lines = [
    address.name,
    address.address_line_1,
    address.address_line_2,
    locality,
    address.state,
    address.country,
  ].filter((line) => line && line.trim() !== "");
  return lines.join("\n");
};

const replacePlaceholder = (template: string, placeholder: string, value: string | number | null | undefined): string => {
  // Regex para encontrar {{placeholder | "valor por defecto"}} o {{placeholder}}
  const regex = new RegExp(`{{${placeholder}(?:\\s*\\|\\s*"(.*?)")?}}`, "g");
  return template.replace(regex, (_match, defaultValue) => {
    // Si el valor es null, undefined o una cadena vacía, usa el valor por defecto o 'N/A'
    return value !== null && value !== undefined && String(value).trim() !== ""
      ? String(value)
      : defaultValue || "N/A";
  });
};

/** Placeholders comunes a asunto, texto plano y HTML. */
const applySharedPlaceholders = (templateString: string, context: EmailTemplateContext): string => {
  let processedString = templateString;
  const {
    request,
    vendor,
    requesterProfile,
    accountManager,
    projects,
    profiles,
    actorProfile,
    message,
    order,
  } = context;

  processedString = replacePlaceholder(processedString, "request.id", request.request_number || request.id.substring(0, 8));
  processedString = replacePlaceholder(processedString, "request.status", request.status);
  processedString = replacePlaceholder(processedString, "request.notes", request.notes);
  processedString = replacePlaceholder(processedString, "request.quote_url", request.quote_url);
  processedString = replacePlaceholder(processedString, "request.po_number", request.po_number);
  processedString = replacePlaceholder(processedString, "request.po_url", request.po_url);
  processedString = replacePlaceholder(processedString, "request.slip_url", request.slip_url);

  processedString = replacePlaceholder(processedString, "requester.full_name", getFullName(requesterProfile));
  processedString = replacePlaceholder(processedString, "requester.email", requesterProfile?.email);

  processedString = replacePlaceholder(processedString, "vendor.name", vendor?.name);
  processedString = replacePlaceholder(processedString, "vendor.contact_person", vendor?.contact_person);
  processedString = replacePlaceholder(processedString, "vendor.email", vendor?.email);

  processedString = replacePlaceholder(
    processedString,
    "account_manager.full_name",
    accountManager ? `${accountManager.first_name} ${accountManager.last_name}` : null
  );
  processedString = replacePlaceholder(processedString, "account_manager.email", accountManager?.email);

  processedString = replacePlaceholder(
    processedString,
    "request.project_codes",
    formatProjectCodes(request.project_codes, projects)
  );
  processedString = replacePlaceholder(
    processedString,
    "project.investigador",
    formatInvestigador(request, projects, profiles, requesterProfile)
  );
  processedString = replacePlaceholder(
    processedString,
    "project.entidad",
    formatProjectField(request.project_codes, projects, "entidad")
  );
  processedString = replacePlaceholder(
    processedString,
    "project.entidad_cif",
    formatProjectField(request.project_codes, projects, "entidad_cif")
  );

  processedString = replacePlaceholder(processedString, "message", message);
  processedString = replacePlaceholder(processedString, "actor.full_name", getFullName(actorProfile));
  processedString = replacePlaceholder(processedString, "order.itemName", order?.itemName);
  processedString = replacePlaceholder(processedString, "order.id", order?.id);

  return processedString;
};

// Función auxiliar para procesar plantillas de texto plano (como el asunto)
export const processTextTemplate = (templateString: string, context: EmailTemplateContext): string => {
  const processedString = applySharedPlaceholders(templateString, context);
  // Limpiar cualquier salto de línea o etiqueta HTML residual que pueda haber quedado
  return processedString.replace(/<[^>]*>?/gm, "").trim();
};

// Función auxiliar para procesar plantillas de texto plano (cuerpo)
export const processPlainTextTemplate = (templateString: string, context: EmailTemplateContext): string => {
  let processedString = applySharedPlaceholders(templateString, context);
  const { request, shippingAddress, billingAddress } = context;

  processedString = processedString.replace(/{{shipping_address}}/g, formatAddressPlainText(shippingAddress));
  processedString = processedString.replace(/{{billing_address}}/g, formatAddressPlainText(billingAddress));
  processedString = processedString.replace(/{{items_list}}/g, formatItemsListPlainText(request.items));
  processedString = processedString.replace(/{{cta_button}}/g, "[Call to Action Link]");

  return processedString
    .replace(/<[^>]*>?/gm, "")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
};

// Función principal para procesar plantillas de correo electrónico (cuerpo HTML)
export const processEmailTemplate = (templateString: string, context: EmailTemplateContext): string => {
  let processedString = applySharedPlaceholders(templateString, context);
  const { request, shippingAddress, billingAddress } = context;

  processedString = processedString.replace(/{{shipping_address}}/g, formatAddressHtml(shippingAddress));
  processedString = processedString.replace(/{{billing_address}}/g, formatAddressHtml(billingAddress));
  processedString = processedString.replace(/{{items_list}}/g, formatItemsListHtml(request.items));
  processedString = processedString.replace(/{{cta_button}}/g, "[Call to Action Button]");

  // After all replacements, convert remaining newlines to <br> and wrap in a basic HTML structure
  const processedHtml = processedString.replace(/\n/g, "<br />");

  return `
    <div style="font-family: sans-serif; line-height: 1.6;">
      ${processedHtml}
      <br /><br />
      <p style="font-size: 0.8em; color: #888;">This is an automated message from the LabFlow system.</p>
    </div>
  `;
};
