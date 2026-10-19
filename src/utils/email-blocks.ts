import { SupabaseRequestItem } from "@/data/types";

/**
 * Bloques visuales de los correos.
 *
 * Por qué viven aquí y no en el cuerpo de la plantilla: el editor del panel de
 * Admin es ReactQuill, que no registra blots de <table> y aplasta las tablas al
 * guardar. Si el diseño se escribe en el cuerpo, se pierde en cuanto alguien
 * abre la plantilla y pulsa guardar. Dejándolo aquí, el cuerpo editable se
 * queda en texto plano con marcadores, que Quill sí conserva, y el aspecto del
 * correo no depende de quién lo haya tocado por última vez.
 *
 * Estilos siempre en línea: Gmail y Outlook descartan <style> y las clases.
 */

export type VarianteTabla = "claro" | "oscuro";

const BORDE = "#d4d4d4";
const TIPO = "Arial, Helvetica, sans-serif";

const escapar = (valor: string | number | null | undefined): string =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Tabla de artículos. La variante oscura (cabecera negra) es la del CÓMPRAME
 * interno; la clara, la del presupuesto que ve el proveedor.
 */
export const buildItemsTableHtml = (
  items: SupabaseRequestItem[] | null | undefined,
  variante: VarianteTabla = "claro"
): string => {
  if (!items || items.length === 0) {
    return '<p style="margin:0 0 16px 0;">No hay artículos.</p>';
  }

  const fondoCabecera = variante === "oscuro" ? "#2b2b2b" : "#f2f2f2";
  const textoCabecera = variante === "oscuro" ? "#ffffff" : "#1a1a1a";

  const th = (texto: string, alineacion: "left" | "center") =>
    `<th style="padding:10px 14px;border:1px solid ${BORDE};background:${fondoCabecera};` +
    `color:${textoCabecera};font-size:13px;font-weight:bold;letter-spacing:.04em;` +
    `text-align:${alineacion};">${texto}</th>`;

  const td = (texto: string, alineacion: "left" | "center") =>
    `<td style="padding:10px 14px;border:1px solid ${BORDE};font-size:14px;` +
    `color:#1a1a1a;text-align:${alineacion};">${texto}</td>`;

  const filas = items
    .map(
      (item) =>
        "<tr>" +
        td(escapar(item.product_name), "left") +
        td(escapar(item.catalog_number), "center") +
        td(escapar(item.quantity), "center") +
        "</tr>"
    )
    .join("");

  return (
    '<table role="presentation" cellspacing="0" cellpadding="0" ' +
    `style="width:100%;border-collapse:collapse;margin:0 0 20px 0;font-family:${TIPO};">` +
    `<thead><tr>${th("PRODUCTO", "left")}${th("REFERENCIA", "center")}${th("CANT.", "center")}</tr></thead>` +
    `<tbody>${filas}</tbody>` +
    "</table>"
  );
};

const linea = (etiqueta: string, valor: string | null | undefined) =>
  `<p style="margin:0 0 6px 0;font-size:14px;color:#1a1a1a;">` +
  `<strong>${etiqueta}:</strong> ${escapar(valor && valor.trim() ? valor : "N/A")}</p>`;

/** Caja de datos de facturación del correo de presupuesto. */
export const buildBillingBoxHtml = (datos: {
  investigador?: string | null;
  proyecto?: string | null;
  entidad?: string | null;
  cif?: string | null;
}): string =>
  '<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px 0;">' +
  `<tr><td style="border:1px solid ${BORDE};padding:16px 18px;font-family:${TIPO};">` +
  '<p style="margin:0 0 12px 0;font-size:13px;font-weight:bold;letter-spacing:.04em;' +
  'color:#c0392b;">DATOS DE FACTURACIÓN:</p>' +
  '<hr style="border:0;border-top:1px solid #e8e8e8;margin:0 0 12px 0;">' +
  linea("Investigador", datos.investigador) +
  linea("Proyecto/Ref", datos.proyecto) +
  linea("Entidad", datos.entidad) +
  linea("CIF", datos.cif) +
  "</td></tr></table>";

/** Dirección de envío, con el filete azul a la izquierda. */
export const buildShippingBoxHtml = (direccion: string | null | undefined): string => {
  const lineas = String(direccion ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const cuerpo = lineas.length
    ? lineas
        .map(
          (l, i) =>
            `<p style="margin:0 0 ${i === lineas.length - 1 ? 0 : 4}px 0;` +
            `font-size:14px;color:#1a1a1a;">${escapar(l)}</p>`
        )
        .join("")
    : '<p style="margin:0;font-size:14px;color:#1a1a1a;">N/A</p>';

  return (
    `<p style="margin:0 0 10px 0;font-size:13px;font-weight:bold;letter-spacing:.04em;` +
    `color:#1a1a1a;font-family:${TIPO};">DIRECCIÓN DE ENVÍO:</p>` +
    '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0;">' +
    `<tr><td style="border-left:3px solid #9bb4cc;padding:2px 0 2px 14px;font-family:${TIPO};">` +
    cuerpo +
    "</td></tr></table>"
  );
};

/** Caja de investigador, proyecto y entidad del CÓMPRAME. */
export const buildProjectBoxHtml = (datos: {
  investigador?: string | null;
  proyecto?: string | null;
  entidad?: string | null;
}): string =>
  '<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px 0;">' +
  '<tr><td style="border-left:4px solid #2f5f98;background:#f1f5fa;padding:16px 18px;' +
  `font-family:${TIPO};">` +
  linea("Investigador", datos.investigador) +
  linea("Proyecto", datos.proyecto) +
  linea("Entidad", datos.entidad) +
  "</td></tr></table>";

/** Aviso de no escribir al proveedor. */
export const buildWarningBoxHtml = (): string =>
  '<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px 0;">' +
  '<tr><td style="background:#fdf6e3;border:1px solid #f0e2b6;padding:14px 18px;' +
  `font-family:${TIPO};font-size:14px;color:#7a5c00;">` +
  "<strong>⚠️ NOTA IMPORTANTE:</strong> No se debe enviar correo a la empresa proveedora, " +
  "para evitar pedidos duplicados." +
  "</td></tr></table>";

// --- Equivalentes en texto plano -------------------------------------------
// El envío genera una versión sin HTML; si no sustituimos aquí, los marcadores
// saldrían literales en los clientes que leen solo texto.

export const buildBillingBoxPlainText = (datos: {
  investigador?: string | null;
  proyecto?: string | null;
  entidad?: string | null;
  cif?: string | null;
}): string =>
  [
    "DATOS DE FACTURACIÓN:",
    "",
    `Investigador: ${datos.investigador?.trim() || "N/A"}`,
    `Proyecto/Ref: ${datos.proyecto?.trim() || "N/A"}`,
    `Entidad: ${datos.entidad?.trim() || "N/A"}`,
    `CIF: ${datos.cif?.trim() || "N/A"}`,
  ].join("\n");

export const buildShippingBoxPlainText = (direccion: string | null | undefined): string =>
  ["DIRECCIÓN DE ENVÍO:", "", String(direccion ?? "").trim() || "N/A"].join("\n");

export const buildProjectBoxPlainText = (datos: {
  investigador?: string | null;
  proyecto?: string | null;
  entidad?: string | null;
}): string =>
  [
    `Investigador: ${datos.investigador?.trim() || "N/A"}`,
    `Proyecto: ${datos.proyecto?.trim() || "N/A"}`,
    `Entidad: ${datos.entidad?.trim() || "N/A"}`,
  ].join("\n");

export const buildWarningBoxPlainText = (): string =>
  "NOTA IMPORTANTE: No se debe enviar correo a la empresa proveedora, para evitar pedidos duplicados.";
