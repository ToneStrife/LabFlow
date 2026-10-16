/**
 * Plantillas canónicas estilo Niceto. Se usan como fallback si la fila en
 * email_templates aún tiene el texto antiguo (migración no aplicada en remoto).
 */

export const NICETO_QUOTE_REQUEST_SUBJECT =
  "Solicitud de presupuesto — {{vendor.name}} ({{request.id}})";

export const NICETO_QUOTE_REQUEST_BODY =
  "Estimados señores de {{vendor.name}},\n\n" +
  "Rogamos nos envíen presupuesto de los siguientes artículos:\n\n" +
  "{{items_list}}\n\n" +
  "DATOS DE FACTURACIÓN:\n\n" +
  "Investigador: {{project.investigador}}\n" +
  "Proyecto/Ref: {{request.project_codes}}\n" +
  "Entidad: {{project.entidad}}\n" +
  "CIF: {{project.entidad_cif}}\n\n" +
  "DIRECCIÓN DE ENVÍO:\n\n" +
  "{{shipping_address}}\n\n" +
  "Atentamente,\n\n" +
  "{{actor.full_name}}";

export const NICETO_PO_REQUEST_SUBJECT =
  "CÓMPRAME {{request.project_codes}} — {{request.id}}";

export const NICETO_PO_REQUEST_BODY =
  "Hola, {{account_manager.first_name}},\n\n" +
  "Te remito información para la tramitación del CÓMPRAME correspondiente:\n\n" +
  "Investigador: {{project.investigador}}\n" +
  "Proyecto: {{request.project_codes}}\n" +
  "Entidad: {{project.entidad}}\n" +
  "{{items_list}}\n" +
  "⚠️ NOTA IMPORTANTE: No se debe enviar correo a la empresa proveedora, para evitar pedidos duplicados.\n" +
  "Saludos,\n" +
  "{{actor.full_name}}";

/** Texto genérico previo al modelo Niceto (aún puede estar en BD remota). */
const OLD_QUOTE_BODY_MARKERS = [
  "Nos gustaría solicitar un presupuesto",
  "proporcione sus mejores precios",
  "mejores precios y plazos de entrega",
];

const looksLikeOldQuoteBody = (body: string): boolean =>
  OLD_QUOTE_BODY_MARKERS.some((marker) => body.includes(marker)) ||
  !body.includes("{{project.investigador}}") ||
  !body.includes("DATOS DE FACTURACIÓN");

const looksLikeOldPoBody = (body: string): boolean =>
  !body.includes("{{project.investigador}}") ||
  !body.includes("CÓMPRAME correspondiente");

/**
 * Devuelve asunto/cuerpo a usar al redactar. Si la BD sigue con la plantilla
 * antigua, sustituye por el modelo Niceto sin esperar a re-ejecutar SQL.
 */
export function resolveTemplateForSend(
  templateName: string,
  subject: string,
  body: string
): { subject: string; body: string; usedFallback: boolean } {
  if (templateName === "Quote Request" && looksLikeOldQuoteBody(body)) {
    return {
      subject: NICETO_QUOTE_REQUEST_SUBJECT,
      body: NICETO_QUOTE_REQUEST_BODY,
      usedFallback: true,
    };
  }
  if (templateName === "PO Request" && looksLikeOldPoBody(body)) {
    return {
      subject: NICETO_PO_REQUEST_SUBJECT,
      body: NICETO_PO_REQUEST_BODY,
      usedFallback: true,
    };
  }
  return { subject, body, usedFallback: false };
}
