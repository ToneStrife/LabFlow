/**
 * Plantillas canónicas estilo Niceto. Se usan como fallback si la fila en
 * email_templates aún tiene el texto antiguo (migración no aplicada en remoto).
 */

export const NICETO_QUOTE_REQUEST_SUBJECT =
  "Solicitud de presupuesto — {{vendor.name}} ({{request.id}})";

export const NICETO_QUOTE_REQUEST_BODY =
  "Estimados señores de {{vendor.name}},\n\n" +
  "Rogamos nos envíen presupuesto de los siguientes artículos:\n\n" +
  "{{items_table}}\n" +
  "{{billing_box}}\n" +
  "{{shipping_box}}\n" +
  "Atentamente,\n\n" +
  "{{actor.full_name}}";

export const NICETO_PO_REQUEST_SUBJECT =
  "CÓMPRAME {{request.project_codes}} — {{request.id}}";

export const NICETO_PO_REQUEST_BODY =
  "Hola, {{account_manager.first_name}},\n\n" +
  "Te remito información para la tramitación del CÓMPRAME correspondiente:\n\n" +
  "{{project_box}}\n" +
  "{{items_table}}\n" +
  "{{warning_box}}\n" +
  "Saludos,\n\n" +
  "{{actor.full_name}}";

/** Texto genérico previo al modelo Niceto (aún puede estar en BD remota). */
const OLD_QUOTE_BODY_MARKERS = [
  "Nos gustaría solicitar un presupuesto",
  "proporcione sus mejores precios",
  "mejores precios y plazos de entrega",
];

/**
 * Un cuerpo está al día si trae los bloques con diseño. Los textos anteriores
 * (el genérico y el Niceto en texto corrido) se sustituyen por el canónico.
 */
const looksLikeOldQuoteBody = (body: string): boolean =>
  OLD_QUOTE_BODY_MARKERS.some((marker) => body.includes(marker)) ||
  !body.includes("{{items_table}}") ||
  !body.includes("{{billing_box}}");

const looksLikeOldPoBody = (body: string): boolean =>
  !body.includes("{{items_table}}") ||
  !body.includes("{{project_box}}") ||
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
