import { SupabaseRequest, Vendor, Profile, AccountManager, Project, SupabaseRequestItem, Address } from "@/data/types";
import { getFullName } from "@/hooks/use-profiles";
import { resolveTemplateForSend } from "@/utils/email-template-defaults";
import {
  buildItemsTableHtml,
  buildBillingBoxHtml,
  buildShippingBoxHtml,
  buildProjectBoxHtml,
  buildWarningBoxHtml,
  buildBillingBoxPlainText,
  buildShippingBoxPlainText,
  buildProjectBoxPlainText,
  buildWarningBoxPlainText,
  type VarianteTabla,
} from "@/utils/email-blocks";

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

/** Los mismos valores que alimentan los marcadores sueltos de proyecto. */
const datosProyecto = (context: EmailTemplateContext) => {
  const { request, projects, profiles, requesterProfile } = context;
  return {
    investigador: formatInvestigador(request, projects, profiles, requesterProfile),
    proyecto: formatProjectCodes(request.project_codes, projects),
    entidad: formatProjectField(request.project_codes, projects, "entidad"),
    cif: formatProjectField(request.project_codes, projects, "entidad_cif"),
  };
};

/** Escapa texto para insertarlo en HTML del cuerpo del correo. */
const escapeHtml = (value: string | number | null | undefined): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Lista de artículos en párrafos (fallback cuando no hay {{items_table}}). */
const formatItemsListHtml = (items: SupabaseRequestItem[] | null): string => {
  if (!items || items.length === 0) {
    return "<p>No hay artículos.</p>";
  }
  const header =
    "<p><strong>PRODUCTO</strong> &nbsp;|&nbsp; <strong>REF</strong> &nbsp;|&nbsp; <strong>CANT</strong></p>";
  const rows = items
    .map((item) => {
      const name = escapeHtml(item.product_name);
      const ref = escapeHtml(item.catalog_number);
      const qty = escapeHtml(item.quantity);
      return `<p>${name} &nbsp;|&nbsp; ${ref} &nbsp;|&nbsp; ${qty}</p>`;
    })
    .join("");
  return `${header}${rows}`;
};

const formatItemsListPlainText = (items: SupabaseRequestItem[] | null): string => {
  if (!items || items.length === 0) {
    return "No hay artículos.";
  }
  const pad = (text: string, width: number) =>
    text.length >= width ? `${text} ` : text.padEnd(width, " ");
  const nameWidth = Math.min(
    48,
    Math.max(8, ...items.map((i) => i.product_name.length), "PRODUCTO".length)
  );
  const refWidth = Math.min(
    16,
    Math.max(3, ...items.map((i) => String(i.catalog_number).length), "REF".length)
  );
  const header = `${pad("PRODUCTO", nameWidth)}${pad("REF", refWidth)}CANT`;
  const rows = items.map(
    (item) =>
      `${pad(item.product_name, nameWidth)}${pad(String(item.catalog_number), refWidth)}${item.quantity}`
  );
  return [header, ...rows].join("\n");
};

const formatAddressHtml = (address: Address | undefined): string => {
  if (!address) return "N/A";
  // Solo nombre, líneas y CP: sin ciudad ni provincia.
  return `
    <p style="margin: 0;"><strong>${address.name}</strong></p>
    <p style="margin: 0;">${address.address_line_1}</p>
    ${address.address_line_2 ? `<p style="margin: 0;">${address.address_line_2}</p>` : ""}
    ${address.zip_code ? `<p style="margin: 0;">${address.zip_code}</p>` : ""}
  `;
};

const formatAddressPlainText = (address: Address | undefined): string => {
  if (!address) return "N/A";
  const lines = [
    address.name,
    address.address_line_1,
    address.address_line_2,
    address.zip_code,
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
  processedString = replacePlaceholder(
    processedString,
    "account_manager.first_name",
    accountManager?.first_name
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
  const proyecto = datosProyecto(context);

  processedString = processedString.replace(/{{shipping_address}}/g, formatAddressPlainText(shippingAddress));
  processedString = processedString.replace(/{{billing_address}}/g, formatAddressPlainText(billingAddress));
  processedString = processedString.replace(/{{items_list}}/g, formatItemsListPlainText(request.items));
  // Bloques con diseño: en texto plano caen a su equivalente sin HTML, para que
  // ningún marcador se cuele literal en los clientes que solo leen texto.
  processedString = processedString.replace(/{{items_table}}/g, formatItemsListPlainText(request.items));
  processedString = processedString.replace(/{{billing_box}}/g, buildBillingBoxPlainText(proyecto));
  processedString = processedString.replace(
    /{{shipping_box}}/g,
    buildShippingBoxPlainText(formatAddressPlainText(shippingAddress))
  );
  processedString = processedString.replace(/{{project_box}}/g, buildProjectBoxPlainText(proyecto));
  processedString = processedString.replace(/{{warning_box}}/g, buildWarningBoxPlainText());
  processedString = processedString.replace(/{{cta_button}}/g, "[Call to Action Link]");

  return processedString
    .replace(/<[^>]*>?/gm, "")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
};

// Función principal para procesar plantillas de correo electrónico (cuerpo HTML)
export const processEmailTemplate = (
  templateString: string,
  context: EmailTemplateContext,
  variante: VarianteTabla = "claro"
): string => {
  let processedString = applySharedPlaceholders(templateString, context);
  const { request, shippingAddress, billingAddress } = context;
  const proyecto = datosProyecto(context);

  processedString = processedString.replace(/{{shipping_address}}/g, formatAddressHtml(shippingAddress));
  processedString = processedString.replace(/{{billing_address}}/g, formatAddressHtml(billingAddress));
  processedString = processedString.replace(/{{items_list}}/g, formatItemsListHtml(request.items));
  // Bloques con diseño (email-blocks.ts). Marcador intermedio para que la
  // conversión de saltos de línea no los toque ni añada huecos alrededor.
  const bloques: string[] = [];
  const reservar = (html: string): string => {
    bloques.push(html);
    return `@@BLOQUE_${bloques.length - 1}@@`;
  };
  processedString = processedString.replace(/{{items_table}}/g, () =>
    reservar(buildItemsTableHtml(request.items, variante))
  );
  processedString = processedString.replace(/{{billing_box}}/g, () =>
    reservar(buildBillingBoxHtml(proyecto))
  );
  processedString = processedString.replace(/{{shipping_box}}/g, () =>
    reservar(buildShippingBoxHtml(formatAddressPlainText(shippingAddress)))
  );
  processedString = processedString.replace(/{{project_box}}/g, () =>
    reservar(buildProjectBoxHtml(proyecto))
  );
  processedString = processedString.replace(/{{warning_box}}/g, () =>
    reservar(buildWarningBoxHtml())
  );
  processedString = processedString.replace(/{{cta_button}}/g, "[Call to Action Button]");

  // Los saltos de línea pegados a un bloque sobran: el propio bloque ya lleva margen.
  processedString = processedString.replace(/\n*(@@BLOQUE_\d+@@)\n*/g, "$1");

  // After all replacements, convert remaining newlines to <br> and wrap in a basic HTML structure
  const processedHtml = processedString
    .replace(/\n/g, "<br />")
    .replace(/@@BLOQUE_(\d+)@@/g, (_coincidencia, indice) => bloques[Number(indice)]);

  // Sin pie tipo "automated message": ese texto dispara filtros de spam.
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.55; color: #1a1a1a;">
      ${processedHtml}
    </div>
  `;
};

/**
 * Asunto + cuerpo HTML listos para el diálogo. Si la plantilla en BD es la
 * antigua (pre-Niceto), usa el texto canónico del frontend.
 */
export const processNamedEmailTemplate = (
  templateName: string,
  subjectTemplate: string,
  bodyTemplate: string,
  context: EmailTemplateContext
): { subject: string; body: string } => {
  const resolved = resolveTemplateForSend(templateName, subjectTemplate, bodyTemplate);
  // El CÓMPRAME es interno y lleva la tabla con cabecera oscura; el presupuesto
  // sale hacia el proveedor y usa la clara.
  const variante: VarianteTabla = templateName === "PO Request" ? "oscuro" : "claro";
  return {
    subject: processTextTemplate(resolved.subject, context),
    body: processEmailTemplate(resolved.body, context, variante),
  };
};
